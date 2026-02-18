import React, { useState, useEffect, useMemo } from 'react';
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
      className="px-6 py-3 rounded-lg transition cursor-pointer hover:opacity-90"
      style={{
        background: 'linear-gradient(135deg, #A8A8AC 0%, #E5E5E7 45%, #FFFFFF 55%, #C7C7CC 70%, #8E8E93 100%)',
        border: '0.5px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
        color: '#1D1D1F',
        fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
      }}
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
          {/* Header info */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: color }}
            >
              {list?.category ? (
                <i className={`fa-solid ${list.category.icon} text-white text-lg`}></i>
              ) : (
                <i className="fa-solid fa-list-check text-white text-lg"></i>
              )}
            </div>
            <div className="flex-1">
              {list?.category && (
                <span className="text-xs" style={{ color: '#8E8E93' }}>
                  {list.category.name}
                </span>
              )}
              {!list?.category && (
                <span className="text-xs" style={{ color: '#8E8E93' }}>
                  No category
                </span>
              )}
            </div>
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
              </div>
            ))}
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
