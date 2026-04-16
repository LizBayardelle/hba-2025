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
import { categoriesApi } from '../../../utils/api';
import IconPicker, { CATEGORY_ICONS } from '../shared/IconPicker';

// Inspiration schemes (display only, not click-to-apply)
const SAMPLE_SCHEMES = [
  {
    prompt: 'If you\'re a student...',
    categories: [
      { name: 'Classes', icon: 'fa-book', color: '#F8796D' },
      { name: 'Study', icon: 'fa-brain', color: '#E5C730' },
      { name: 'Campus Life', icon: 'fa-users', color: '#7CB342' },
      { name: 'Fitness', icon: 'fa-dumbbell', color: '#22D3EE' },
      { name: 'Self Care', icon: 'fa-mug-hot', color: '#A78BFA' },
    ],
  },
  {
    prompt: 'Focusing on wellness...',
    categories: [
      { name: 'Movement', icon: 'fa-person-running', color: '#7E57C2' },
      { name: 'Rest', icon: 'fa-bed', color: '#3F51B5' },
      { name: 'Mindfulness', icon: 'fa-brain', color: '#42A5F5' },
      { name: 'Social', icon: 'fa-heart', color: '#26A69A' },
      { name: 'Nutrition', icon: 'fa-apple-whole', color: '#66BB6A' },
    ],
  },
  {
    prompt: 'Juggling work & life...',
    categories: [
      { name: 'Deep Work', icon: 'fa-brain', color: '#7BA3B5' },
      { name: 'Admin', icon: 'fa-check', color: '#A3B0B8' },
      { name: 'Home', icon: 'fa-heart', color: '#B8A08E' },
      { name: 'Health', icon: 'fa-dumbbell', color: '#8EA88A' },
      { name: 'Creative', icon: 'fa-paintbrush', color: '#9E8EB5' },
    ],
  },
];

// Starter packs (click to apply)
const STARTER_PACKS = [
  {
    name: 'Balanced',
    description: 'A well-rounded mix for daily life',
    categories: [
      { name: 'Work', icon: 'fa-briefcase', color: '#6366F1' },
      { name: 'Home', icon: 'fa-heart', color: '#FB7185' },
      { name: 'Health', icon: 'fa-dumbbell', color: '#7CB342' },
      { name: 'Personal', icon: 'fa-star', color: '#E5C730' },
      { name: 'Creative', icon: 'fa-paintbrush', color: '#A78BFA' },
    ],
  },
  {
    name: 'Student',
    description: 'Designed for school and campus life',
    categories: [
      { name: 'Classes', icon: 'fa-book', color: '#6366F1' },
      { name: 'Study', icon: 'fa-brain', color: '#A78BFA' },
      { name: 'Fitness', icon: 'fa-person-running', color: '#7CB342' },
      { name: 'Social', icon: 'fa-users', color: '#FFA07A' },
    ],
  },
  {
    name: 'Wellness',
    description: 'Focus on health and self-care',
    categories: [
      { name: 'Exercise', icon: 'fa-dumbbell', color: '#7CB342' },
      { name: 'Nutrition', icon: 'fa-apple-whole', color: '#FFA07A' },
      { name: 'Sleep', icon: 'fa-bed', color: '#6366F1' },
      { name: 'Mindfulness', icon: 'fa-brain', color: '#A78BFA' },
    ],
  },
];

function SortableCategoryRow({ category, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

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
      {/* Drag handle */}
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
        style={{ background: `${category.color}20` }}
        onClick={() => onEdit(category)}
      >
        <i className={`fa-solid ${category.icon}`} style={{ color: category.color, fontSize: '14px' }}></i>
      </div>
      <span className="v2-body flex-1 cursor-pointer" style={{ color: 'var(--ink)' }} onClick={() => onEdit(category)}>{category.name}</span>
      <button
        onClick={() => onEdit(category)}
        className="v2-btn-icon"
        style={{ color: 'var(--ink-tertiary)' }}
      >
        <i className="fa-solid fa-pen text-xs"></i>
      </button>
      <button
        onClick={() => onDelete(category.id)}
        className="v2-btn-icon"
        style={{ color: 'var(--ink-tertiary)' }}
      >
        <i className="fa-solid fa-trash text-xs"></i>
      </button>
    </div>
  );
}

export default function CategoriesStep({ goNext, goBack }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', icon: 'fa-check', color: '#6B8A99' });
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: categories = [] } = useQuery({
    queryKey: ['setup-categories'],
    queryFn: categoriesApi.fetchAll,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['setup-categories'] });

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData(['setup-categories'], reordered);

    // Persist
    categoriesApi.reorder(reordered.map((c) => c.id)).catch(() => invalidate());
  }, [categories, queryClient]);

  const applyStarterPack = async (pack) => {
    setApplying(true);
    try {
      for (const cat of pack.categories) {
        await categoriesApi.create(cat);
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
        await categoriesApi.update(editingId, formData);
      } else {
        await categoriesApi.create(formData);
      }
      await invalidate();
      resetForm();
    } catch (e) {}
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await categoriesApi.delete(id);
      await invalidate();
    } catch (e) {}
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, icon: cat.icon || 'fa-check', color: cat.color || '#6B8A99' });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', icon: 'fa-check', color: '#6B8A99' });
  };

  const hasCategories = categories.length > 0;

  return (
    <div>
      <h1 className="v2-h1 mb-2" style={{ color: 'var(--ink)' }}>Categories</h1>
      <p className="v2-body mb-6" style={{ color: 'var(--ink-secondary)' }}>
        Categories help you organize habits, tasks, and goals. They're color-coded throughout the app
        so you can quickly see what belongs where.
      </p>

      {/* Sample schemes - always visible as inspiration */}
      <div className="mb-8">
        <p className="v2-small mb-3" style={{ color: 'var(--ink-tertiary)' }}>
          Here are a few ways people organize their categories:
        </p>
        <div className="grid grid-cols-3 gap-3">
          {SAMPLE_SCHEMES.map((scheme) => (
            <div
              key={scheme.prompt}
              className="rounded-xl p-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <span className="v2-small font-medium block mb-2.5" style={{ color: 'var(--ink-secondary)', fontStyle: 'italic' }}>
                {scheme.prompt}
              </span>
              <div className="space-y-1.5">
                {scheme.categories.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={{ background: cat.color }}
                    >
                      <i className={`fa-solid ${cat.icon} text-white`} style={{ fontSize: '9px' }}></i>
                    </div>
                    <span className="v2-caption" style={{ color: 'var(--ink-secondary)' }}>{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Starter packs - show only if no categories yet */}
      {!hasCategories && !showForm && (
        <div className="mb-8">
          <h2 className="v2-h3 mb-3" style={{ color: 'var(--ink)' }}>Quick start with a pack</h2>
          <div className="grid gap-3">
            {STARTER_PACKS.map((pack) => (
              <button
                key={pack.name}
                type="button"
                disabled={applying}
                onClick={() => applyStarterPack(pack)}
                className="v2-card p-4 text-left transition-colors hover:border-current"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="v2-h3" style={{ color: 'var(--ink)' }}>{pack.name}</span>
                  {applying && <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--ink-tertiary)' }}></i>}
                </div>
                <p className="v2-small mb-2" style={{ color: 'var(--ink-tertiary)' }}>{pack.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {pack.categories.map((cat) => (
                    <span
                      key={cat.name}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                      style={{ background: `${cat.color}20`, color: cat.color }}
                    >
                      <i className={`fa-solid ${cat.icon}`} style={{ fontSize: '9px' }}></i>
                      {cat.name}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="v2-btn v2-btn-ghost text-sm"
              style={{ color: 'var(--ink-secondary)' }}
            >
              Or start from scratch
            </button>
          </div>
        </div>
      )}

      {/* Current categories list with drag-and-drop */}
      {hasCategories && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="v2-h3" style={{ color: 'var(--ink)' }}>Your categories</h2>
            <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>
              <i className="fa-solid fa-grip-vertical mr-1"></i>Drag to reorder
            </span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <SortableCategoryRow
                    key={cat.id}
                    category={cat}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Add/Edit form */}
      {(showForm || hasCategories) && (
        <div className="mb-8">
          {!showForm && (
            <button
              type="button"
              onClick={() => { resetForm(); setShowForm(true); }}
              className="v2-btn v2-btn-secondary text-sm"
            >
              <i className="fa-solid fa-plus mr-2"></i>Add category
            </button>
          )}

          {showForm && (
            <div className="v2-card p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="v2-h3" style={{ color: 'var(--ink)' }}>
                  {editingId ? 'Edit category' : 'New category'}
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
                  placeholder="e.g., Work, Health, Personal"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
                  autoFocus
                />
              </div>

              {/* Icon */}
              <div className="mb-4">
                <label className="v2-small font-medium block mb-2" style={{ color: 'var(--ink-secondary)' }}>Icon</label>
                <IconPicker
                  icons={CATEGORY_ICONS}
                  selectedIcon={formData.icon}
                  onSelect={(icon) => setFormData(prev => ({ ...prev, icon }))}
                  columns={9}
                />
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
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: `${formData.color}20`, color: formData.color }}
                >
                  <i className={`fa-solid ${formData.icon}`} style={{ fontSize: '10px' }}></i>
                  {formData.name || 'Category'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.name.trim()}
                  className="v2-btn v2-btn-primary text-sm"
                >
                  {saving ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : editingId ? 'Save changes' : 'Add category'}
                </button>
                <button onClick={resetForm} className="v2-btn v2-btn-ghost text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button onClick={goBack} className="v2-btn v2-btn-ghost">
          <i className="fa-solid fa-arrow-left mr-2 text-xs"></i>Back
        </button>
        <div className="flex gap-2">
          {!hasCategories && (
            <button onClick={goNext} className="v2-btn v2-btn-ghost" style={{ color: 'var(--ink-tertiary)' }}>
              Skip
            </button>
          )}
          <button onClick={goNext} className="v2-btn v2-btn-primary">
            Next: Importance
            <i className="fa-solid fa-arrow-right ml-2 text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
