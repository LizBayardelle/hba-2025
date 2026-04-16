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
import IconPicker, { IMPORTANCE_ICONS } from '../shared/IconPicker';

const PRESETS = [
  {
    name: 'Simple',
    description: 'Clean and straightforward',
    levels: [
      { name: 'High', icon: 'fa-angle-up', color: '#D4A017' },
      { name: 'Normal', icon: 'fa-circle', color: '#4A8C5C' },
      { name: 'Low', icon: 'fa-angle-down', color: '#3F6EB5' },
    ],
    optional: { icon: 'fa-minus', color: '#C7C7CC' },
  },
  {
    name: 'Personality',
    description: 'A little more fun',
    levels: [
      { name: 'On Fire', icon: 'fa-fire', color: '#E84430' },
      { name: 'Lightly Smouldering', icon: 'fa-fire-flame-curved', color: '#E8943A' },
      { name: 'Not Dire Yet', icon: 'fa-mug-hot', color: '#5BAD70' },
    ],
    optional: { icon: 'fa-minus', color: '#A8A8A8' },
  },
];

function SortableLevelRow({ level, onEdit, onDelete }) {
  const isOpt = level.name === 'Optional';
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: level.id });

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
        style={{ background: level.color }}
        onClick={() => onEdit(level)}
      >
        <i className={`fa-solid ${level.icon} text-white`} style={{ fontSize: '13px' }}></i>
      </div>
      <span className="v2-body flex-1 cursor-pointer" style={{ color: 'var(--ink)' }} onClick={() => onEdit(level)}>
        {level.name}
        {isOpt && (
          <span className="v2-caption ml-2" style={{ color: 'var(--ink-faint)' }}>(default)</span>
        )}
      </span>
      <button
        onClick={() => onEdit(level)}
        className="v2-btn-icon"
        style={{ color: 'var(--ink-tertiary)' }}
      >
        <i className="fa-solid fa-pen text-xs"></i>
      </button>
      {!isOpt && (
        <button
          onClick={() => onDelete(level.id)}
          className="v2-btn-icon"
          style={{ color: 'var(--ink-tertiary)' }}
        >
          <i className="fa-solid fa-trash text-xs"></i>
        </button>
      )}
    </div>
  );
}

export default function ImportanceLevelsStep({ goNext, goBack }) {
  const queryClient = useQueryClient();
  const [applying, setApplying] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', icon: 'fa-circle', color: '#8E8E93' });
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: levels = [], isLoading } = useQuery({
    queryKey: ['setup-importance-levels'],
    queryFn: settingsApi.fetchImportanceLevels,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['setup-importance-levels'] });

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = levels.findIndex((l) => l.id === active.id);
    const newIndex = levels.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(levels, oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData(['setup-importance-levels'], reordered);

    // Persist
    settingsApi.reorderImportanceLevels(reordered.map((l) => l.id)).catch(() => invalidate());
  }, [levels, queryClient]);

  const applyPreset = async (preset) => {
    setApplying(true);
    try {
      for (const level of levels) {
        if (level.name !== 'Optional') {
          await settingsApi.deleteImportanceLevel(level.id);
        }
      }

      for (let i = 0; i < preset.levels.length; i++) {
        await settingsApi.createImportanceLevel({
          ...preset.levels[i],
          rank: i + 1,
        });
      }

      const optionalLevel = levels.find(l => l.name === 'Optional');
      if (optionalLevel) {
        await settingsApi.updateImportanceLevel(optionalLevel.id, {
          icon: preset.optional.icon,
          color: preset.optional.color,
        });
      }

      await invalidate();
    } catch (e) {}
    setApplying(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await settingsApi.updateImportanceLevel(editingId, formData);
      } else {
        const maxRank = Math.max(0, ...levels.map(l => l.rank || 0));
        await settingsApi.createImportanceLevel({ ...formData, rank: maxRank + 1 });
      }
      await invalidate();
      resetForm();
    } catch (e) {}
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await settingsApi.deleteImportanceLevel(id);
      await invalidate();
    } catch (e) {}
  };

  const startEdit = (level) => {
    setEditingId(level.id);
    setFormData({ name: level.name, icon: level.icon || 'fa-circle', color: level.color || '#8E8E93' });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', icon: 'fa-circle', color: '#8E8E93' });
  };

  return (
    <div>
      <h1 className="v2-h1 mb-2" style={{ color: 'var(--ink)' }}>Importance Levels</h1>
      <p className="v2-body mb-6" style={{ color: 'var(--ink-secondary)' }}>
        Importance levels help you prioritize. They show up as colored badges on habits and tasks.
        "Optional" is always present — optional items are treated differently (they won't affect your streaks).
      </p>

      {/* Preset cards */}
      <div className="mb-8">
        <h2 className="v2-h3 mb-3" style={{ color: 'var(--ink)' }}>Choose a scheme</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              disabled={applying}
              onClick={() => applyPreset(preset)}
              className="v2-card p-4 text-left transition-colors hover:border-current"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="v2-h3" style={{ color: 'var(--ink)' }}>{preset.name}</span>
                {applying && <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--ink-tertiary)' }}></i>}
              </div>
              <p className="v2-small mb-3" style={{ color: 'var(--ink-tertiary)' }}>{preset.description}</p>
              <div className="space-y-1.5">
                {[...preset.levels, { name: 'Optional', ...preset.optional }].map((level) => (
                  <div key={level.name} className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={{ background: level.color }}
                    >
                      <i className={`fa-solid ${level.icon} text-white`} style={{ fontSize: '9px' }}></i>
                    </div>
                    <span className="v2-small" style={{ color: 'var(--ink-secondary)' }}>{level.name}</span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Current levels with drag-and-drop */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="v2-h3" style={{ color: 'var(--ink)' }}>Your importance levels</h2>
          <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>
            <i className="fa-solid fa-grip-vertical mr-1"></i>Drag to reorder
          </span>
        </div>
        {isLoading ? (
          <div className="py-4 text-center">
            <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--ink-tertiary)' }}></i>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={levels.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {levels.map((level) => (
                  <SortableLevelRow
                    key={level.id}
                    level={level}
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
          <i className="fa-solid fa-plus mr-2"></i>Add level
        </button>
      ) : (
        <div className="v2-card p-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="v2-h3" style={{ color: 'var(--ink)' }}>
              {editingId ? 'Edit level' : 'New level'}
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
              disabled={editingId && levels.find(l => l.id === editingId)?.name === 'Optional'}
              placeholder="e.g., Critical, High, Medium"
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
                icons={IMPORTANCE_ICONS}
                selectedIcon={formData.icon}
                onSelect={(icon) => setFormData(prev => ({ ...prev, icon }))}
                columns={12}
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
            <span className="v2-small font-medium" style={{ color: 'var(--ink)' }}>{formData.name || 'Level'}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
              className="v2-btn v2-btn-primary text-sm"
            >
              {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : editingId ? 'Save changes' : 'Add level'}
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
          Next: Time Blocks
          <i className="fa-solid fa-arrow-right ml-2 text-xs"></i>
        </button>
      </div>
    </div>
  );
}
