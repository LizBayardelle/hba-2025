import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { settingsApi } from '../../../utils/api';
import IconPicker, { TIME_BLOCK_ICONS } from '../shared/IconPicker';

function SortableBlockRow({ block, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.85 : 1,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
    >
      <button
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        style={{ color: 'var(--ink-faint)' }}
        tabIndex={-1}
      >
        <i className="fa-solid fa-grip-vertical text-xs"></i>
      </button>

      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
        style={{ background: block.color }}
        onClick={() => onEdit(block)}
      >
        <i className={`fa-solid ${block.icon} text-white`} style={{ fontSize: '13px' }}></i>
      </div>
      <span className="v2-body flex-1 cursor-pointer" style={{ color: 'var(--ink)' }} onClick={() => onEdit(block)}>{block.name}</span>
      <button
        onClick={() => onEdit(block)}
        className="v2-btn-icon"
        style={{ color: 'var(--ink-tertiary)' }}
      >
        <i className="fa-solid fa-pen text-xs"></i>
      </button>
      <button
        onClick={() => onDelete(block.id)}
        className="v2-btn-icon"
        style={{ color: 'var(--ink-tertiary)' }}
      >
        <i className="fa-solid fa-trash text-xs"></i>
      </button>
    </div>
  );
}

export default function TimeBlocksStep({ goNext, goBack }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', icon: 'fa-clock', color: '#6B8A99' });
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['setup-time-blocks'],
    queryFn: settingsApi.fetchTimeBlocks,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['setup-time-blocks'] });

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(blocks, oldIndex, newIndex);

    queryClient.setQueryData(['setup-time-blocks'], reordered);
    settingsApi.reorderTimeBlocks(reordered.map((b) => b.id)).catch(() => invalidate());
  }, [blocks, queryClient]);

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await settingsApi.updateTimeBlock(editingId, formData);
      } else {
        const maxRank = Math.max(0, ...blocks.map(b => b.rank || 0));
        await settingsApi.createTimeBlock({ ...formData, rank: maxRank + 1 });
      }
      await invalidate();
      resetForm();
    } catch (e) {}
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await settingsApi.deleteTimeBlock(id);
      await invalidate();
    } catch (e) {}
  };

  const startEdit = (block) => {
    setEditingId(block.id);
    setFormData({ name: block.name, icon: block.icon || 'fa-clock', color: block.color || '#6B8A99' });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', icon: 'fa-clock', color: '#6B8A99' });
  };

  return (
    <div>
      <h1 className="v2-h1 mb-2" style={{ color: 'var(--ink)' }}>Time Blocks</h1>
      <p className="v2-body mb-6" style={{ color: 'var(--ink-secondary)' }}>
        Time blocks help you organize your day. Assign habits to morning, afternoon, or evening —
        or create your own blocks that match your schedule.
      </p>

      {/* Current blocks with drag-and-drop */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="v2-h3" style={{ color: 'var(--ink)' }}>Your time blocks</h2>
          {blocks.length > 1 && (
            <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>
              <i className="fa-solid fa-grip-vertical mr-1"></i>Drag to reorder
            </span>
          )}
        </div>
        {isLoading ? (
          <div className="py-4 text-center">
            <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--ink-tertiary)' }}></i>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {blocks.map((block) => (
                  <SortableBlockRow
                    key={block.id}
                    block={block}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add/Edit form */}
      {!showForm ? (
        <button
          type="button"
          onClick={() => { resetForm(); setShowForm(true); }}
          className="v2-btn v2-btn-secondary text-sm mb-8"
        >
          <i className="fa-solid fa-plus mr-2"></i>Add time block
        </button>
      ) : (
        <div className="v2-card p-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="v2-h3" style={{ color: 'var(--ink)' }}>
              {editingId ? 'Edit time block' : 'New time block'}
            </span>
            <button onClick={resetForm} className="v2-btn-icon" style={{ color: 'var(--ink-tertiary)' }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="v2-small font-medium block mb-1" style={{ color: 'var(--ink-secondary)' }}>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Early Morning, Lunch Break"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
              autoFocus
            />
          </div>

          {/* Icon */}
          <div className="mb-4">
            <label className="v2-small font-medium block mb-2" style={{ color: 'var(--ink-secondary)' }}>Icon</label>
            <div className="max-h-48 overflow-y-auto rounded-lg p-2" style={{ border: '1px solid var(--border)' }}>
              <IconPicker
                icons={TIME_BLOCK_ICONS}
                selectedIcon={formData.icon}
                onSelect={(icon) => setFormData(prev => ({ ...prev, icon }))}
                columns={10}
              />
            </div>
          </div>

          {/* Color */}
          <div className="mb-4">
            <label className="v2-small font-medium block mb-2" style={{ color: 'var(--ink-secondary)' }}>Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
              />
              <span className="v2-small font-mono" style={{ color: 'var(--ink-tertiary)' }}>
                {formData.color}
              </span>
            </div>
          </div>

          {/* Preview */}
          <div className="mb-4 flex items-center gap-2">
            <span className="v2-small" style={{ color: 'var(--ink-tertiary)' }}>Preview:</span>
            <div
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ background: formData.color }}
            >
              <i className={`fa-solid ${formData.icon} text-white`} style={{ fontSize: '11px' }}></i>
            </div>
            <span className="v2-small font-medium" style={{ color: 'var(--ink)' }}>{formData.name || 'Time Block'}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
              className="v2-btn v2-btn-primary text-sm"
            >
              {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : editingId ? 'Save changes' : 'Add block'}
            </button>
            <button onClick={resetForm} className="v2-btn v2-btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button onClick={goBack} className="v2-btn v2-btn-ghost">
          <i className="fa-solid fa-arrow-left mr-2 text-xs"></i>Back
        </button>
        <button onClick={goNext} className="v2-btn v2-btn-primary">
          Next: Calendar
          <i className="fa-solid fa-arrow-right ml-2 text-xs"></i>
        </button>
      </div>
    </div>
  );
}
