import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import IconPicker, { CATEGORY_ICONS } from '../setup/shared/IconPicker';
import useProjectsStore from '../../stores/projectsStore';
import { projectsApi } from '../../utils/api';

const PROJECT_COLORS = [
  '#6B8A99', '#9C8B7E', '#F8796D', '#FFA07A',
  '#E5C730', '#A8A356', '#7CB342', '#6EE7B7',
  '#22D3EE', '#6366F1', '#A78BFA', '#E879F9',
  '#FB7185', '#9CA3A8',
];

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)',
  fontSize: '0.9rem', outline: 'none',
};
const labelStyle = {
  display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem',
  fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em',
};

const Section = ({ title, children, isLast = false }) => (
  <div className={!isLast ? 'mb-5' : ''}>
    <div className="v2-card" style={{ padding: 0 }}>
      <div style={{ padding: '10px 18px 6px' }}><span className="v2-section-label">{title}</span></div>
      <div style={{ padding: '0 18px 16px' }}>{children}</div>
    </div>
  </div>
);

const ProjectFormModal = () => {
  const queryClient = useQueryClient();
  const { formModal, closeFormModal } = useProjectsStore();
  const { isOpen, projectId } = formModal;

  const [formData, setFormData] = useState({ name: '', description: '', color: '#9C8B7E', icon: 'fa-folder' });
  const [saveStatus, setSaveStatus] = useState(null);
  const [didChange, setDidChange] = useState(false);
  const savedTimeoutRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.fetchOne(projectId),
    enabled: isOpen && !!projectId,
  });

  useEffect(() => {
    if (project?.project) {
      const p = project.project;
      setFormData({
        name: p.name || '',
        description: p.description || '',
        color: p.color || '#9C8B7E',
        icon: p.icon || 'fa-folder',
      });
      setSaveStatus(null);
      setDidChange(false);
    }
  }, [project, projectId]);

  useEffect(() => () => {
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
  }, []);

  const showSaved = useCallback(() => {
    setSaveStatus('saved');
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = setTimeout(() => setSaveStatus(null), 2000);
  }, []);

  const updateMutation = useMutation({
    mutationFn: (data) => projectsApi.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      showSaved();
    },
    onError: () => setSaveStatus('error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      closeFormModal();
      window.location.reload();
    },
  });

  const queueSave = useCallback((next) => {
    if (!projectId || !next.name.trim()) return;
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    setSaveStatus('saving');
    setDidChange(true);
    debounceTimeoutRef.current = setTimeout(() => updateMutation.mutate(next), 400);
  }, [projectId, updateMutation]);

  const flushSave = useCallback((next) => {
    if (!projectId || !next.name.trim()) return;
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    setSaveStatus('saving');
    setDidChange(true);
    updateMutation.mutate(next);
  }, [projectId, updateMutation]);

  const updateField = (field, value, immediate = false) => {
    const next = { ...formData, [field]: value };
    setFormData(next);
    if (immediate) flushSave(next);
    else queueSave(next);
  };

  const handleDelete = () => {
    if (window.confirm('Archive this project? Tasks and sections inside will also be archived.')) {
      deleteMutation.mutate();
    }
  };

  const handleClose = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      if (formData.name.trim()) updateMutation.mutate(formData);
    }
    closeFormModal();
    if (didChange) window.location.reload();
  };

  const StatusIndicator = () => {
    if (!saveStatus) return null;
    return (
      <span className="v2-caption" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {saveStatus === 'saving' && <><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.6rem' }} /> Saving</>}
        {saveStatus === 'saved' && <><i className="fa-solid fa-check" style={{ fontSize: '0.6rem', color: 'var(--ink-tertiary)' }} /> Saved</>}
        {saveStatus === 'error' && <><i className="fa-solid fa-exclamation-circle" style={{ fontSize: '0.6rem', color: 'var(--overdue)' }} /> Error</>}
      </span>
    );
  };

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Project"
      headerActions={(
        <>
          <button
            onClick={handleDelete}
            className="v2-btn-icon"
            disabled={deleteMutation.isPending}
            title="Archive project"
          >
            {deleteMutation.isPending
              ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)' }} />
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-tertiary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>}
          </button>
          <StatusIndicator />
        </>
      )}
    >
      <Section title="Basics">
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: 500, padding: '10px 14px' }}
            placeholder="Project name..."
          />
        </div>

        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
            placeholder="Optional description..."
          />
        </div>
      </Section>

      <Section title="Appearance">
        <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
          <span style={labelStyle}>Preview</span>
          <div className="flex items-center gap-2.5">
            <div
              style={{ width: 32, height: 32, borderRadius: 7, background: formData.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <i className={`fa-solid ${formData.icon}`} style={{ color: 'white', fontSize: '0.75rem' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.933rem', fontWeight: 600, color: 'var(--ink)' }}>
              {formData.name || 'Untitled Project'}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Color</label>
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => updateField('color', color, true)}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110"
                style={{ background: color, borderColor: formData.color === color ? 'var(--ink)' : 'transparent' }}
                title={color}
              >
                {formData.color === color && (
                  <i className="fa-solid fa-check text-white text-xs drop-shadow"></i>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Icon</label>
          <div className="rounded-lg p-2" style={{ border: '1px solid var(--border)', maxHeight: 200, overflowY: 'auto' }}>
            <IconPicker
              icons={CATEGORY_ICONS}
              selectedIcon={formData.icon}
              onSelect={(icon) => updateField('icon', icon, true)}
              columns={9}
            />
          </div>
        </div>
      </Section>

      <Section title="Actions" isLast>
        <a
          href={projectId ? `/projects/${projectId}` : '#'}
          className="v2-btn v2-btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.7rem' }} />
          Open project
        </a>
      </Section>
    </SlideOverPanel>
  );
};

export default ProjectFormModal;
