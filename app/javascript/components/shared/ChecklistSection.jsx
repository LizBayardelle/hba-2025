import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checklistItemsApi } from '../../utils/api';

const ChecklistSection = ({
  parentType, // 'task' or 'habit'
  parentId,
  items = [],
  color = '#1D1D1F',
  editable = false,
  compact = false,
  resetsDaily = false, // For habits - shows indicator that items reset
  readOnly = false, // When true, no interactions at all (just display)
}) => {
  const queryClient = useQueryClient();
  const [newItemName, setNewItemName] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [togglingItemId, setTogglingItemId] = useState(null);
  const [optimisticToggles, setOptimisticToggles] = useState({});

  // Clear optimistic toggles when server data arrives
  useEffect(() => {
    setOptimisticToggles({});
  }, [items]);

  // Merge optimistic toggles with server data
  const displayItems = useMemo(() => {
    return items.map(item => {
      if (item.id in optimisticToggles) {
        return { ...item, completed: optimisticToggles[item.id] };
      }
      return item;
    });
  }, [items, optimisticToggles]);

  const completedCount = displayItems.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // API methods based on parent type
  const getApiMethods = () => {
    if (parentType === 'task') {
      return {
        create: (data) => checklistItemsApi.createForTask(parentId, data),
        update: (itemId, data) => checklistItemsApi.updateForTask(parentId, itemId, data),
        delete: (itemId) => checklistItemsApi.deleteForTask(parentId, itemId),
      };
    } else if (parentType === 'list') {
      return {
        create: (data) => checklistItemsApi.createForList(parentId, data),
        update: (itemId, data) => checklistItemsApi.updateForList(parentId, itemId, data),
        delete: (itemId) => checklistItemsApi.deleteForList(parentId, itemId),
      };
    } else if (parentType === 'goal') {
      return {
        create: (data) => checklistItemsApi.createForGoal(parentId, data),
        update: (itemId, data) => checklistItemsApi.updateForGoal(parentId, itemId, data),
        delete: (itemId) => checklistItemsApi.deleteForGoal(parentId, itemId),
      };
    } else {
      return {
        create: (data) => checklistItemsApi.createForHabit(parentId, data),
        update: (itemId, data) => checklistItemsApi.updateForHabit(parentId, itemId, data),
        delete: (itemId) => checklistItemsApi.deleteForHabit(parentId, itemId),
      };
    }
  };
  const apiMethods = getApiMethods();

  // Invalidate queries based on parent type
  const invalidateQueries = () => {
    if (parentType === 'task') {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['task', parentId]);
    } else if (parentType === 'list') {
      queryClient.invalidateQueries(['lists']);
      queryClient.invalidateQueries(['list', parentId]);
    } else if (parentType === 'goal') {
      queryClient.invalidateQueries(['goals']);
      queryClient.invalidateQueries(['goal', parentId]);
    } else {
      queryClient.invalidateQueries(['habits']);
      queryClient.invalidateQueries(['habit', parentId]);
    }
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: apiMethods.create,
    onSuccess: () => {
      invalidateQueries();
      setNewItemName('');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ itemId, data }) => apiMethods.update(itemId, data),
    onSuccess: () => {
      invalidateQueries();
      setEditingItemId(null);
      setEditingName('');
      setTogglingItemId(null);
    },
    onError: () => {
      setTogglingItemId(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: apiMethods.delete,
    onSuccess: invalidateQueries,
  });

  const handleAddItem = (e) => {
    e.preventDefault();
    if (newItemName.trim()) {
      createMutation.mutate({ name: newItemName.trim(), position: items.length });
    }
  };

  const handleToggleItem = (item) => {
    const newCompleted = !item.completed;
    setOptimisticToggles(prev => ({ ...prev, [item.id]: newCompleted }));
    setTogglingItemId(item.id);
    updateMutation.mutate({
      itemId: item.id,
      data: { completed: newCompleted },
    });
  };

  const handleStartEdit = (item) => {
    setEditingItemId(item.id);
    setEditingName(item.name);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (editingName.trim() && editingItemId) {
      updateMutation.mutate({
        itemId: editingItemId,
        data: { name: editingName.trim() },
      });
    }
  };

  const handleDeleteItem = (itemId) => {
    deleteMutation.mutate(itemId);
  };

  // Sort items: incomplete first, then completed (preserving relative order within each group)
  const sortedItems = useMemo(() => {
    return [...displayItems].sort((a, b) => {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      return 0;
    });
  }, [displayItems]);

  // Don't render anything if there are no items and not editable
  if (items.length === 0 && !editable) {
    return null;
  }

  return (
    <div className={compact ? '' : 'mt-4'}>
      {/* Header with progress */}
      {totalCount > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color }}>
                <i className="fa-solid fa-list-check mr-1"></i>
                Checklist
              </span>
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${color}15`, color }}
              >
                {completedCount}/{totalCount}
              </span>
              {resetsDaily && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                  title="Checklist items reset daily"
                >
                  <i className="fa-solid fa-rotate-right mr-1"></i>
                  Resets daily
                </span>
              )}
            </div>
          </div>
          {/* Progress bar */}
          <div
            className="h-1.5 rounded-full overflow-hidden"
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
      <div className="space-y-1">
        {sortedItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 group"
          >
            {/* Checkbox */}
            {readOnly ? (
              <div
                className="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center"
                style={{
                  borderColor: color,
                  backgroundColor: item.completed ? color : 'transparent',
                }}
              >
                {item.completed && (
                  <i className="fa-solid fa-check text-white text-xs"></i>
                )}
              </div>
            ) : (
              <button
                onClick={() => handleToggleItem(item)}
                disabled={togglingItemId === item.id}
                className="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition hover:scale-110"
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
            )}

            {/* Item name or edit input */}
            {editingItemId === item.id ? (
              <form onSubmit={handleSaveEdit} className="flex-1 flex items-center gap-1">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm rounded border focus:outline-none"
                  style={{ borderColor: `${color}40` }}
                  autoFocus
                />
                <button
                  type="submit"
                  className="p-1 rounded hover:bg-gray-100"
                  disabled={updateMutation.isPending}
                >
                  <i className="fa-solid fa-check text-xs" style={{ color }}></i>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItemId(null)}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <i className="fa-solid fa-times text-xs text-gray-400"></i>
                </button>
              </form>
            ) : (
              <span
                className={`flex-1 text-sm ${item.completed ? 'line-through opacity-60' : ''}`}
                style={{ color: '#1D1D1F' }}
              >
                {item.name}
              </span>
            )}

            {/* Edit/Delete buttons (only in editable mode) */}
            {editable && editingItemId !== item.id && (
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                <button
                  onClick={() => handleStartEdit(item)}
                  className="p-1 rounded hover:bg-gray-100"
                  title="Edit"
                >
                  <i className="fa-solid fa-pen text-xs text-gray-400"></i>
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1 rounded hover:bg-gray-100"
                  disabled={deleteMutation.isPending}
                  title="Delete"
                >
                  <i className="fa-solid fa-trash text-xs text-gray-400"></i>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new item (only in editable mode) */}
      {editable && (
        <form onSubmit={handleAddItem} className="mt-2 flex items-center gap-2">
          <div
            className="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center"
            style={{ borderColor: `${color}40` }}
          >
            <i className="fa-solid fa-plus text-xs" style={{ color: `${color}60` }}></i>
          </div>
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add checklist item..."
            className="flex-1 px-2 py-1 text-sm rounded border focus:outline-none"
            style={{
              borderColor: `${color}40`,
              fontFamily: "'Inter', sans-serif",
            }}
          />
          {newItemName.trim() && (
            <button
              type="submit"
              className="px-2 py-1 rounded text-xs font-semibold transition hover:opacity-80"
              style={{ backgroundColor: color, color: 'white' }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                'Add'
              )}
            </button>
          )}
        </form>
      )}
    </div>
  );
};

export default ChecklistSection;
