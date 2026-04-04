import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import useNoteTakingMode, { useTrixExpandButton } from '../../hooks/useNoteTakingMode';
import { journalsApi } from '../../utils/api';
import useJournalStore from '../../stores/journalStore';

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none' };
const labelStyle = { display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' };

const JournalFormModal = ({ allTags }) => {
  const { formModal, closeFormModal } = useJournalStore();
  const { isOpen, mode, journalId } = formModal;
  const queryClient = useQueryClient();
  const trixEditorRef = useRef(null);
  const { isNoteTakingMode, toggleNoteTakingMode, exitNoteTakingMode, viewportHeight } = useNoteTakingMode();
  useTrixExpandButton(trixEditorRef, isNoteTakingMode, toggleNoteTakingMode);

  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  const { data: journal } = useQuery({
    queryKey: ['journal', journalId],
    queryFn: () => journalsApi.fetchOne(journalId),
    enabled: isOpen && mode === 'edit' && !!journalId,
  });

  useEffect(() => {
    if (journal && mode === 'edit') {
      setSelectedTags(journal.tags?.map(t => t.name) || []);
      setIsPrivate(journal.private || false);
      if (trixEditorRef.current) {
        setTimeout(() => { const e = trixEditorRef.current?.editor; if (e && journal.content) e.loadHTML(journal.content || ''); }, 100);
      }
    }
  }, [journal, mode]);

  useEffect(() => {
    if (isOpen) exitNoteTakingMode();
    if (isOpen && mode === 'new') {
      setSelectedTags([]); setTagInput(''); setIsPrivate(false);
      if (trixEditorRef.current?.editor) trixEditorRef.current.editor.loadHTML('');
    }
  }, [isOpen, mode]);

  const createMutation = useMutation({
    mutationFn: (data) => journalsApi.create({ journal: data }),
    onSuccess: async () => { const qs = queryClient.getQueriesData({ queryKey: ['journals'] }); qs.forEach(([qk]) => queryClient.invalidateQueries({ queryKey: qk })); closeFormModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => journalsApi.update(journalId, { journal: data }),
    onSuccess: async () => { const qs = queryClient.getQueriesData({ queryKey: ['journals'] }); qs.forEach(([qk]) => queryClient.invalidateQueries({ queryKey: qk })); queryClient.invalidateQueries({ queryKey: ['journal', journalId] }); closeFormModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => journalsApi.delete(journalId),
    onSuccess: async () => { const qs = queryClient.getQueriesData({ queryKey: ['journals'] }); qs.forEach(([qk]) => queryClient.invalidateQueries({ queryKey: qk })); closeFormModal(); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { content: trixEditorRef.current?.value || '', tag_names: selectedTags, private: isPrivate };
    if (mode === 'edit') updateMutation.mutate(data); else createMutation.mutate(data);
  };

  const handleDelete = () => { if (window.confirm('Delete this journal entry?')) deleteMutation.mutate(); };

  const handleAddTag = (name) => {
    const t = name.trim();
    if (t && !selectedTags.some(tag => tag.toLowerCase() === t.toLowerCase())) setSelectedTags([...selectedTags, t]);
    setTagInput(''); setShowTagSuggestions(false);
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (tagInput.trim()) handleAddTag(tagInput); }
    else if (e.key === 'Escape') setShowTagSuggestions(false);
  };

  const filteredSuggestions = (allTags || []).filter(tag => tag.name.toLowerCase().includes(tagInput.toLowerCase()) && !selectedTags.some(s => s.toLowerCase() === tag.name.toLowerCase())).slice(0, 5);
  const currentMutation = mode === 'edit' ? updateMutation : createMutation;

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={closeFormModal}
      title={mode === 'edit' ? 'Edit Entry' : 'New Entry'}
      noteTakingMode={isNoteTakingMode}
      viewportHeight={viewportHeight}
      headerActions={
        <button onClick={toggleNoteTakingMode} className="v2-btn-icon" title={isNoteTakingMode ? 'Exit writing mode' : 'Writing mode'}>
          <i className={`fa-solid ${isNoteTakingMode ? 'fa-compress' : 'fa-expand'}`} style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)' }} />
        </button>
      }
      footer={
        <>
          {mode === 'edit' && (
            <button onClick={handleDelete} className="v2-btn v2-btn-danger" disabled={deleteMutation.isPending} style={{ marginRight: 'auto' }}>
              {deleteMutation.isPending ? <i className="fa-solid fa-spinner fa-spin" /> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>}
              Delete
            </button>
          )}
          <button type="button" onClick={closeFormModal} className="v2-btn v2-btn-secondary" disabled={currentMutation.isPending}>Cancel</button>
          <button type="submit" form="journal-form" className="v2-btn v2-btn-primary" disabled={currentMutation.isPending}>
            {currentMutation.isPending ? 'Saving...' : mode === 'edit' ? 'Update' : 'Save Entry'}
          </button>
        </>
      }
    >
      <form id="journal-form" onSubmit={handleSubmit}>
        {currentMutation.isError && (
          <div className="note-taking-hidden" style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--overdue-bg)', color: 'var(--overdue)', fontSize: '0.833rem', fontFamily: 'var(--font-body)' }}>
            {currentMutation.error?.message || 'An error occurred'}
          </div>
        )}

        {/* Editor */}
        <div className="mb-5 note-taking-editor-wrapper">
          <div className="note-taking-editor-inner">
            <label className="note-taking-hide-in-mode" style={labelStyle}>Entry</label>
            <input type="hidden" name="content" id="journal-form-content-hidden" />
            <trix-editor ref={trixEditorRef} input="journal-form-content-hidden" className="trix-content" />
          </div>
        </div>

        {/* Private toggle */}
        <div className="mb-5 note-taking-hidden">
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setIsPrivate(!isPrivate)}>
            <div style={{ width: 40, height: 24, borderRadius: 12, background: isPrivate ? 'var(--ink)' : 'var(--border)', position: 'relative', transition: 'background 0.2s ease', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 4, width: 16, height: 16, borderRadius: '50%', background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transform: isPrivate ? 'translateX(18px)' : 'translateX(4px)', transition: 'transform 0.2s ease' }} />
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.867rem', fontWeight: 500, color: 'var(--ink)' }}>Private entry</span>
              <p className="v2-caption" style={{ color: 'var(--ink-faint)', marginTop: 1 }}>Hide preview on journal list</p>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-5 note-taking-hidden">
          <label style={labelStyle}>Tags (optional)</label>
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
                  <button type="button" onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: '0.65rem' }}><i className="fa-solid fa-times" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      </form>
    </SlideOverPanel>
  );
};

export default JournalFormModal;
