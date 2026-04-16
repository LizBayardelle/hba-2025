import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../../../utils/api';
import IconPicker, { CATEGORY_ICONS } from '../shared/IconPicker';

export default function ProjectsStep({ goNext, goBack }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', icon: 'fa-briefcase', color: '#6B8A99' });
  const [saving, setSaving] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['setup-projects'],
    queryFn: projectsApi.fetchAll,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['setup-projects'] });

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await projectsApi.update(editingId, formData);
      } else {
        await projectsApi.create(formData);
      }
      await invalidate();
      resetForm();
    } catch (e) {}
    setSaving(false);
  };

  const startEdit = (project) => {
    setEditingId(project.id);
    setFormData({
      name: project.name,
      description: project.description || '',
      icon: project.icon || 'fa-briefcase',
      color: project.color || '#6B8A99',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await projectsApi.delete(id);
      await invalidate();
    } catch (e) {}
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', description: '', icon: 'fa-briefcase', color: '#6B8A99' });
  };

  const hasProjects = projects.length > 0;

  return (
    <div>
      <h1 className="v2-h1 mb-2" style={{ color: 'var(--ink)' }}>Projects</h1>
      <p className="v2-body mb-2" style={{ color: 'var(--ink-secondary)' }}>
        Projects let you organize work, like clients, side gigs, or big initiatives.
        Each project can have sections and tasks, similar to tools like Asana or Trello.
      </p>
      <p className="v2-small mb-6" style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>
        This is totally optional. You can always add projects later.
      </p>

      {/* Current projects */}
      {hasProjects && (
        <div className="mb-6">
          <h2 className="v2-h3 mb-3" style={{ color: 'var(--ink)' }}>Your projects</h2>
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
                  style={{ background: project.color }}
                  onClick={() => startEdit(project)}
                >
                  <i className={`fa-solid ${project.icon} text-white`} style={{ fontSize: '13px' }}></i>
                </div>
                <div className="flex-1 cursor-pointer" onClick={() => startEdit(project)}>
                  <span className="v2-body" style={{ color: 'var(--ink)' }}>{project.name}</span>
                  {project.description && (
                    <p className="v2-caption" style={{ color: 'var(--ink-tertiary)' }}>{project.description}</p>
                  )}
                </div>
                <button
                  onClick={() => startEdit(project)}
                  className="v2-btn-icon"
                  style={{ color: 'var(--ink-tertiary)' }}
                >
                  <i className="fa-solid fa-pen text-xs"></i>
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="v2-btn-icon"
                  style={{ color: 'var(--ink-tertiary)' }}
                >
                  <i className="fa-solid fa-trash text-xs"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="v2-btn v2-btn-secondary text-sm mb-8"
        >
          <i className="fa-solid fa-plus mr-2"></i>Create a project
        </button>
      ) : (
        <div className="v2-card p-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="v2-h3" style={{ color: 'var(--ink)' }}>
              {editingId ? 'Edit project' : 'New project'}
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
              placeholder="e.g., Client Website, Side Hustle"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="v2-small font-medium block mb-1" style={{ color: 'var(--ink-secondary)' }}>Description (optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What's this project about?"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
            />
          </div>

          {/* Icon */}
          <div className="mb-4">
            <label className="v2-small font-medium block mb-2" style={{ color: 'var(--ink-secondary)' }}>Icon</label>
            <div className="max-h-48 overflow-y-auto rounded-lg p-2" style={{ border: '1px solid var(--border)' }}>
              <IconPicker
                icons={CATEGORY_ICONS}
                selectedIcon={formData.icon}
                onSelect={(icon) => setFormData(prev => ({ ...prev, icon }))}
                columns={9}
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
            <span className="v2-small font-medium" style={{ color: 'var(--ink)' }}>{formData.name || 'Project'}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
              className="v2-btn v2-btn-primary text-sm"
            >
              {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : editingId ? 'Save changes' : 'Create project'}
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
        <div className="flex gap-2">
          {!hasProjects && (
            <button onClick={goNext} className="v2-btn v2-btn-ghost" style={{ color: 'var(--ink-tertiary)' }}>
              Skip
            </button>
          )}
          <button onClick={goNext} className="v2-btn v2-btn-primary">
            Next: Dashboard
            <i className="fa-solid fa-arrow-right ml-2 text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
