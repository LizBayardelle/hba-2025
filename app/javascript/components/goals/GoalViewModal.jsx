import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import ChecklistSection from '../shared/ChecklistSection';
import ProgressThermometer from './ProgressThermometer';
import { goalsApi } from '../../utils/api';
import useGoalsStore from '../../stores/goalsStore';

const GoalViewModal = () => {
  const queryClient = useQueryClient();
  const { viewModal, closeViewModal, openEditModal } = useGoalsStore();
  const { goalId, isOpen } = viewModal;

  // Fetch goal data
  const { data: goal, isLoading, error } = useQuery({
    queryKey: ['goal', goalId],
    queryFn: () => goalsApi.fetchOne(goalId),
    enabled: isOpen && !!goalId,
  });

  // Increment mutation
  const incrementMutation = useMutation({
    mutationFn: () => goalsApi.increment(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      queryClient.invalidateQueries(['goal', goalId]);
    },
  });

  // Decrement mutation
  const decrementMutation = useMutation({
    mutationFn: () => goalsApi.decrement(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      queryClient.invalidateQueries(['goal', goalId]);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => goalsApi.delete(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      closeViewModal();
    },
  });

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getCountLabel = () => {
    if (!goal) return '';
    if (goal.goal_type === 'counted') {
      return `${goal.current_count}/${goal.target_count}${goal.unit_name ? ' ' + goal.unit_name : ''}`;
    } else {
      const total = goal.checklist_items?.length || 0;
      const completed = goal.checklist_items?.filter(i => i.completed).length || 0;
      return `${completed}/${total} steps`;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2"
            style={{ borderColor: '#1D1D1F' }}
          ></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8" style={{ color: '#DC2626' }}>
          <i className="fa-solid fa-exclamation-circle text-4xl mb-4"></i>
          <p>Error loading goal: {error.message}</p>
        </div>
      );
    }

    if (!goal) return null;

    return (
      <div className="space-y-6">
        {/* Goal Name with Thermometer */}
        <div className="flex items-start gap-5">
          <ProgressThermometer
            progress={goal.progress}
            color={goal.category?.color || '#8E8E93'}
            size="normal"
            countLabel={getCountLabel()}
          />
          <div className="flex-1">
            <h2
              className={`text-2xl font-bold ${goal.completed ? 'line-through opacity-60' : ''}`}
              style={{ color: '#1D1D1F' }}
            >
              {goal.name}
            </h2>
            {goal.description && (
              <p className="mt-2 text-sm" style={{ color: '#6B8A99' }}>
                {goal.description}
              </p>
            )}
          </div>
        </div>

        {/* Metadata Pills */}
        <div className="flex flex-wrap gap-2">
          {/* Goal Type */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-sm liquid-surface-subtle"
            style={{ '--surface-color': '#1D1D1F' }}
          >
            {goal.goal_type === 'counted' && !goal.unit_name && <i className="fa-solid fa-hashtag"></i>}
            {goal.goal_type !== 'counted' && <i className="fa-solid fa-list-ol"></i>}
            <span style={{ fontWeight: 500 }}>{goal.goal_type === 'counted' ? (goal.unit_name ? `# of ${goal.unit_name}` : 'Counted') : 'Named Steps'}</span>
          </div>

          {/* Category */}
          {goal.category && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-sm liquid-surface-subtle"
              style={{ '--surface-color': goal.category.color }}
            >
              <i className={`fa-solid ${goal.category.icon}`}></i>
              <span style={{ fontWeight: 500 }}>{goal.category.name}</span>
            </div>
          )}

          {/* Importance Level */}
          {goal.importance_level && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-sm liquid-surface-subtle"
              style={{ '--surface-color': goal.importance_level.color }}
            >
              <i className={`${goal.importance_level.icon}`}></i>
              <span style={{ fontWeight: 500 }}>{goal.importance_level.name}</span>
            </div>
          )}

          {/* Time Block */}
          {goal.time_block && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-sm liquid-surface-subtle"
              style={{ '--surface-color': goal.time_block.color }}
            >
              <i className={`${goal.time_block.icon}`}></i>
              <span style={{ fontWeight: 500 }}>{goal.time_block.name}</span>
            </div>
          )}

          {/* Completed */}
          {goal.completed && goal.completed_at && (
            <div
              className="px-3 py-1.5 rounded-[10px] text-sm liquid-surface-subtle"
              style={{ '--surface-color': '#4A6B27' }}
            >
              <i className="fa-solid fa-check-circle mr-1"></i>
              Completed {formatDateTime(goal.completed_at)}
            </div>
          )}
        </div>

        {/* Tags */}
        {goal.tags && goal.tags.length > 0 && (
          <div>
            <h3 className="form-label">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {goal.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-3 py-1.5 rounded-[10px] text-sm liquid-surface-subtle"
                  style={{
                    '--surface-color': '#2C2C2E',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  <i className="fa-solid fa-tag mr-1 text-xs"></i>
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Counted goal: +1/-1 buttons */}
        {goal.goal_type === 'counted' && !goal.completed && (
          <div>
            <h3 className="form-label">
              Progress
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => decrementMutation.mutate()}
                disabled={decrementMutation.isPending || goal.current_count <= 0}
                className="w-10 h-10 rounded-[10px] flex items-center justify-center transition hover:opacity-80 disabled:opacity-30 badge-outline"
              >
                {decrementMutation.isPending ? (
                  <i className="fa-solid fa-spinner fa-spin" style={{ color: '#1D1D1F' }}></i>
                ) : (
                  <i className="fa-solid fa-minus" style={{ color: '#1D1D1F' }}></i>
                )}
              </button>
              <div className="text-xl font-bold" style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif" }}>
                {goal.current_count} / {goal.target_count}
                {goal.unit_name && <span className="text-sm font-normal ml-1" style={{ color: '#8E8E93' }}>{goal.unit_name}</span>}
              </div>
              <button
                onClick={() => incrementMutation.mutate()}
                disabled={incrementMutation.isPending}
                className="w-10 h-10 rounded-[10px] flex items-center justify-center transition hover:opacity-80 liquid-surface-subtle"
                style={{ '--surface-color': '#22C55E' }}
              >
                {incrementMutation.isPending ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-plus"></i>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Named Steps: ChecklistSection */}
        {goal.goal_type === 'named_steps' && (
          <div>
            <h3 className="form-label">
              Steps
            </h3>
            <ChecklistSection
              parentType="goal"
              parentId={goalId}
              items={goal.checklist_items || []}
              color={goal.category?.color || '#1D1D1F'}
              editable={true}
            />
          </div>
        )}

        {/* Created Date */}
        <div className="pt-4 border-t" style={{ borderColor: 'rgba(199, 199, 204, 0.3)' }}>
          <p className="text-xs" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#8E8E93' }}>
            Created {formatDateTime(goal.created_at)}
          </p>
        </div>
      </div>
    );
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      deleteMutation.mutate();
    }
  };

  const footer = (
    <>
      <button
        onClick={handleDelete}
        className="btn-delete-icon"
        disabled={deleteMutation.isPending}
        title="Delete goal"
      >
        {deleteMutation.isPending ? (
          <i className="fa-solid fa-spinner fa-spin" style={{ color: '#8E8E93' }}></i>
        ) : (
          <i className="fa-solid fa-trash text-lg" style={{ color: '#DC2626' }}></i>
        )}
      </button>
      <button
        onClick={() => {
          closeViewModal();
          openEditModal(goalId);
        }}
        className="btn-liquid-outline-light"
      >
        Edit
      </button>
      <button
        onClick={closeViewModal}
        className="btn-liquid"
      >
        Close
      </button>
    </>
  );

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={closeViewModal}
      title="Goal Details"
      footer={footer}
    >
      {renderContent()}
    </SlideOverPanel>
  );
};

export default GoalViewModal;
