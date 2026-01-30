import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import useListsStore from '../../stores/listsStore';
import { listsApi, checklistItemsApi } from '../../utils/api';

const ListShowModal = () => {
  const queryClient = useQueryClient();
  const { showModal, closeShowModal } = useListsStore();
  const { isOpen, listId } = showModal;

  // Fetch the list data
  const { data: list, isLoading } = useQuery({
    queryKey: ['list', listId],
    queryFn: () => listsApi.fetchOne(listId),
    enabled: isOpen && !!listId,
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ checklistItemId, completed }) => {
      return checklistItemsApi.updateForList(listId, checklistItemId, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  const handleToggle = (item) => {
    toggleMutation.mutate({
      checklistItemId: item.id,
      completed: !item.completed,
    });
  };

  const color = list?.category?.color || '#1d3e4c';
  const checklistItems = list?.checklist_items || [];
  const completedCount = checklistItems.filter(i => i.completed).length;
  const totalCount = checklistItems.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

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
    <BaseModal
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
            {checklistItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleToggle(item)}
                disabled={toggleMutation.isPending}
                className="w-full flex items-center gap-3 p-3 rounded-lg transition hover:bg-gray-50 text-left"
                style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
              >
                <div
                  className="w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition"
                  style={{
                    borderColor: color,
                    backgroundColor: item.completed ? color : 'transparent',
                  }}
                >
                  {item.completed && (
                    <i className="fa-solid fa-check text-white text-xs"></i>
                  )}
                </div>
                <span
                  className={`flex-1 ${item.completed ? 'line-through opacity-60' : ''}`}
                  style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif" }}
                >
                  {item.name}
                </span>
              </button>
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
    </BaseModal>
  );
};

export default ListShowModal;
