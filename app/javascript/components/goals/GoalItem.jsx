import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '../../utils/api';
import useGoalsStore from '../../stores/goalsStore';
import useDocumentsStore from '../../stores/documentsStore';
import useListsStore from '../../stores/listsStore';
import ProgressThermometer from './ProgressThermometer';

const GoalItem = ({ goal }) => {
  const queryClient = useQueryClient();
  const { openViewModal, openEditModal } = useGoalsStore();
  const { openViewModal: openDocumentModal } = useDocumentsStore();
  const { openShowModal: openListShowModal } = useListsStore();

  const incrementMutation = useMutation({
    mutationFn: () => goalsApi.increment(goal.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
    },
  });

  const handleClick = () => {
    openViewModal(goal.id);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    openEditModal(goal.id);
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    incrementMutation.mutate();
  };

  const themeColor = '#1d3e4c';

  const getCountLabel = () => {
    if (goal.goal_type === 'counted') {
      return `${goal.current_count}/${goal.target_count}${goal.unit_name ? ' ' + goal.unit_name : ''}`;
    } else {
      const total = goal.checklist_items?.length || 0;
      const completed = goal.checklist_items?.filter(i => i.completed).length || 0;
      return `${completed}/${total} steps`;
    }
  };

  return (
    <div className="flex items-start gap-3">
      {/* Compact thermometer - left side */}
      <div className="flex-shrink-0 mt-0.5">
        <ProgressThermometer
          progress={goal.progress}
          color={goal.category?.color || '#8E8E93'}
          size="compact"
        />
      </div>

      <div
        onClick={handleClick}
        className="bg-white rounded-lg p-4 border shadow-md hover:shadow-lg transition cursor-pointer flex-1"
        style={{
          borderColor: '#E8EEF1',
          opacity: goal.completed ? 0.6 : 1,
        }}
      >
        {/* Goal Content */}
        <div className="flex-1 min-w-0">
          <div className="mb-0">
            <h4
              className={`font-semibold ${goal.completed ? 'line-through' : ''}`}
              style={{ color: '#1d3e4c' }}
            >
              {goal.name}
            </h4>
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Goal Type Badge */}
            <div
              className="px-2 py-1 rounded-lg text-xs font-medium"
              style={{
                backgroundColor: goal.goal_type === 'counted' ? '#7C3AED' : '#0891B2',
                color: 'white',
              }}
            >
              <i className={`fa-solid ${goal.goal_type === 'counted' ? 'fa-hashtag' : 'fa-list-ol'} mr-1`}></i>
              {goal.goal_type === 'counted' ? 'Counted' : 'Steps'}
            </div>

            {/* Progress count */}
            <div
              className="px-2 py-1 rounded-lg text-xs font-medium"
              style={{
                backgroundColor: themeColor,
                color: 'white',
              }}
            >
              <i className="fa-solid fa-chart-simple mr-1"></i>
              {getCountLabel()}
            </div>

            {/* Importance Level */}
            {goal.importance_level && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: goal.importance_level.color,
                  color: 'white',
                }}
              >
                <i className={`${goal.importance_level.icon} text-[10px]`}></i>
                <span>{goal.importance_level.name}</span>
              </div>
            )}

            {/* Category */}
            {goal.category && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: goal.category.color,
                  color: 'white',
                }}
              >
                <i className={`fa-solid ${goal.category.icon}`}></i>
                <span>{goal.category.name}</span>
              </div>
            )}

            {/* Time Block */}
            {goal.time_block && goal.time_block.name.toLowerCase() !== 'anytime' && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: goal.time_block.color,
                  color: 'white',
                }}
              >
                <i className={`${goal.time_block.icon} text-[10px]`}></i>
                <span>{goal.time_block.name}</span>
              </div>
            )}

            {/* Tags */}
            {goal.tags?.map(tag => (
              <div
                key={tag.id}
                className="px-2 py-1 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: themeColor,
                  color: 'white',
                }}
              >
                <i className="fa-solid fa-tag mr-1"></i>
                {tag.name}
              </div>
            ))}

            {/* Attached list badges */}
            {goal.list_attachments && goal.list_attachments.map((attachment) => (
              <button
                key={attachment.list_id}
                onClick={(e) => {
                  e.stopPropagation();
                  openListShowModal(attachment.list_id);
                }}
                className="px-2 py-1 rounded-lg text-xs font-medium hover:opacity-70 transition cursor-pointer flex items-center gap-1"
                style={{
                  backgroundColor: attachment.list_category?.color || themeColor,
                  color: 'white',
                }}
                title={`Open ${attachment.list_name}`}
              >
                <i className={`fa-solid ${attachment.list_category?.icon || 'fa-list-check'} text-[10px]`}></i>
                {attachment.list_name} ({attachment.checklist_items?.filter(i => i.completed).length || 0}/{attachment.checklist_items?.length || 0})
              </button>
            ))}

            {/* +1 button for counted goals */}
            {goal.goal_type === 'counted' && !goal.completed && (
              <button
                onClick={handleIncrement}
                disabled={incrementMutation.isPending}
                className="px-2 py-1 rounded-lg text-xs font-medium hover:opacity-80 transition"
                style={{
                  backgroundColor: '#22C55E',
                  color: 'white',
                }}
                title="Increment count"
              >
                {incrementMutation.isPending ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <>
                    <i className="fa-solid fa-plus mr-1"></i>1
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit button outside card on right */}
      <button
        onClick={handleEdit}
        className="w-5 h-5 flex items-center justify-center transition hover:opacity-70 mt-0.5"
        title="Edit"
      >
        <i className="fa-solid fa-pen text-sm" style={{ color: '#9CA3A8' }}></i>
      </button>
    </div>
  );
};

export default GoalItem;
