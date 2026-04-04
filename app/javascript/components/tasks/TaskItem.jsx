import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../utils/api';
import { parseLocalDate, getToday } from '../../utils/dateUtils';
import useTasksStore from '../../stores/tasksStore';
import useDocumentsStore from '../../stores/documentsStore';
import useListsStore from '../../stores/listsStore';
import ChecklistSection from '../shared/ChecklistSection';

const TaskItem = ({ task, groupBy }) => {
  const queryClient = useQueryClient();
  const { openViewModal, openEditModal } = useTasksStore();
  const { openViewModal: openDocumentModal } = useDocumentsStore();
  const { openShowModal: openListShowModal } = useListsStore();

  const [celebrateKey, setCelebrateKey] = useState(0);

  useEffect(() => {
    if (celebrateKey > 0) {
      const timer = setTimeout(() => setCelebrateKey(0), 600);
      return () => clearTimeout(timer);
    }
  }, [celebrateKey]);

  const toggleCompleteMutation = useMutation({
    mutationFn: (completed) => tasksApi.update(task.id, { task: { completed } }),
    onSuccess: () => queryClient.invalidateQueries(['tasks']),
  });

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    if (!task.completed) setCelebrateKey((k) => k + 1);
    toggleCompleteMutation.mutate(!task.completed);
  };

  // Due date status
  const getDueDateInfo = () => {
    if (!task.due_date) return null;
    const dueDate = parseLocalDate(task.due_date);
    const today = getToday();
    const diff = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: 'Overdue', isOverdue: true };
    if (diff === 0) return { text: 'Today', isToday: true };
    if (diff <= 7) return { text: `${diff}d`, isSoon: true };
    return { text: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
  };

  const dueInfo = getDueDateInfo();

  return (
    <div
      className="task-item flex items-center gap-2.5"
      style={{ transition: 'background 0.1s ease', cursor: 'pointer', opacity: task.completed ? 0.5 : 1 }}
      onClick={() => openViewModal(task.id)}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0 relative" style={{ overflow: 'visible' }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleCheckboxChange}
          disabled={toggleCompleteMutation.isPending}
          style={{
            width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1.5px solid ${task.completed ? 'var(--ink)' : 'var(--border-hover)'}`,
            background: task.completed ? 'var(--ink)' : 'transparent',
            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)', cursor: 'pointer', padding: 0,
          }}
        >
          {toggleCompleteMutation.isPending ? (
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.5rem', color: 'var(--ink-tertiary)' }} />
          ) : (
            <i className="fa-solid fa-check" style={{ fontSize: '0.55rem', color: 'var(--check-ink)', opacity: task.completed ? 1 : 0 }} />
          )}
        </button>
        {celebrateKey > 0 && (
          <div className="absolute inset-0 rounded pointer-events-none"
            style={{ backgroundColor: task.category?.color || 'var(--ink)', animation: 'celebrate-glow 0.55s ease-out forwards' }} />
        )}
      </div>

      {/* Category dot (if not grouped by category) */}
      {task.category && groupBy !== 'category' && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: task.category.color, flexShrink: 0 }} />
      )}

      {/* Name + inline badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--ink)',
            textDecoration: task.completed ? 'line-through' : 'none', textDecorationColor: 'var(--ink-faint)',
            transition: 'color 0.2s ease',
          }}>
            {task.name}
          </span>

          {/* Importance icon */}
          {task.importance_level && groupBy !== 'importance' && (
            <i className={`${task.importance_level.icon} flex-shrink-0`} style={{ color: task.importance_level.color, fontSize: '0.65rem' }} title={task.importance_level.name} />
          )}

          {/* On Hold */}
          {task.on_hold && <span className="v2-badge v2-badge-neutral" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>On Hold</span>}

          {/* Repeat */}
          {task.repeat_frequency && <span className="v2-badge v2-badge-neutral" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
            <i className="fa-solid fa-repeat" style={{ fontSize: '0.5rem', marginRight: 3 }} />{task.repeat_frequency}
          </span>}
        </div>

        {/* Second row badges */}
        <div className="flex flex-wrap items-center gap-1 mt-0.5">
          {task.category && groupBy !== 'category' && (
            <span className="v2-badge v2-badge-neutral" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{task.category.name}</span>
          )}

          {task.time_block && task.time_block.name.toLowerCase() !== 'anytime' && (
            <span className="v2-badge v2-badge-neutral" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{task.time_block.name}</span>
          )}

          {task.document && (
            <button onClick={(e) => { e.stopPropagation(); openDocumentModal(task.document.id); }}
              style={{ color: 'var(--ink-faint)', fontSize: '0.7rem', background: 'none', border: 'none', cursor: 'pointer' }} title={task.document.title}>
              <i className="fa-solid fa-file-alt" />
            </button>
          )}

          {task.tags?.map(tag => (
            <span key={tag.id} className="v2-badge v2-badge-neutral" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{tag.name}</span>
          ))}

          {task.list_attachments?.map(a => (
            <button key={a.list_id} onClick={(e) => { e.stopPropagation(); openListShowModal(a.list_id); }}
              style={{ color: 'var(--ink-faint)', fontSize: '0.7rem', background: 'none', border: 'none', cursor: 'pointer' }} title={a.list_name}>
              <i className="fa-solid fa-list-check" />
            </button>
          ))}

          {task.url && <i className="fa-solid fa-link" style={{ fontSize: '0.6rem', color: 'var(--ink-faint)' }} />}
          {task.location_name && <i className="fa-solid fa-location-dot" style={{ fontSize: '0.6rem', color: 'var(--ink-faint)' }} />}

          {task.checklist_items && task.checklist_items.length > 0 && (
            <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>
              <i className="fa-solid fa-list-check" style={{ fontSize: '0.55rem', marginRight: 2 }} />
              {task.checklist_items.filter(i => i.completed).length}/{task.checklist_items.length}
            </span>
          )}
        </div>

        {/* Inline checklist */}
        {task.checklist_items && task.checklist_items.length > 0 && (
          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 4 }}>
            <ChecklistSection parentType="task" parentId={task.id} items={task.checklist_items}
              color={task.category?.color || 'var(--ink)'} editable={false} compact={true} />
          </div>
        )}
      </div>

      {/* Right side: due date */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {dueInfo && (
          <span style={{
            fontSize: '0.733rem', fontWeight: 500, whiteSpace: 'nowrap',
            ...(dueInfo.isOverdue ? { color: 'var(--overdue)', background: 'var(--overdue-bg)', padding: '1px 7px', borderRadius: 8 } :
               dueInfo.isToday ? { color: 'var(--ink)', fontWeight: 600 } :
               { color: 'var(--ink-tertiary)' }),
          }}>
            {dueInfo.text}
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskItem;
