import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import useListsStore from '../../stores/listsStore';
import { categoriesApi, checklistItemsApi, listsApi } from '../../utils/api';

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none' };
const labelStyle = { display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' };

const Section = ({ title, children, isLast = false }) => (
  <div className={!isLast ? 'mb-5' : ''}>
    <div className="v2-card" style={{ padding: 0 }}>
      <div style={{ padding: '10px 18px 6px' }}><span className="v2-section-label">{title}</span></div>
      <div style={{ padding: '0 18px 16px' }}>{children}</div>
    </div>
  </div>
);

const ListFormModal = () => {
  const queryClient = useQueryClient();
  const { formModal, closeFormModal } = useListsStore();
  const { isOpen, mode, itemId, categoryId: defaultCategoryId } = formModal;

  const [formData, setFormData] = useState({ name: '', category_id: '', pinned: false });
  const [checklistItems, setChecklistItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [itemsToDelete, setItemsToDelete] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const saveTimeoutRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.fetchAll });

  const { data: existingList } = useQuery({
    queryKey: ['list', itemId],
    queryFn: () => listsApi.fetchOne(itemId),
    enabled: isOpen && mode === 'edit' && !!itemId,
  });

  useEffect(() => {
    if (mode === 'edit' && existingList) {
      setFormData({ name: existingList.name || '', category_id: existingList.category_id || '', pinned: existingList.pinned || false });
      setChecklistItems((existingList.checklist_items || []).map(item => ({ ...item, isExisting: true })));
      setItemsToDelete([]);
    }
  }, [mode, existingList, itemId]);

  useEffect(() => {
    if (isOpen && mode === 'new') { setFormData({ name: '', category_id: defaultCategoryId || '', pinned: false }); setChecklistItems([]); setNewItemName(''); setItemsToDelete([]); setSaveStatus(null); }
  }, [isOpen, mode, defaultCategoryId]);

  useEffect(() => { return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); }; }, []);

  const showSavedStatus = useCallback(() => { setSaveStatus('saved'); if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); saveTimeoutRef.current = setTimeout(() => setSaveStatus(null), 2000); }, []);

  const createMutation = useMutation({
    mutationFn: async ({ name, categoryId, items }) => {
      const listData = { name };
      if (categoryId) listData.category_id = categoryId;
      const r = await listsApi.create(listData);
      const listId = r.list.id;
      for (let i = 0; i < items.length; i++) {
        await checklistItemsApi.createForList(listId, { name: items[i], position: i });
      }
      return r;
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['lists'] }); closeFormModal(); },
    onError: (error) => { console.error('List create failed:', error); },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => { await listsApi.update(itemId, { name: data.name, category_id: data.category_id || null }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lists'] }); queryClient.invalidateQueries({ queryKey: ['list', itemId] }); showSavedStatus(); },
    onError: () => setSaveStatus('error'),
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ name, position }) => checklistItemsApi.createForList(itemId, { name, position }),
    onSuccess: (response, variables) => {
      setChecklistItems(prev => prev.map(item => item.id === variables.tempId ? { ...response.checklist_item, isExisting: true } : item));
      queryClient.invalidateQueries({ queryKey: ['lists'] }); queryClient.invalidateQueries({ queryKey: ['list', itemId] }); showSavedStatus();
    },
    onError: (_, variables) => { setChecklistItems(prev => prev.filter(item => item.id !== variables.tempId)); setSaveStatus('error'); },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (delItemId) => checklistItemsApi.deleteForList(itemId, delItemId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lists'] }); queryClient.invalidateQueries({ queryKey: ['list', itemId] }); showSavedStatus(); },
    onError: () => setSaveStatus('error'),
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds) => checklistItemsApi.reorderForList(itemId, orderedIds),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lists'] }); queryClient.invalidateQueries({ queryKey: ['list', itemId] }); showSavedStatus(); },
    onError: () => setSaveStatus('error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => listsApi.delete(itemId),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['lists'] }); await queryClient.invalidateQueries({ queryKey: ['habits'] }); closeFormModal(); },
  });

  const autoSaveList = useCallback((newFormData) => {
    if (mode !== 'edit') return;
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    if (!newFormData.name.trim()) return;
    setSaveStatus('saving');
    debounceTimeoutRef.current = setTimeout(() => updateMutation.mutate(newFormData), 500);
  }, [mode, updateMutation]);

  const handleNameChange = (e) => { const d = { ...formData, name: e.target.value }; setFormData(d); if (mode === 'edit') autoSaveList(d); };
  const handleCategoryChange = (catId) => { const d = { ...formData, category_id: catId }; setFormData(d); if (mode === 'edit' && formData.name.trim()) { setSaveStatus('saving'); updateMutation.mutate(d); } };
  const handlePinToggle = () => { const d = { ...formData, pinned: !formData.pinned }; setFormData(d); if (mode === 'edit' && formData.name.trim()) { setSaveStatus('saving'); updateMutation.mutate(d); } };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    if (mode === 'edit') {
      const tempId = `temp-${Date.now()}`;
      setChecklistItems([...checklistItems, { id: tempId, name: newItemName.trim(), isExisting: false, completed: false }]);
      setSaveStatus('saving');
      addItemMutation.mutate({ name: newItemName.trim(), position: checklistItems.length, tempId });
    } else {
      setChecklistItems([...checklistItems, { id: `new-${Date.now()}`, name: newItemName.trim(), isExisting: false, completed: false }]);
    }
    setNewItemName('');
  };

  const handleRemoveItem = (item) => {
    setChecklistItems(checklistItems.filter(i => i.id !== item.id));
    if (mode === 'edit' && item.isExisting) { setSaveStatus('saving'); deleteItemMutation.mutate(item.id); }
    else if (mode === 'new' && item.isExisting) setItemsToDelete([...itemsToDelete, item.id]);
  };

  const handleDragStart = (e, index) => { setDraggedIndex(index); e.dataTransfer.effectAllowed = 'move'; setTimeout(() => { e.target.style.opacity = '0.5'; }, 0); };
  const handleDragEnd = (e) => { e.target.style.opacity = '1'; setDraggedIndex(null); setDragOverIndex(null); };
  const handleDragOver = (e, index) => { e.preventDefault(); if (index !== dragOverIndex) setDragOverIndex(index); };
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) { setDraggedIndex(null); setDragOverIndex(null); return; }
    const newItems = [...checklistItems]; const [dragged] = newItems.splice(draggedIndex, 1); newItems.splice(dropIndex, 0, dragged);
    setChecklistItems(newItems); setDraggedIndex(null); setDragOverIndex(null);
    if (mode === 'edit' && newItems.every(item => item.isExisting)) { setSaveStatus('saving'); reorderMutation.mutate(newItems.map(i => i.id)); }
  };

  const handleSubmit = (e) => { e.preventDefault(); if (!formData.name.trim() || checklistItems.length === 0) return; createMutation.mutate({ ...formData, checklistItems }); };
  const handleDelete = () => { if (window.confirm('Delete this list? It will also be removed from attached habits/tasks.')) deleteMutation.mutate(); };
  const handleClose = () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); closeFormModal(); };

  const StatusIndicator = () => {
    if (mode !== 'edit' || !saveStatus) return null;
    return (
      <span className="v2-caption" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {saveStatus === 'saving' && <><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.6rem' }} /> Saving</>}
        {saveStatus === 'saved' && <><i className="fa-solid fa-check" style={{ fontSize: '0.6rem', color: 'var(--ink-tertiary)' }} /> Saved</>}
        {saveStatus === 'error' && <><i className="fa-solid fa-exclamation-circle" style={{ fontSize: '0.6rem', color: 'var(--overdue)' }} /> Error</>}
      </span>
    );
  };

  const formContent = (
    <>
      <Section title="Basics">
        <div style={{ marginBottom: 16 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <label style={labelStyle}>Name</label>
            <button type="button" onClick={handlePinToggle} className="v2-btn-sm v2-btn-ghost" style={{ padding: '2px 8px' }}>
              <i className={`fa-solid fa-thumbtack`} style={{ fontSize: '0.6rem', color: formData.pinned ? 'var(--ink)' : 'var(--ink-faint)' }} />
              <span style={{ fontSize: '0.7rem' }}>{formData.pinned ? 'Pinned' : 'Pin'}</span>
            </button>
          </div>
          <input type="text" value={formData.name} onChange={handleNameChange} required={mode === 'new'} autoFocus={mode === 'new'}
            style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: 500, padding: '10px 14px' }} placeholder="List name..." />
        </div>

        <div>
          <label style={labelStyle}>Category</label>
          <div className="v2-seg-control flex-wrap">
            <button type="button" onClick={() => handleCategoryChange('')} className={`v2-seg-btn ${formData.category_id === '' ? 'active' : ''}`}>None</button>
            {categories?.map(cat => (
              <button key={cat.id} type="button" onClick={() => handleCategoryChange(cat.id)}
                className={`v2-seg-btn ${formData.category_id === cat.id ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Items" isLast={true}>
        {checklistItems.length > 0 && (
          <div className="space-y-1" style={{ marginBottom: 12 }}>
            {checklistItems.map((item, index) => (
              <div key={item.id} draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)} onDragLeave={() => setDragOverIndex(null)} onDrop={(e) => handleDrop(e, index)}
                className="flex items-center gap-2"
                style={{
                  padding: '6px 8px', borderRadius: 6, cursor: 'grab',
                  background: draggedIndex === index ? 'var(--hover-tint-strong)' : 'var(--hover-tint)',
                  outline: dragOverIndex === index && draggedIndex !== index ? '2px solid var(--border-hover)' : 'none',
                }}>
                <i className="fa-solid fa-grip-vertical" style={{ fontSize: '0.7rem', color: 'var(--ink-faint)' }} />
                <span className="v2-caption" style={{ width: 18, textAlign: 'center', color: 'var(--ink-faint)' }}>{index + 1}</span>
                <span className={`flex-1 ${item.completed ? 'line-through' : ''}`}
                  style={{ fontFamily: 'var(--font-body)', fontSize: '0.867rem', color: 'var(--ink)', opacity: item.completed ? 0.5 : 1 }}>{item.name}</span>
                {!item.isExisting && mode === 'edit' && <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.6rem', color: 'var(--ink-faint)' }} />}
                <button type="button" onClick={() => handleRemoveItem(item)} className="v2-btn-icon-sm" style={{ width: 20, height: 20 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddItem(e); } }}
            style={{ ...inputStyle, flex: 1, minHeight: 60, resize: 'none', lineHeight: 1.5 }}
            placeholder="Add an item... (Shift+Enter for new line)" rows={2} />
          <button type="button" onClick={handleAddItem} disabled={!newItemName.trim()} className="v2-btn-sm v2-btn-primary" style={{ height: 36 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
        {checklistItems.length === 0 && <p className="v2-caption" style={{ marginTop: 6, color: 'var(--ink-faint)' }}>Add at least one item to create a list</p>}
      </Section>
    </>
  );

  return (
    <SlideOverPanel isOpen={isOpen} onClose={handleClose} title={mode === 'edit' ? 'Edit List' : 'New List'}
      headerActions={mode === 'edit' ? (
        <>
          <button onClick={handleDelete} className="v2-btn-icon" disabled={deleteMutation.isPending} title="Delete list">
            {deleteMutation.isPending ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)' }} />
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-tertiary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>}
          </button>
          <StatusIndicator />
        </>
      ) : null}
      footer={mode === 'new' ? (
        <>
          {(!formData.name.trim() || checklistItems.length === 0) && (
            <span className="v2-caption" style={{ color: 'var(--ink-faint)', marginRight: 'auto' }}>
              {!formData.name.trim() ? 'Name required' : 'Add at least one item'}
            </span>
          )}
          <button type="button" onClick={handleClose} className="v2-btn v2-btn-secondary" disabled={createMutation.isPending}>Cancel</button>
          <button type="button" onClick={() => {
            if (formData.name.trim() && checklistItems.length > 0) {
              createMutation.mutate({
                name: formData.name.trim(),
                categoryId: formData.category_id || '',
                items: checklistItems.map(i => i.name),
              });
            }
          }}
            className="v2-btn v2-btn-primary" disabled={createMutation.isPending || !formData.name.trim() || checklistItems.length === 0}>
            {createMutation.isPending ? 'Creating...' : 'Create List'}
          </button>
        </>
      ) : null}
    >
      {mode === 'new' ? <form id="list-form" onSubmit={handleSubmit}>{formContent}</form> : formContent}
    </SlideOverPanel>
  );
};

export default ListFormModal;
