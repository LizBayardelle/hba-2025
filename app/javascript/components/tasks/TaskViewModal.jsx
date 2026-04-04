import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import { tasksApi } from '../../utils/api';
import { parseLocalDate, getToday } from '../../utils/dateUtils';
import useTasksStore from '../../stores/tasksStore';

const TaskViewModal = () => {
  const queryClient = useQueryClient();
  const { viewModal, closeViewModal, openEditModal } = useTasksStore();
  const { taskId, isOpen } = viewModal;

  const { data: task, isLoading, error } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.fetchOne(taskId),
    enabled: isOpen && !!taskId,
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: (completed) => tasksApi.update(taskId, { task: { completed, completed_at: completed ? new Date().toISOString() : null } }),
    onSuccess: () => { queryClient.invalidateQueries(['tasks']); queryClient.invalidateQueries(['task', taskId]); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(taskId),
    onSuccess: () => { queryClient.invalidateQueries(['tasks']); closeViewModal(); },
  });

  const formatDate = (ds) => new Date(ds).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formatDateTime = (ds) => new Date(ds).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

  const getDueDateInfo = (dueDate) => {
    if (!dueDate) return null;
    const due = parseLocalDate(dueDate); const today = getToday();
    const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: 'Overdue', isOverdue: true };
    if (diff === 0) return { text: 'Due today', isToday: true };
    if (diff <= 7) return { text: `Due in ${diff} day${diff > 1 ? 's' : ''}` };
    return { text: `Due ${formatDate(dueDate)}` };
  };

  const labelStyle = { display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' };

  const renderContent = () => {
    if (isLoading) return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ink-faint)' }} />
      </div>
    );
    if (error) return <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--overdue)' }}><p className="v2-small">Error loading task: {error.message}</p></div>;
    if (!task) return null;

    const dueInfo = getDueDateInfo(task.due_date);

    return (
      <div className="space-y-5">
        {/* Name + checkbox */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => toggleCompleteMutation.mutate(!task.completed)}
            disabled={toggleCompleteMutation.isPending}
            style={{
              marginTop: 4, width: 20, height: 20, borderRadius: 4, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${task.completed ? 'var(--ink)' : 'var(--border-hover)'}`,
              background: task.completed ? 'var(--ink)' : 'transparent',
              cursor: 'pointer', padding: 0,
            }}
          >
            {toggleCompleteMutation.isPending
              ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.5rem', color: 'var(--ink-tertiary)' }} />
              : <i className="fa-solid fa-check" style={{ fontSize: '0.6rem', color: 'var(--check-ink)', opacity: task.completed ? 1 : 0 }} />
            }
          </button>
          <h2 className="v2-h2" style={{ textDecoration: task.completed ? 'line-through' : 'none', textDecorationColor: 'var(--ink-faint)', opacity: task.completed ? 0.6 : 1 }}>
            {task.name}
          </h2>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {task.category && (
            <span className="v2-badge" style={{ background: `${task.category.color}15`, color: task.category.color, padding: '3px 10px' }}>
              <i className={`fa-solid ${task.category.icon}`} style={{ fontSize: '0.6rem', marginRight: 4 }} />
              {task.category.name}
            </span>
          )}
          {task.importance_level && (
            <span className="v2-badge" style={{ background: `${task.importance_level.color}15`, color: task.importance_level.color, padding: '3px 10px' }}>
              {task.importance_level.name}
            </span>
          )}
          {dueInfo && (
            <span className="v2-badge" style={{
              padding: '3px 10px',
              ...(dueInfo.isOverdue ? { background: 'var(--overdue-bg)', color: 'var(--overdue)' } :
                 dueInfo.isToday ? { background: 'var(--hover-tint-strong)', color: 'var(--ink)' } :
                 { background: 'var(--hover-tint)', color: 'var(--ink-secondary)' }),
            }}>
              {dueInfo.text}
            </span>
          )}
          {task.on_hold && <span className="v2-badge v2-badge-neutral" style={{ padding: '3px 10px' }}>On Hold</span>}
          {task.completed && task.completed_at && (
            <span className="v2-badge v2-badge-neutral" style={{ padding: '3px 10px' }}>Completed {formatDateTime(task.completed_at)}</span>
          )}
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div>
            <label style={labelStyle}>Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map(tag => (
                <span key={tag.id} className="v2-badge v2-badge-neutral" style={{ padding: '3px 10px' }}>
                  <i className="fa-solid fa-tag" style={{ fontSize: '0.55rem', marginRight: 3 }} />{tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Due Date detail */}
        {task.due_date && (
          <div>
            <label style={labelStyle}>Due Date</label>
            <p className="v2-body">{formatDate(task.due_date)}{task.due_time && ` at ${task.due_time}`}</p>
          </div>
        )}

        {/* URL */}
        {task.url && (
          <div>
            <label style={labelStyle}>URL</label>
            <a href={task.url} target="_blank" rel="noopener noreferrer" className="v2-small" style={{ color: 'var(--ink-secondary)' }}>
              <i className="fa-solid fa-external-link" style={{ marginRight: 4, fontSize: '0.65rem' }} />{task.url}
            </a>
          </div>
        )}

        {/* Location */}
        {task.location_name && (
          <div>
            <label style={labelStyle}>Location</label>
            <p className="v2-body">
              <i className="fa-solid fa-location-dot" style={{ marginRight: 6, color: 'var(--ink-tertiary)', fontSize: '0.75rem' }} />
              {task.location_name}
            </p>
          </div>
        )}

        {/* Notes */}
        {task.notes && (
          <div>
            <label style={labelStyle}>Notes</label>
            <div className="prose max-w-none trix-content" style={task.category?.color ? { '--heading-color': task.category.color } : undefined}
              dangerouslySetInnerHTML={{ __html: task.notes || '' }} />
          </div>
        )}

        {/* Created */}
        <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <p className="v2-caption" style={{ color: 'var(--ink-faint)' }}>Created {formatDateTime(task.created_at)}</p>
        </div>
      </div>
    );
  };

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={closeViewModal}
      title="Task Details"
      footer={
        <>
          <button onClick={() => { if (window.confirm('Delete this task?')) deleteMutation.mutate(); }} className="v2-btn v2-btn-danger" disabled={deleteMutation.isPending} style={{ marginRight: 'auto' }}>
            {deleteMutation.isPending ? <i className="fa-solid fa-spinner fa-spin" /> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>}
            Delete
          </button>
          <button onClick={() => { closeViewModal(); openEditModal(taskId); }} className="v2-btn v2-btn-secondary">Edit</button>
          <button onClick={closeViewModal} className="v2-btn v2-btn-primary">Close</button>
        </>
      }
    >
      {renderContent()}
    </SlideOverPanel>
  );
};

export default TaskViewModal;
