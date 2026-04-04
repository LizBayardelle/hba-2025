import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import useNoteTakingMode from '../../hooks/useNoteTakingMode';
import { notesApi } from '../../utils/api';
import useNotesStore from '../../stores/notesStore';

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none' };
const labelStyle = { display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' };

// v2 Section
const Section = ({ title, children, isLast = false }) => (
  <div className={!isLast ? 'mb-5' : ''}>
    <div className="v2-card" style={{ padding: 0 }}>
      <div style={{ padding: '10px 18px 6px' }}><span className="v2-section-label">{title}</span></div>
      <div style={{ padding: '0 18px 16px' }}>{children}</div>
    </div>
  </div>
);

const NoteFormModal = ({ allTags, categories }) => {
  const { formModal, closeFormModal } = useNotesStore();
  const { isOpen, mode, noteId, defaultCategoryId } = formModal;
  const queryClient = useQueryClient();
  const { isNoteTakingMode, toggleNoteTakingMode, exitNoteTakingMode, viewportHeight } = useNoteTakingMode();

  const [formData, setFormData] = useState({ title: '', body: '', category_id: '', pinned: false });
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const [saveStatus, setSaveStatus] = useState(null);
  const saveTimeoutRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const closeAfterSaveRef = useRef(false);
  const pendingSaveDataRef = useRef(null);
  const dataLoadedRef = useRef(false);
  const textareaRef = useRef(null);

  const { data: note } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => notesApi.fetchOne(noteId),
    enabled: isOpen && mode === 'edit' && !!noteId,
  });

  useEffect(() => {
    if (note && mode === 'edit' && !dataLoadedRef.current) {
      dataLoadedRef.current = true;
      setFormData({ title: note.title || '', body: note.body || '', category_id: note.category_id || '', pinned: note.pinned || false });
      setSelectedTags(note.tags?.map(t => t.name) || []);
    }
  }, [note, mode]);

  useEffect(() => {
    if (isOpen && mode === 'new') { setFormData({ title: '', body: '', category_id: defaultCategoryId || '', pinned: false }); setSelectedTags([]); setTagInput(''); }
  }, [isOpen, mode]);

  useEffect(() => { if (isOpen) { dataLoadedRef.current = false; closeAfterSaveRef.current = false; setSaveStatus(null); exitNoteTakingMode(); } }, [isOpen]);

  useEffect(() => {
    if (textareaRef.current && !isNoteTakingMode) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'; }
  }, [formData.body, isNoteTakingMode]);

  useEffect(() => { return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); }; }, []);

  const showSavedStatus = useCallback(() => {
    setSaveStatus('saved');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setSaveStatus(null), 2000);
  }, []);

  const buildNoteData = useCallback((overrides = {}) => {
    const { tags: overrideTags, ...formOverrides } = overrides;
    const d = { ...formData, ...formOverrides };
    return { ...d, tag_names: overrideTags !== undefined ? overrideTags : selectedTags, category_id: d.category_id || null };
  }, [formData, selectedTags]);

  const createMutation = useMutation({
    mutationFn: (data) => notesApi.create({ note: data }),
    onSuccess: () => { queryClient.invalidateQueries(['notes']); queryClient.invalidateQueries(['tags']); queryClient.invalidateQueries(['category']); closeFormModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => notesApi.update(noteId, { note: data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] }); await queryClient.invalidateQueries({ queryKey: ['note', noteId] }); await queryClient.invalidateQueries({ queryKey: ['tags'] });
      if (closeAfterSaveRef.current) { closeAfterSaveRef.current = false; closeFormModal(); } else showSavedStatus();
    },
    onError: () => { setSaveStatus('error'); if (closeAfterSaveRef.current) { closeAfterSaveRef.current = false; closeFormModal(); } },
  });

  const deleteMutation = useMutation({
    mutationFn: () => notesApi.delete(noteId),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['notes'] }); closeFormModal(); },
  });

  const autoSave = useCallback((overrides = {}) => {
    if (mode !== 'edit') return;
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    setSaveStatus('saving'); pendingSaveDataRef.current = overrides;
    debounceTimeoutRef.current = setTimeout(() => { pendingSaveDataRef.current = null; updateMutation.mutate(buildNoteData(overrides)); }, 500);
  }, [mode, buildNoteData, updateMutation]);

  const immediateSave = useCallback((overrides = {}) => {
    if (mode !== 'edit') return;
    if (debounceTimeoutRef.current) { clearTimeout(debounceTimeoutRef.current); debounceTimeoutRef.current = null; pendingSaveDataRef.current = null; }
    setSaveStatus('saving'); updateMutation.mutate(buildNoteData(overrides));
  }, [mode, buildNoteData, updateMutation]);

  const handleClose = () => {
    if (mode === 'edit') {
      if (debounceTimeoutRef.current) { clearTimeout(debounceTimeoutRef.current); debounceTimeoutRef.current = null; closeAfterSaveRef.current = true; updateMutation.mutate(buildNoteData(pendingSaveDataRef.current || {})); pendingSaveDataRef.current = null; return; }
      if (updateMutation.isPending) { closeAfterSaveRef.current = true; return; }
    }
    closeFormModal();
  };

  const handleSubmit = (e) => { e.preventDefault(); createMutation.mutate(buildNoteData()); };
  const handleDelete = () => { if (window.confirm('Delete this note?')) deleteMutation.mutate(); };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (mode === 'edit') { if (field === 'title' || field === 'body') autoSave({ [field]: value }); else immediateSave({ [field]: value }); }
  };

  const handleAddTag = (name) => {
    const t = name.trim();
    if (t && !selectedTags.some(tag => tag.toLowerCase() === t.toLowerCase())) { const newTags = [...selectedTags, t]; setSelectedTags(newTags); immediateSave({ tags: newTags }); }
    setTagInput(''); setShowTagSuggestions(false);
  };

  const handleTagInputKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (tagInput.trim()) handleAddTag(tagInput); } else if (e.key === 'Escape') setShowTagSuggestions(false); };

  const handleRemoveTag = (tagToRemove) => { const newTags = selectedTags.filter(t => t !== tagToRemove); setSelectedTags(newTags); immediateSave({ tags: newTags }); };

  const filteredSuggestions = (allTags || []).filter(tag => tag.name.toLowerCase().includes(tagInput.toLowerCase()) && !selectedTags.some(s => s.toLowerCase() === tag.name.toLowerCase())).slice(0, 5);

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

  const formContent = (
    <>
      {mode === 'new' && createMutation.isError && (
        <div className="note-taking-hidden" style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--overdue-bg)', color: 'var(--overdue)', fontSize: '0.833rem', fontFamily: 'var(--font-body)' }}>
          {createMutation.error?.message || 'An error occurred'}
        </div>
      )}

      {/* Content */}
      <div className="note-taking-editor-wrapper">
        <Section title="Content">
          <div className="mb-4 note-taking-hide-in-mode">
            <input type="text" name="title" value={formData.title} onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Note title (optional)..." style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: 500, padding: '10px 14px' }} />
          </div>
          <div className="note-taking-editor-inner">
            <textarea ref={textareaRef} name="body" value={formData.body} onChange={(e) => handleFieldChange('body', e.target.value)}
              placeholder="Start typing..." rows={8}
              style={{ ...inputStyle, minHeight: 200, lineHeight: '1.6', resize: 'none' }} />
          </div>
        </Section>
      </div>

      {/* Organize */}
      <div className="note-taking-hidden">
        <Section title="Organize" isLast={true}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Category</label>
            <div className="v2-seg-control flex-wrap">
              <button type="button" onClick={() => handleFieldChange('category_id', '')} className={`v2-seg-btn ${formData.category_id === '' ? 'active' : ''}`}>None</button>
              {categories?.map(cat => (
                <button key={cat.id} type="button" onClick={() => handleFieldChange('category_id', cat.id)}
                  className={`v2-seg-btn ${formData.category_id === cat.id ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Pin to top</label>
            <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => handleFieldChange('pinned', !formData.pinned)}>
              <div style={{ width: 40, height: 24, borderRadius: 12, background: formData.pinned ? 'var(--ink)' : 'var(--border)', position: 'relative', transition: 'background 0.2s ease', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 4, width: 16, height: 16, borderRadius: '50%', background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transform: formData.pinned ? 'translateX(18px)' : 'translateX(4px)', transition: 'transform 0.2s ease' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.867rem', color: 'var(--ink)' }}>{formData.pinned ? 'Pinned' : 'Not pinned'}</span>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Tags</label>
            <div className="relative">
              <input type="text" value={tagInput}
                onChange={(e) => { setTagInput(e.target.value); setShowTagSuggestions(e.target.value.length > 0); }}
                onKeyDown={handleTagInputKeyDown}
                onFocus={() => tagInput.length > 0 && setShowTagSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                style={inputStyle} placeholder="Type to add tags..." />
              {showTagSuggestions && (filteredSuggestions.length > 0 || tagInput.trim()) && (
                <div style={{ position: 'absolute', zIndex: 10, width: '100%', marginTop: 4, background: 'var(--surface)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', border: '1px solid var(--border)', maxHeight: 160, overflowY: 'auto' }}>
                  {filteredSuggestions.map(tag => (
                    <button key={tag.id} type="button" onClick={() => handleAddTag(tag.name)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '0.867rem', fontFamily: 'var(--font-body)', color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer' }}>{tag.name}</button>
                  ))}
                  {tagInput.trim() && !filteredSuggestions.find(t => t.name.toLowerCase() === tagInput.toLowerCase()) && (
                    <button type="button" onClick={() => handleAddTag(tagInput)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '0.867rem', fontFamily: 'var(--font-body)', color: 'var(--ink-secondary)', background: 'none', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer' }}>+ Create "{tagInput.trim()}"</button>
                  )}
                </div>
              )}
            </div>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedTags.map(tag => (
                  <span key={tag} className="v2-badge v2-badge-neutral" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px' }}>
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: '0.65rem' }}><i className="fa-solid fa-times" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Section>
      </div>
    </>
  );

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'edit' ? 'Edit Note' : 'New Note'}
      noteTakingMode={isNoteTakingMode}
      viewportHeight={viewportHeight}
      headerActions={
        mode === 'edit' ? (
          <>
            <button onClick={toggleNoteTakingMode} className="v2-btn-icon" title={isNoteTakingMode ? 'Exit writing mode' : 'Writing mode'}>
              <i className={`fa-solid ${isNoteTakingMode ? 'fa-compress' : 'fa-expand'}`} style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)' }} />
            </button>
            <button onClick={handleDelete} className="v2-btn-icon" disabled={deleteMutation.isPending} title="Delete note">
              {deleteMutation.isPending
                ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)' }} />
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-tertiary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              }
            </button>
            <StatusIndicator />
          </>
        ) : (
          <button onClick={toggleNoteTakingMode} className="v2-btn-icon" title={isNoteTakingMode ? 'Exit writing mode' : 'Writing mode'}>
            <i className={`fa-solid ${isNoteTakingMode ? 'fa-compress' : 'fa-expand'}`} style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)' }} />
          </button>
        )
      }
      footer={mode === 'new' ? (
        <>
          <button type="button" onClick={closeFormModal} className="v2-btn v2-btn-secondary" disabled={createMutation.isPending}>Cancel</button>
          <button type="submit" form="note-form" className="v2-btn v2-btn-primary" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Note'}
          </button>
        </>
      ) : null}
    >
      {mode === 'new' ? <form id="note-form" onSubmit={handleSubmit}>{formContent}</form> : formContent}
    </SlideOverPanel>
  );
};

export default NoteFormModal;
