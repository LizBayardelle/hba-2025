import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import { tasksApi } from '../../utils/api';
import useTasksStore from '../../stores/tasksStore';

const TaskViewModal = () => {
  const queryClient = useQueryClient();
  const { viewModal, closeViewModal, openEditModal } = useTasksStore();
  const { taskId, isOpen } = viewModal;

  // Fetch task data
  const { data: task, isLoading, error } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.fetchOne(taskId),
    enabled: isOpen && !!taskId,
  });

  // Toggle completion mutation
  const toggleCompleteMutation = useMutation({
    mutationFn: (completed) => tasksApi.update(taskId, { task: { completed, completed_at: completed ? new Date().toISOString() : null } }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['task', taskId]);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      closeViewModal();
    },
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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

  const getDueDateStatus = (dueDate) => {
    if (!dueDate) return null;

    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'Overdue', color: '#FB7185', bgColor: '#FFE4E6' };
    } else if (diffDays === 0) {
      return { text: 'Due Today', color: '#E5C730', bgColor: '#FEF7C3' };
    } else if (diffDays <= 7) {
      return { text: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`, color: '#22D3EE', bgColor: '#CFFAFE' };
    } else {
      return { text: `Due ${formatDate(dueDate)}`, color: '#6B8A99', bgColor: '#E8EEF1' };
    }
  };

  const importanceColors = {
    critical: { color: '#FB7185', bgColor: '#FFE4E6' },
    important: { color: '#E5C730', bgColor: '#FEF7C3' },
    normal: { color: '#6B8A99', bgColor: '#E8EEF1' },
    optional: { color: '#9CA3A8', bgColor: '#E8E8E8' },
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2"
            style={{ borderColor: '#1d3e4c' }}
          ></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8" style={{ color: '#DC2626' }}>
          <i className="fa-solid fa-exclamation-circle text-4xl mb-4"></i>
          <p>Error loading task: {error.message}</p>
        </div>
      );
    }

    if (!task) return null;

    const dueDateStatus = getDueDateStatus(task.due_date);
    const importanceStyle = importanceColors[task.importance] || importanceColors.normal;

    return (
      <div className="space-y-6">
        {/* Task Name with Checkbox */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => toggleCompleteMutation.mutate(!task.completed)}
            disabled={toggleCompleteMutation.isPending}
            className="w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition hover:scale-110 cursor-pointer mt-1"
            style={{
              borderColor: task.category?.color || '#6B8A99',
              backgroundColor: task.completed ? (task.category?.color || '#6B8A99') : 'transparent',
            }}
          >
            {toggleCompleteMutation.isPending ? (
              <i className="fa-solid fa-spinner fa-spin text-xs" style={{ color: task.completed ? 'white' : (task.category?.color || '#6B8A99') }}></i>
            ) : task.completed ? (
              <i className="fa-solid fa-check text-white text-xs"></i>
            ) : null}
          </button>
          <h2
            className={`text-2xl font-bold ${task.completed ? 'line-through opacity-60' : ''}`}
            style={{ color: '#1d3e4c' }}
          >
            {task.name}
          </h2>
        </div>

        {/* Metadata Pills */}
        <div className="flex flex-wrap gap-2">
          {/* Category */}
          {task.category && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: task.category.color,
                color: 'white',
              }}
            >
              <i className={`fa-solid ${task.category.icon}`}></i>
              <span>{task.category.name}</span>
            </div>
          )}

          {/* Importance */}
          <div
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: importanceStyle.bgColor,
              color: importanceStyle.color,
            }}
          >
            {task.importance?.charAt(0).toUpperCase() + task.importance?.slice(1)}
          </div>

          {/* Due Date */}
          {dueDateStatus && (
            <div
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: dueDateStatus.bgColor,
                color: dueDateStatus.color,
              }}
            >
              <i className="fa-solid fa-calendar-day mr-1"></i>
              {dueDateStatus.text}
            </div>
          )}

          {/* On Hold */}
          {task.on_hold && (
            <div
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: '#E8E8E8',
                color: '#4A5057',
              }}
            >
              <i className="fa-solid fa-pause mr-1"></i>
              On Hold
            </div>
          )}

          {/* Completed */}
          {task.completed && task.completed_at && (
            <div
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: '#D7EDCB',
                color: '#4A6B27',
              }}
            >
              <i className="fa-solid fa-check-circle mr-1"></i>
              Completed {formatDateTime(task.completed_at)}
            </div>
          )}
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div>
            <h3 className="text-sm mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-3 py-1.5 rounded-full text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)',
                    color: '#FFFFFF',
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

        {/* Due Date with Time */}
        {task.due_date && (
          <div>
            <h3 className="text-sm mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
              Due Date
            </h3>
            <p style={{ color: '#1d3e4c' }}>
              {formatDate(task.due_date)}
              {task.due_time && ` at ${task.due_time}`}
            </p>
          </div>
        )}

        {/* URL */}
        {task.url && (
          <div>
            <h3 className="text-sm mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
              URL
            </h3>
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline"
              style={{ color: '#22D3EE' }}
            >
              <i className="fa-solid fa-external-link mr-1"></i>
              {task.url}
            </a>
          </div>
        )}

        {/* Location */}
        {task.location_name && (
          <div>
            <h3 className="text-sm mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
              Location
            </h3>
            <p style={{ color: '#1d3e4c' }}>
              <i className="fa-solid fa-location-dot mr-2"></i>
              {task.location_name}
              {task.location_lat && task.location_lng && (
                <span className="text-sm ml-2" style={{ color: '#9CA3A8' }}>
                  ({task.location_lat}, {task.location_lng})
                </span>
              )}
            </p>
          </div>
        )}

        {/* Notes */}
        {task.notes && (
          <div>
            <h3 className="text-sm mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
              Notes
            </h3>
            <div
              className="prose max-w-none trix-content"
              dangerouslySetInnerHTML={{ __html: task.notes || '' }}
            />
          </div>
        )}

        {/* Created Date */}
        <div className="pt-4 border-t" style={{ borderColor: 'rgba(199, 199, 204, 0.3)' }}>
          <p className="text-xs" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#8E8E93' }}>
            Created {formatDateTime(task.created_at)}
          </p>
        </div>
      </div>
    );
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate();
    }
  };

  const footer = (
    <>
      <button
        onClick={handleDelete}
        className="mr-auto w-10 h-10 rounded-lg transition hover:bg-white/10 flex items-center justify-center"
        disabled={deleteMutation.isPending}
        title="Delete task"
      >
        {deleteMutation.isPending ? (
          <i className="fa-solid fa-spinner fa-spin text-white"></i>
        ) : (
          <i className="fa-solid fa-trash text-white text-lg"></i>
        )}
      </button>
      <button
        onClick={() => {
          closeViewModal();
          openEditModal(taskId);
        }}
        className="px-6 py-3 rounded-lg transition hover:bg-white/20"
        style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: 'white', border: '0.5px solid rgba(255, 255, 255, 0.3)' }}
      >
        Edit
      </button>
      <button
        onClick={closeViewModal}
        className="px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #A8A8AC 0%, #E5E5E7 45%, #FFFFFF 55%, #C7C7CC 70%, #8E8E93 100%)', border: '0.5px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3)', color: '#1D1D1F', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
      >
        Close
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={closeViewModal}
      title="Task Details"
      footer={footer}
      maxWidth="max-w-4xl"
    >
      {renderContent()}
    </BaseModal>
  );
};

export default TaskViewModal;
