import React, { useState, useEffect } from 'react';

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none',
};
const inputSmStyle = { ...inputStyle, padding: '6px 10px', fontSize: '0.833rem' };

const TaskDetailModal = ({ task, section, parentTask, project, sections, onUpdate, onDelete, onCreateSubtask, onClose }) => {
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description || '');
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [dirty, setDirty] = useState(false);

  // Track if form is dirty
  useEffect(() => {
    setDirty(name !== task.name || description !== (task.description || '') || dueDate !== (task.due_date || ''));
  }, [name, description, dueDate, task]);

  const handleSave = () => {
    const updates = {};
    if (name !== task.name) updates.name = name;
    if (description !== (task.description || '')) updates.description = description;
    if (dueDate !== (task.due_date || '')) updates.due_date = dueDate || null;
    if (Object.keys(updates).length > 0) onUpdate(updates);
  };

  // Auto-save on close if dirty
  const handleClose = () => {
    if (dirty) handleSave();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-start justify-center z-50 p-4 pt-20"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="v2-card"
        style={{ padding: 0, width: '100%', maxWidth: 560, maxHeight: 'calc(100vh - 120px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => onUpdate({ completed: !task.completed })}
            style={{
              width: 20, height: 20, borderRadius: 5, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${task.completed ? project.color : 'var(--border-hover)'}`,
              background: task.completed ? project.color : 'transparent',
              cursor: 'pointer', padding: 0, transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-check" style={{ fontSize: '0.5rem', color: '#fff', opacity: task.completed ? 1 : 0 }} />
          </button>
          <div style={{ flex: 1 }}>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); handleSave(); } }}
              style={{ ...inputStyle, border: 'none', padding: '0', fontSize: '1.05rem', fontWeight: 600, background: 'transparent' }}
            />
          </div>
          <button onClick={handleClose} className="v2-btn-icon-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
          {/* Meta info */}
          <div className="flex flex-wrap gap-x-6 gap-y-2" style={{ marginBottom: 16 }}>
            <div>
              <span className="v2-caption" style={{ color: 'var(--ink-faint)', display: 'block', marginBottom: 2 }}>Section</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.833rem', color: 'var(--ink-secondary)' }}>{section.name}</span>
            </div>
            {parentTask && (
              <div>
                <span className="v2-caption" style={{ color: 'var(--ink-faint)', display: 'block', marginBottom: 2 }}>Parent</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.833rem', color: 'var(--ink-secondary)' }}>{parentTask.name}</span>
              </div>
            )}
            <div>
              <span className="v2-caption" style={{ color: 'var(--ink-faint)', display: 'block', marginBottom: 2 }}>Due Date</span>
              <input
                type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                style={{ ...inputSmStyle, width: 'auto', padding: '2px 8px' }}
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <span className="v2-caption" style={{ color: 'var(--ink-faint)', display: 'block', marginBottom: 4 }}>Description</span>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
              placeholder="Add a description..."
              rows={3}
            />
          </div>

          {/* Subtasks (only for top-level tasks) */}
          {!parentTask && (
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>
                  Subtasks
                  {task.subtasks && task.subtasks.length > 0 && (
                    <span style={{ marginLeft: 6 }}>{task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}</span>
                  )}
                </span>
              </div>

              {/* Subtask progress bar */}
              {task.subtasks && task.subtasks.length > 0 && (
                <div style={{ width: '100%', height: 3, borderRadius: 2, background: 'var(--border)', marginBottom: 8 }}>
                  <div style={{
                    width: `${(task.subtasks.filter((s) => s.completed).length / task.subtasks.length) * 100}%`,
                    height: '100%', borderRadius: 2, background: project.color, transition: 'width 0.3s ease',
                  }} />
                </div>
              )}

              {/* Subtask list */}
              <div className="space-y-1" style={{ marginBottom: 8 }}>
                {task.subtasks?.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2.5 py-1 group/sub">
                    <button
                      onClick={() => onUpdate.call ? null : null}
                      style={{
                        width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1.5px solid ${sub.completed ? 'var(--ink)' : 'var(--border-hover)'}`,
                        background: sub.completed ? 'var(--ink)' : 'transparent',
                        cursor: 'pointer', padding: 0,
                      }}
                    >
                      <i className="fa-solid fa-check" style={{ fontSize: '0.4rem', color: 'var(--check-ink)', opacity: sub.completed ? 1 : 0 }} />
                    </button>
                    <span style={{
                      flex: 1, fontFamily: 'var(--font-body)', fontSize: '0.833rem', color: 'var(--ink)',
                      textDecoration: sub.completed ? 'line-through' : 'none', opacity: sub.completed ? 0.5 : 1,
                    }}>{sub.name}</span>
                  </div>
                ))}
              </div>

              {/* Add subtask */}
              <div className="flex gap-2">
                <input
                  type="text" value={newSubtaskName} onChange={(e) => setNewSubtaskName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSubtaskName.trim()) { onCreateSubtask(newSubtaskName.trim()); setNewSubtaskName(''); }
                  }}
                  style={{ ...inputSmStyle, flex: 1 }} placeholder="Add a subtask..."
                />
                {newSubtaskName.trim() && (
                  <button onClick={() => { onCreateSubtask(newSubtaskName.trim()); setNewSubtaskName(''); }} className="v2-btn-sm v2-btn-primary">Add</button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => { onDelete(); }}
            style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--overdue)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
            className="hover:bg-[var(--hover-tint)]"
          >
            <i className="fa-solid fa-trash" style={{ marginRight: 4, fontSize: '0.65rem' }} />Archive task
          </button>
          {dirty && (
            <button onClick={handleSave} className="v2-btn-sm v2-btn-primary">Save changes</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
