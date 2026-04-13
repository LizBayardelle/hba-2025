import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SlideOverPanel from '../shared/SlideOverPanel';

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none',
};
const inputSmStyle = { ...inputStyle, padding: '6px 10px', fontSize: '0.833rem' };
const labelStyle = { display: 'block', marginBottom: 4, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-faint)', letterSpacing: '0.02em' };

const SortableSubtaskRow = ({ sub, onUpdate, onDelete }) => {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: sub.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex items-center gap-2.5 py-1 group/sub">
      <div className="flex items-center justify-center cursor-grab active:cursor-grabbing" style={{ color: 'var(--ink-faint)', width: 14 }} {...listeners}>
        <i className="fa-solid fa-grip-vertical" style={{ fontSize: '0.6rem' }} />
      </div>
      <button
        onClick={() => onUpdate({ completed: !sub.completed })}
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
      <button onClick={() => { if (confirm('Archive?')) onDelete(sub.id); }}
        className="v2-btn-icon-sm opacity-0 group-hover/sub:opacity-100 transition-opacity" style={{ width: 18, height: 18 }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  );
};

const TaskDetailModal = ({ task, section, parentTask, project, sections, onUpdate, onDelete, onCreateSubtask, onClose, onSubtaskDragEnd, sensors }) => {
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description || '');
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [dirty, setDirty] = useState(false);

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

  const handleClose = () => {
    if (dirty) handleSave();
    onClose();
  };

  return (
    <SlideOverPanel
      isOpen={true}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-3" style={{ flex: 1 }}>
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
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); handleSave(); } }}
            style={{ ...inputStyle, border: 'none', padding: '0', fontSize: '1.05rem', fontWeight: 600, background: 'transparent', flex: 1 }}
          />
        </div>
      }
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <button
            onClick={() => onDelete()}
            className="v2-btn v2-btn-danger"
          >
            <i className="fa-solid fa-trash" style={{ fontSize: '0.65rem' }} /> Archive
          </button>
          {dirty && <button onClick={handleSave} className="v2-btn v2-btn-primary">Save changes</button>}
        </div>
      }
    >
      {/* Meta */}
      <div className="flex flex-wrap gap-x-6 gap-y-3" style={{ marginBottom: 20 }}>
        <div>
          <span style={labelStyle}>Section</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.867rem', color: 'var(--ink-secondary)' }}>{section.name}</span>
        </div>
        {parentTask && (
          <div>
            <span style={labelStyle}>Parent</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.867rem', color: 'var(--ink-secondary)' }}>{parentTask.name}</span>
          </div>
        )}
        <div>
          <span style={labelStyle}>Due Date</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ ...inputSmStyle, width: 'auto', padding: '4px 10px' }} />
        </div>
      </div>

      {/* Description */}
      <div style={{ marginBottom: 24 }}>
        <span style={labelStyle}>Description</span>
        <textarea
          value={description} onChange={(e) => setDescription(e.target.value)}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
          placeholder="Add a description..."
          rows={4}
        />
      </div>

      {/* Subtasks */}
      {!parentTask && (
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <span style={labelStyle}>
              Subtasks
              {task.subtasks && task.subtasks.length > 0 && (
                <span style={{ marginLeft: 6, fontWeight: 400 }}>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
              )}
            </span>
          </div>

          {/* Progress bar */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div style={{ width: '100%', height: 3, borderRadius: 2, background: 'var(--border)', marginBottom: 10 }}>
              <div style={{
                width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%`,
                height: '100%', borderRadius: 2, background: project.color, transition: 'width 0.3s ease',
              }} />
            </div>
          )}

          {/* Subtask list */}
          {task.subtasks && task.subtasks.length > 0 && onSubtaskDragEnd && sensors ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSubtaskDragEnd}>
              <SortableContext items={task.subtasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1" style={{ marginBottom: 10 }}>
                  {task.subtasks.map(sub => (
                    <SortableSubtaskRow key={sub.id} sub={sub} onUpdate={() => {}} onDelete={() => {}} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-1" style={{ marginBottom: 10 }}>
              {task.subtasks?.map(sub => (
                <div key={sub.id} className="flex items-center gap-2.5 py-1 group/sub">
                  <button
                    onClick={() => {}}
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
          )}

          {/* Add subtask */}
          <div className="flex gap-2">
            <input
              type="text" value={newSubtaskName} onChange={(e) => setNewSubtaskName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newSubtaskName.trim()) { onCreateSubtask(newSubtaskName.trim()); setNewSubtaskName(''); } }}
              style={{ ...inputSmStyle, flex: 1 }} placeholder="Add a subtask..."
            />
            {newSubtaskName.trim() && (
              <button onClick={() => { onCreateSubtask(newSubtaskName.trim()); setNewSubtaskName(''); }} className="v2-btn-sm v2-btn-primary">Add</button>
            )}
          </div>
        </div>
      )}
    </SlideOverPanel>
  );
};

export default TaskDetailModal;
