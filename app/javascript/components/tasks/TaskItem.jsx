import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../utils/api';
import useTasksStore from '../../stores/tasksStore';
import useDocumentsStore from '../../stores/documentsStore';
import useListsStore from '../../stores/listsStore';
import ChecklistSection from '../shared/ChecklistSection';

const TaskItem = ({ task }) => {
  const queryClient = useQueryClient();
  const { openViewModal, openEditModal } = useTasksStore();
  const { openViewModal: openDocumentModal } = useDocumentsStore();
  const { openShowModal: openListShowModal } = useListsStore();

  // Toggle completion mutation
  const toggleCompleteMutation = useMutation({
    mutationFn: (completed) => tasksApi.update(task.id, { task: { completed } }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
    },
  });

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    toggleCompleteMutation.mutate(!task.completed);
  };

  const handleClick = () => {
    openViewModal(task.id);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    openEditModal(task.id);
  };

  // Determine due date status
  const getDueDateStatus = () => {
    if (!task.due_date) return null;

    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'Overdue', color: '#FB7185', bgColor: '#FFE4E6' };
    } else if (diffDays === 0) {
      return { text: 'Due Today', color: '#E5C730', bgColor: '#FEF7C3' };
    } else if (diffDays <= 7) {
      return { text: `Due in ${diffDays}d`, color: '#22D3EE', bgColor: '#CFFAFE' };
    } else {
      return { text: new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: '#6B8A99', bgColor: '#E8EEF1' };
    }
  };

  const dueDateStatus = getDueDateStatus();

  // Theme color for non-category badges
  const themeColor = '#1d3e4c';
  const themeBgColor = '#E8EEF1';

  return (
    <div className="flex items-start gap-3">
      {/* Checkbox - outside card on left */}
      <div className="flex-shrink-0 mt-0.5">
        <button
          onClick={handleCheckboxChange}
          disabled={toggleCompleteMutation.isPending}
          className="w-6 h-6 rounded-md border-2 flex items-center justify-center transition hover:scale-110 cursor-pointer"
          style={{
            borderColor: task.category?.color || '#1d3e4c',
            backgroundColor: task.completed ? (task.category?.color || '#1d3e4c') : 'white',
          }}
        >
          {toggleCompleteMutation.isPending ? (
            <i className="fa-solid fa-spinner fa-spin text-xs" style={{ color: task.completed ? 'white' : (task.category?.color || '#1d3e4c') }}></i>
          ) : task.completed ? (
            <i className="fa-solid fa-check text-white text-xs"></i>
          ) : null}
        </button>
      </div>

      <div
        onClick={handleClick}
        className="bg-white rounded-lg p-4 border shadow-md hover:shadow-lg transition cursor-pointer flex-1"
        style={{
          borderColor: task.completed ? '#E8EEF1' : '#E8EEF1',
          opacity: task.completed ? 0.6 : 1,
        }}
      >
        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className="mb-0">
            <h4
              className={`font-semibold ${task.completed ? 'line-through' : ''}`}
              style={{ color: '#1d3e4c' }}
            >
              {task.name}
            </h4>
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Importance Level */}
            {task.importance_level && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: task.importance_level.color,
                  color: 'white',
                }}
              >
                <i className={`${task.importance_level.icon} text-[10px]`}></i>
                <span>{task.importance_level.name}</span>
              </div>
            )}

            {/* Category */}
            {task.category && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: task.category.color,
                  color: 'white',
                }}
              >
                <i className={`fa-solid ${task.category.icon}`}></i>
                <span>{task.category.name}</span>
              </div>
            )}

            {/* Time Block */}
            {task.time_block && task.time_block.name.toLowerCase() !== 'anytime' && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: task.time_block.color,
                  color: 'white',
                }}
              >
                <i className={`${task.time_block.icon} text-[10px]`}></i>
                <span>{task.time_block.name}</span>
              </div>
            )}

            {/* Document Badge */}
            {task.document && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openDocumentModal(task.document.id);
                }}
                className="px-2 py-1 rounded-lg text-xs font-medium hover:opacity-70 transition flex items-center gap-1"
                style={{
                  backgroundColor: themeColor,
                  color: 'white',
                }}
                title="View attached document"
              >
                <i className="fa-solid fa-file-alt text-[10px]"></i>
                {task.document.title}
              </button>
            )}

            {/* Due Date */}
            {dueDateStatus && (
              <div
                className="px-2 py-1 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: themeColor,
                  color: 'white',
                }}
              >
                <i className="fa-solid fa-calendar-day mr-1"></i>
                {dueDateStatus.text}
              </div>
            )}

            {/* Repeat indicator */}
            {task.repeat_frequency && (
              <div
                className="px-2 py-1 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: '#7C3AED',
                  color: 'white',
                }}
                title={`Repeats ${task.repeat_frequency}${task.repeat_interval > 1 ? ` every ${task.repeat_interval}` : ''}`}
              >
                <i className="fa-solid fa-repeat mr-1"></i>
                {task.repeat_frequency.charAt(0).toUpperCase() + task.repeat_frequency.slice(1)}
              </div>
            )}

            {/* On Hold */}
            {task.on_hold && (
              <div
                className="px-2 py-1 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: themeColor,
                  color: 'white',
                }}
              >
                <i className="fa-solid fa-pause mr-1"></i>
                On Hold
              </div>
            )}

            {/* Tags */}
            {task.tags?.map(tag => (
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

            {/* URL indicator */}
            {task.url && (
              <div className="text-xs" style={{ color: '#6B8A99' }}>
                <i className="fa-solid fa-link"></i>
              </div>
            )}

            {/* Location indicator */}
            {task.location_name && (
              <div className="text-xs" style={{ color: '#6B8A99' }}>
                <i className="fa-solid fa-location-dot"></i>
              </div>
            )}

            {/* Checklist indicator */}
            {task.checklist_items && task.checklist_items.length > 0 && (
              <div
                className="px-2 py-1 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: themeColor,
                  color: 'white',
                }}
              >
                <i className="fa-solid fa-list-check mr-1"></i>
                {task.checklist_items.filter(i => i.completed).length}/{task.checklist_items.length}
              </div>
            )}

            {/* Attached list badges */}
            {task.list_attachments && task.list_attachments.map((attachment) => (
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
          </div>

          {/* Checklist (read-only toggle) */}
          {task.checklist_items && task.checklist_items.length > 0 && (
            <div onClick={(e) => e.stopPropagation()}>
              <ChecklistSection
                parentType="task"
                parentId={task.id}
                items={task.checklist_items}
                color={task.category?.color || themeColor}
                editable={false}
                compact={true}
              />
            </div>
          )}
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

export default TaskItem;
