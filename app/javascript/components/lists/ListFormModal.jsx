import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import useListsStore from '../../stores/listsStore';
import { categoriesApi, checklistItemsApi, listsApi } from '../../utils/api';

// Section with fieldset-legend style label on border
const Section = ({ title, children, isLast = false }) => (
  <div className={!isLast ? 'mb-6' : ''}>
    <fieldset
      className="rounded-2xl px-6 pb-6 pt-5"
      style={{ border: '1px solid rgba(142, 142, 147, 0.3)' }}
    >
      <legend className="px-3 mx-auto">
        <span className="uppercase tracking-wider" style={{ fontSize: '1.15rem', color: '#A1A1A6', fontWeight: 500, fontFamily: "'Big Shoulders Inline Display', sans-serif", letterSpacing: '0.1em' }}>
          {title}
        </span>
      </legend>
      {children}
    </fieldset>
  </div>
);

const ListFormModal = () => {
  const queryClient = useQueryClient();
  const { formModal, closeFormModal } = useListsStore();
  const { isOpen, mode, itemId, categoryId: defaultCategoryId } = formModal;

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    pinned: false,
  });
  const [checklistItems, setChecklistItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [itemsToDelete, setItemsToDelete] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Save status tracking (for edit mode only)
  const [saveStatus, setSaveStatus] = useState(null);
  const saveTimeoutRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.fetchAll,
  });

  // Fetch existing list data when editing
  const { data: existingList } = useQuery({
    queryKey: ['list', itemId],
    queryFn: () => listsApi.fetchOne(itemId),
    enabled: isOpen && mode === 'edit' && !!itemId,
  });

  // Load existing data when editing
  useEffect(() => {
    if (mode === 'edit' && existingList) {
      setFormData({
        name: existingList.name || '',
        category_id: existingList.category_id || '',
        pinned: existingList.pinned || false,
      });
      setChecklistItems(
        (existingList.checklist_items || []).map(item => ({
          ...item,
          isExisting: true,
        }))
      );
      setItemsToDelete([]);
    }
  }, [mode, existingList, itemId]);

  // Reset form when modal opens for new
  useEffect(() => {
    if (isOpen && mode === 'new') {
      setFormData({ name: '', category_id: defaultCategoryId || '', pinned: false });
      setChecklistItems([]);
      setNewItemName('');
      setItemsToDelete([]);
      setSaveStatus(null);
    }
  }, [isOpen, mode, defaultCategoryId]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  // Show saved status briefly
  const showSavedStatus = useCallback(() => {
    setSaveStatus('saved');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus(null);
    }, 2000);
  }, []);

  // Create mutation (for new mode - button click)
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const listResponse = await listsApi.create({
        name: data.name,
        category_id: data.category_id || null,
      });

      const listId = listResponse.list.id;

      for (let i = 0; i < data.checklistItems.length; i++) {
        const item = data.checklistItems[i];
        await checklistItemsApi.createForList(listId, {
          name: item.name,
          position: i,
        });
      }

      return listResponse;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
      closeFormModal();
    },
  });

  // Update list name/category mutation (for edit mode - auto-save)
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await listsApi.update(itemId, {
        name: data.name,
        category_id: data.category_id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['list', itemId] });
      showSavedStatus();
    },
    onError: () => {
      setSaveStatus('error');
    },
  });

  // Add checklist item mutation (for edit mode - immediate save)
  const addItemMutation = useMutation({
    mutationFn: async ({ name, position }) => {
      return checklistItemsApi.createForList(itemId, { name, position });
    },
    onSuccess: (response, variables) => {
      setChecklistItems(prev => prev.map(item =>
        item.id === variables.tempId
          ? { ...response.checklist_item, isExisting: true }
          : item
      ));
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['list', itemId] });
      showSavedStatus();
    },
    onError: (error, variables) => {
      setChecklistItems(prev => prev.filter(item => item.id !== variables.tempId));
      setSaveStatus('error');
    },
  });

  // Delete checklist item mutation (for edit mode - immediate save)
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId) => {
      return checklistItemsApi.deleteForList(itemId, itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['list', itemId] });
      showSavedStatus();
    },
    onError: () => {
      setSaveStatus('error');
    },
  });

  // Reorder checklist items mutation (for edit mode)
  const reorderMutation = useMutation({
    mutationFn: async (orderedIds) => {
      return checklistItemsApi.reorderForList(itemId, orderedIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['list', itemId] });
      showSavedStatus();
    },
    onError: () => {
      setSaveStatus('error');
    },
  });

  // Delete list mutation
  const deleteMutation = useMutation({
    mutationFn: () => listsApi.delete(itemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
      await queryClient.invalidateQueries({ queryKey: ['habits'] });
      closeFormModal();
    },
  });

  // Auto-save for edit mode (debounced)
  const autoSaveList = useCallback((newFormData) => {
    if (mode !== 'edit') return;
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    if (!newFormData.name.trim()) return;

    setSaveStatus('saving');
    debounceTimeoutRef.current = setTimeout(() => {
      updateMutation.mutate(newFormData);
    }, 500);
  }, [mode, updateMutation]);

  // Handle name change
  const handleNameChange = (e) => {
    const newFormData = { ...formData, name: e.target.value };
    setFormData(newFormData);
    if (mode === 'edit') {
      autoSaveList(newFormData);
    }
  };

  // Handle category change
  const handleCategoryChange = (categoryId) => {
    const newFormData = { ...formData, category_id: categoryId };
    setFormData(newFormData);
    if (mode === 'edit' && formData.name.trim()) {
      setSaveStatus('saving');
      updateMutation.mutate(newFormData);
    }
  };

  // Handle pin toggle
  const handlePinToggle = () => {
    const newFormData = { ...formData, pinned: !formData.pinned };
    setFormData(newFormData);
    if (mode === 'edit' && formData.name.trim()) {
      setSaveStatus('saving');
      updateMutation.mutate(newFormData);
    }
  };

  // Handle adding a new checklist item
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    if (mode === 'edit') {
      const tempId = `temp-${Date.now()}`;
      const newItem = {
        id: tempId,
        name: newItemName.trim(),
        isExisting: false,
        completed: false,
      };
      setChecklistItems([...checklistItems, newItem]);
      setSaveStatus('saving');
      addItemMutation.mutate({
        name: newItemName.trim(),
        position: checklistItems.length,
        tempId,
      });
    } else {
      setChecklistItems([...checklistItems, {
        id: `new-${Date.now()}`,
        name: newItemName.trim(),
        isExisting: false,
        completed: false,
      }]);
    }
    setNewItemName('');
  };

  // Handle removing a checklist item
  const handleRemoveItem = (item) => {
    setChecklistItems(checklistItems.filter((i) => i.id !== item.id));

    if (mode === 'edit' && item.isExisting) {
      setSaveStatus('saving');
      deleteItemMutation.mutate(item.id);
    } else if (mode === 'new' && item.isExisting) {
      setItemsToDelete([...itemsToDelete, item.id]);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index !== dragOverIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = draggedIndex;

    if (dragIndex === null || dragIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newItems = [...checklistItems];
    const [draggedItem] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);
    setChecklistItems(newItems);
    setDraggedIndex(null);
    setDragOverIndex(null);

    if (mode === 'edit' && newItems.every(item => item.isExisting)) {
      const orderedIds = newItems.map(item => item.id);
      setSaveStatus('saving');
      reorderMutation.mutate(orderedIds);
    }
  };

  // Handle form submit (new mode only)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (checklistItems.length === 0) return;

    createMutation.mutate({
      ...formData,
      checklistItems,
    });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this list? This will also remove it from any attached habits or tasks.')) {
      deleteMutation.mutate();
    }
  };

  const handleClose = () => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    closeFormModal();
  };

  // Status indicator component (edit mode only)
  const StatusIndicator = () => {
    if (mode !== 'edit' || !saveStatus) return null;

    return (
      <div className="flex items-center gap-2 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
        {saveStatus === 'saving' && (
          <>
            <i className="fa-solid fa-spinner fa-spin" style={{ color: '#8E8E93' }}></i>
            <span style={{ color: '#8E8E93' }}>Saving...</span>
          </>
        )}
        {saveStatus === 'saved' && (
          <>
            <i className="fa-solid fa-check" style={{ color: '#22C55E' }}></i>
            <span style={{ color: '#22C55E' }}>Saved</span>
          </>
        )}
        {saveStatus === 'error' && (
          <>
            <i className="fa-solid fa-exclamation-circle" style={{ color: '#DC2626' }}></i>
            <span style={{ color: '#DC2626' }}>Error saving</span>
          </>
        )}
      </div>
    );
  };

  // Header actions for edit mode: grey trash + save status
  const headerActions = mode === 'edit' ? (
    <>
      <button
        type="button"
        onClick={handleDelete}
        className="w-8 h-8 rounded-lg transition hover:bg-gray-100 flex items-center justify-center"
        disabled={deleteMutation.isPending}
        title="Delete list"
      >
        {deleteMutation.isPending ? (
          <i className="fa-solid fa-spinner fa-spin text-sm" style={{ color: '#8E8E93' }}></i>
        ) : (
          <i className="fa-solid fa-trash text-sm" style={{ color: '#8E8E93' }}></i>
        )}
      </button>
      <StatusIndicator />
    </>
  ) : null;

  // Footer only for new mode
  const footer = mode === 'new' ? (
    <>
      <button
        type="button"
        onClick={handleClose}
        className="btn-liquid-outline-light"
        disabled={createMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="list-form"
        className="btn-liquid"
        disabled={createMutation.isPending || !formData.name.trim() || checklistItems.length === 0}
      >
        {createMutation.isPending ? 'Creating...' : 'Create List'}
      </button>
    </>
  ) : null;

  const formContent = (
    <>
      {/* ==================== BASICS SECTION ==================== */}
      <Section title="Basics">
        {/* List Name with Pin Toggle */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <div />
            <button
              type="button"
              onClick={handlePinToggle}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition hover:opacity-80 ${formData.pinned ? 'liquid-surface-subtle' : ''}`}
              style={formData.pinned ? { '--surface-color': '#2C2C2E' } : { background: 'rgba(142, 142, 147, 0.1)', color: '#8E8E93' }}
              title={formData.pinned ? 'Unpin list' : 'Pin list'}
            >
              <i className={`fa-solid fa-thumbtack text-sm ${formData.pinned ? '' : 'opacity-60'}`}
                style={{ color: formData.pinned ? 'white' : '#8E8E93' }}
              ></i>
              <span className="text-xs font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: formData.pinned ? 'white' : '#8E8E93' }}>
                {formData.pinned ? 'Pinned' : 'Pin'}
              </span>
            </button>
          </div>
          <input
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            required={mode === 'new'}
            className="form-input-hero"
            placeholder="List name..."
            autoFocus={mode === 'new'}
          />
        </div>

        {/* Category */}
        <div>
          <label className="form-label">
            Category
          </label>
          <div className="button-bar flex-wrap">
            <button
              type="button"
              onClick={() => handleCategoryChange('')}
              className={`flex items-center gap-2 px-4 py-2.5 ${formData.category_id === '' ? 'liquid-surface-subtle' : ''}`}
              style={formData.category_id === '' ? { '--surface-color': '#1D1D1F' } : {}}
            >
              <i
                className="fa-solid fa-inbox text-sm"
                style={{ color: formData.category_id === '' ? 'white' : '#8E8E93' }}
              ></i>
              <span className="bar-item-text" style={{ color: formData.category_id === '' ? 'white' : '#1D1D1F' }}>
                None
              </span>
            </button>
            {categories?.map((category) => {
              const isActive = formData.category_id === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryChange(category.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 ${isActive ? 'liquid-surface-subtle' : ''}`}
                  style={isActive ? { '--surface-color': category.color } : {}}
                >
                  <i
                    className={`fa-solid ${category.icon} text-sm`}
                    style={{ color: isActive ? 'white' : category.color }}
                  ></i>
                  <span className="bar-item-text" style={{ color: isActive ? 'white' : '#1D1D1F' }}>
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ==================== ITEMS SECTION ==================== */}
      <Section title="Items" isLast={true}>
        {checklistItems.length > 0 && (
          <div className="space-y-2 mb-3">
            {checklistItems.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                  dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-gray-400' : ''
                }`}
                style={{
                  backgroundColor: draggedIndex === index ? '#E5E5E7' : '#F5F5F7',
                  cursor: 'grab',
                }}
              >
                <div
                  className="flex items-center justify-center w-6 h-6 cursor-grab active:cursor-grabbing"
                  title="Drag to reorder"
                >
                  <i className="fa-solid fa-grip-vertical text-sm" style={{ color: '#8E8E93' }}></i>
                </div>
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ backgroundColor: '#E5E5E7', color: '#1D1D1F' }}
                >
                  {index + 1}
                </span>
                <span
                  className={`flex-1 text-sm ${item.completed ? 'line-through opacity-60' : ''}`}
                  style={{ color: '#1D1D1F' }}
                >
                  {item.name}
                </span>
                {!item.isExisting && mode === 'edit' && (
                  <i className="fa-solid fa-spinner fa-spin text-xs" style={{ color: '#8E8E93' }}></i>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item)}
                  className="w-6 h-6 rounded hover:bg-gray-200 flex items-center justify-center transition"
                >
                  <i className="fa-solid fa-times text-xs text-gray-400"></i>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddItem(e);
              }
            }}
            className="form-input flex-1 resize-none"
            style={{ minHeight: '80px' }}
            placeholder="Add an item... (Shift+Enter for new line)"
            rows={3}
          />
          <button
            type="button"
            onClick={handleAddItem}
            disabled={!newItemName.trim()}
            className="px-4 py-3 rounded-lg transition disabled:opacity-50 liquid-surface-subtle"
            style={{ '--surface-color': '#1D1D1F' }}
          >
            <i className="fa-solid fa-plus text-white"></i>
          </button>
        </div>

        {checklistItems.length === 0 && (
          <p className="text-xs mt-2" style={{ color: '#8E8E93' }}>
            Add at least one item to create a list
          </p>
        )}
      </Section>
    </>
  );

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'edit' ? 'Edit List' : 'New List'}
      headerActions={headerActions}
      footer={footer}
    >
      {mode === 'new' ? (
        <form id="list-form" onSubmit={handleSubmit}>
          {formContent}
        </form>
      ) : (
        formContent
      )}
    </SlideOverPanel>
  );
};

export default ListFormModal;
