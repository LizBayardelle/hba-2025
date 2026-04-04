import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import useListsStore from '../../stores/listsStore';
import { listsApi, checklistItemsApi } from '../../utils/api';

const ListShowModal = () => {
  const queryClient = useQueryClient();
  const { showModal, closeShowModal } = useListsStore();
  const { isOpen, listId } = showModal;
  const [copiedId, setCopiedId] = useState(null);
  const [recentlyChecked, setRecentlyChecked] = useState(new Set());
  const [togglingItemId, setTogglingItemId] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const newItemInputRef = useRef(null);

  const { data: list, isLoading } = useQuery({
    queryKey: ['list', listId],
    queryFn: () => listsApi.fetchOne(listId),
    enabled: isOpen && !!listId,
  });

  useEffect(() => {
    if (!isOpen) { setRecentlyChecked(new Set()); setNewItemName(''); }
  }, [isOpen]);

  const toggleMutation = useMutation({
    mutationFn: async ({ checklistItemId, completed }) => checklistItemsApi.updateForList(listId, checklistItemId, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setTogglingItemId(null);
    },
    onError: () => setTogglingItemId(null),
  });

  const createMutation = useMutation({
    mutationFn: async (name) => checklistItemsApi.createForList(listId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      setNewItemName('');
      setTimeout(() => newItemInputRef.current?.focus(), 50);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId) => checklistItemsApi.deleteForList(listId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  const handleToggle = (item) => {
    const newCompleted = !item.completed;
    if (newCompleted) {
      setRecentlyChecked(prev => new Set([...prev, item.id]));
      setTimeout(() => setRecentlyChecked(prev => { const next = new Set(prev); next.delete(item.id); return next; }), 800);
    }
    setTogglingItemId(item.id);
    toggleMutation.mutate({ checklistItemId: item.id, completed: newCompleted });
  };

  const handleCopy = async (item) => {
    try { await navigator.clipboard.writeText(item.name); setCopiedId(item.id); setTimeout(() => setCopiedId(null), 1500); } catch (err) { console.error('Failed to copy:', err); }
  };

  const handleAddItem = () => { const t = newItemName.trim(); if (!t || createMutation.isPending) return; createMutation.mutate(t); };

  const color = list?.category?.color || 'var(--ink)';
  const checklistItems = list?.checklist_items || [];
  const completedCount = checklistItems.filter(i => i.completed).length;
  const totalCount = checklistItems.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const sortedItems = useMemo(() => {
    return [...checklistItems].sort((a, b) => {
      if (recentlyChecked.has(a.id) || recentlyChecked.has(b.id)) return 0;
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      return 0;
    });
  }, [checklistItems, recentlyChecked]);

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={closeShowModal}
      title={list?.name || 'List'}
      footer={<button type="button" onClick={closeShowModal} className="v2-btn v2-btn-primary">Done</button>}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ink-faint)' }} />
        </div>
      ) : (
        <div>
          {/* Category badge */}
          <div style={{ marginBottom: 16 }}>
            <span className="v2-badge" style={{ background: `${color}15`, color, padding: '3px 10px' }}>
              <i className={`fa-solid ${list?.category?.icon || 'fa-list-check'}`} style={{ fontSize: '0.6rem', marginRight: 4 }} />
              {list?.category?.name || 'No category'}
            </span>
          </div>

          {/* Progress */}
          {totalCount > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span className="v2-caption">{completedCount} of {totalCount}</span>
                <span className="v2-caption">{Math.round(progressPercent)}%</span>
              </div>
              <div style={{ height: 3, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPercent}%`, background: color, borderRadius: 3, transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}

          {/* Checklist items */}
          <div>
            {sortedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 group"
                style={{ padding: '8px 4px', borderBottom: '1px solid var(--border)', transition: 'background 0.1s ease' }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleToggle(item)}
                  disabled={togglingItemId === item.id}
                  style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1.5px solid ${item.completed ? 'var(--ink)' : 'var(--border-hover)'}`,
                    background: item.completed ? 'var(--ink)' : 'transparent',
                    transition: 'all 0.2s ease', cursor: 'pointer', padding: 0,
                  }}
                >
                  {togglingItemId === item.id ? (
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.5rem', color: item.completed ? 'var(--check-ink)' : 'var(--ink-tertiary)' }} />
                  ) : (
                    <i className="fa-solid fa-check" style={{ fontSize: '0.55rem', color: 'var(--check-ink)', opacity: item.completed ? 1 : 0 }} />
                  )}
                </button>

                {/* Text */}
                <span
                  className="flex-1 select-text cursor-text"
                  style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--ink)',
                    textDecoration: item.completed ? 'line-through' : 'none',
                    textDecorationColor: 'var(--ink-faint)',
                    opacity: item.completed ? 0.5 : 1,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  {item.name}
                </span>

                {/* Actions (visible on hover) */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleCopy(item)} className="v2-btn-icon-sm" title="Copy">
                    <i className={`fa-solid ${copiedId === item.id ? 'fa-check' : 'fa-copy'}`} style={{ fontSize: '0.6rem', color: copiedId === item.id ? 'var(--ink)' : 'var(--ink-faint)' }} />
                  </button>
                  <button onClick={() => deleteMutation.mutate(item.id)} className="v2-btn-icon-sm" title="Delete">
                    <i className="fa-solid fa-trash-can" style={{ fontSize: '0.6rem', color: 'var(--ink-faint)' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add item */}
          <div className="flex items-center gap-2.5" style={{ padding: '8px 4px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, border: '1.5px dashed var(--border-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fa-solid fa-plus" style={{ fontSize: '0.45rem', color: 'var(--ink-faint)' }} />
            </div>
            <input
              ref={newItemInputRef}
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(); }}
              placeholder="Add an item..."
              style={{
                flex: 1, background: 'transparent', outline: 'none', border: 'none',
                fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--ink)',
              }}
            />
            {newItemName.trim() && (
              <button onClick={handleAddItem} disabled={createMutation.isPending} className="v2-btn-icon-sm" style={{ color: 'var(--ink)' }}>
                {createMutation.isPending
                  ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.6rem' }} />
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                }
              </button>
            )}
          </div>

          {checklistItems.length === 0 && (
            <p className="v2-small" style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-faint)' }}>
              No items in this list
            </p>
          )}
        </div>
      )}
    </SlideOverPanel>
  );
};

export default ListShowModal;
