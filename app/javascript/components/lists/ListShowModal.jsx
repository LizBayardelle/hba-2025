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

  // Fetch the list data
  const { data: list, isLoading } = useQuery({
    queryKey: ['list', listId],
    queryFn: () => listsApi.fetchOne(listId),
    enabled: isOpen && !!listId,
  });

  // Reset recently checked when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRecentlyChecked(new Set());
      setNewItemName('');
    }
  }, [isOpen]);

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ checklistItemId, completed }) => {
      return checklistItemsApi.updateForList(listId, checklistItemId, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setTogglingItemId(null);
    },
    onError: () => {
      setTogglingItemId(null);
    },
  });

  // Create item mutation
  const createMutation = useMutation({
    mutationFn: async (name) => {
      return checklistItemsApi.createForList(listId, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      setNewItemName('');
      // Re-focus the input for quick sequential adds
      setTimeout(() => newItemInputRef.current?.focus(), 50);
    },
  });

  // Delete item mutation
  const deleteMutation = useMutation({
    mutationFn: async (itemId) => {
      return checklistItemsApi.deleteForList(listId, itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  const handleDelete = (item) => {
    deleteMutation.mutate(item.id);
  };

  const handleAddItem = () => {
    const trimmed = newItemName.trim();
    if (!trimmed || createMutation.isPending) return;
    createMutation.mutate(trimmed);
  };

  const handleToggle = (item) => {
    const newCompleted = !item.completed;

    // If checking off, add to recently checked (delays move to bottom)
    if (newCompleted) {
      setRecentlyChecked(prev => new Set([...prev, item.id]));
      // After delay, remove from recently checked so it moves to bottom
      setTimeout(() => {
        setRecentlyChecked(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }, 800);
    }

    setTogglingItemId(item.id);
    toggleMutation.mutate({
      checklistItemId: item.id,
      completed: newCompleted,
    });
  };

  const handleCopy = async (item) => {
    try {
      await navigator.clipboard.writeText(item.name);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const color = list?.category?.color || '#1D1D1F';
  const checklistItems = list?.checklist_items || [];
  const completedCount = checklistItems.filter(i => i.completed).length;
  const totalCount = checklistItems.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Sort items: incomplete first, then completed (but recently checked stay in place)
  const sortedItems = useMemo(() => {
    return [...checklistItems].sort((a, b) => {
      const aIsRecentlyChecked = recentlyChecked.has(a.id);
      const bIsRecentlyChecked = recentlyChecked.has(b.id);

      // Recently checked items stay in their original position
      if (aIsRecentlyChecked || bIsRecentlyChecked) return 0;

      // Otherwise, incomplete items first
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      return 0;
    });
  }, [checklistItems, recentlyChecked]);

  const footer = (
    <button
      type="button"
      onClick={closeShowModal}
      className="btn-liquid"
    >
      Done
    </button>
  );

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={closeShowModal}
      title={list?.name || 'List'}
      footer={footer}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: color }}></div>
        </div>
      ) : (
        <div>
          {/* Category badge */}
          <div className="mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: `${color}15`, color }}
            >
              <i className={`fa-solid ${list?.category?.icon || 'fa-list-check'} text-[10px]`}></i>
              {list?.category?.name || 'No category'}
            </span>
          </div>

          {/* Progress */}
          {totalCount > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold" style={{ color }}>
                  Progress
                </span>
                <span
                  className="text-sm font-semibold px-2 py-0.5 rounded"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  {completedCount}/{totalCount}
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: `${color}20` }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          )}

          {/* Checklist items */}
          <div className="space-y-2">
            {sortedItems.map((item) => (
              <div
                key={item.id}
                className="relative flex items-center gap-3 p-3 rounded-lg group transition-all duration-300"
                style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleToggle(item)}
                  disabled={togglingItemId === item.id}
                  className="w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition hover:scale-110"
                  style={{
                    borderColor: color,
                    backgroundColor: item.completed ? color : 'transparent',
                  }}
                >
                  {togglingItemId === item.id ? (
                    <i className="fa-solid fa-spinner fa-spin text-xs" style={{ color: item.completed ? 'white' : color }}></i>
                  ) : item.completed ? (
                    <i className="fa-solid fa-check text-white text-xs"></i>
                  ) : null}
                </button>

                {/* Selectable text */}
                <span
                  className={`flex-1 select-text cursor-text ${item.completed ? 'line-through opacity-60' : ''}`}
                  style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif" }}
                >
                  {item.name}
                </span>

                {/* Copy button */}
                <button
                  onClick={() => handleCopy(item)}
                  className="w-6 h-6 flex items-center justify-center rounded transition opacity-0 group-hover:opacity-100 hover:bg-gray-100"
                  title="Copy to clipboard"
                >
                  <i
                    className={`fa-solid ${copiedId === item.id ? 'fa-check' : 'fa-copy'} text-xs`}
                    style={{ color: copiedId === item.id ? '#22C55E' : '#8E8E93' }}
                  ></i>
                </button>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(item)}
                  className="w-6 h-6 flex items-center justify-center rounded transition opacity-0 group-hover:opacity-100 hover:bg-red-50"
                  title="Delete item"
                >
                  <i className="fa-solid fa-trash-can text-xs" style={{ color: '#C7C7CC' }}></i>
                </button>
              </div>
            ))}
          </div>

          {/* Add item input */}
          <div
            className="flex items-center gap-3 p-3 rounded-lg mt-2"
            style={{ border: '0.5px dashed rgba(199, 199, 204, 0.5)' }}
          >
            <div
              className="w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center"
              style={{ borderColor: `${color}40` }}
            >
              <i className="fa-solid fa-plus text-[10px]" style={{ color: `${color}60` }}></i>
            </div>
            <input
              ref={newItemInputRef}
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddItem();
              }}
              placeholder="Add an item..."
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif" }}
            />
            {newItemName.trim() && (
              <button
                onClick={handleAddItem}
                disabled={createMutation.isPending}
                className="w-6 h-6 flex items-center justify-center rounded-full transition hover:scale-110"
                style={{ backgroundColor: color }}
              >
                {createMutation.isPending ? (
                  <i className="fa-solid fa-spinner fa-spin text-white text-[10px]"></i>
                ) : (
                  <i className="fa-solid fa-arrow-up text-white text-[10px]"></i>
                )}
              </button>
            )}
          </div>

          {checklistItems.length === 0 && (
            <p
              className="text-center py-8"
              style={{ color: '#8E8E93', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
            >
              No items in this list
            </p>
          )}
        </div>
      )}
    </SlideOverPanel>
  );
};

export default ListShowModal;
