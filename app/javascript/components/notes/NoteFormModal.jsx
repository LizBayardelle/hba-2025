import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import { notesApi } from '../../utils/api';
import useNotesStore from '../../stores/notesStore';

// Section with fieldset-legend style label on border
const Section = ({ title, children, isLast = false }) => (
  <div className={!isLast ? 'mb-6' : ''}>
    <fieldset
      className="rounded-2xl px-6 pb-6 pt-5"
      style={{ border: '1px solid rgba(142, 142, 147, 0.3)' }}
    >
      <legend className="px-3 mx-auto">
        <span className="uppercase tracking-wider" style={{ fontSize: '1.15rem', color: '#A1A1A6', fontWeight: 500, fontFamily: "'Big Shoulders Inline Display', sans-serif", letterSpacing: '0.1em' }}>
          {title}
        </span>
      </legend>
      {children}
    </fieldset>
  </div>
);

const NoteFormModal = ({ allTags, categories }) => {
  const { formModal, closeFormModal } = useNotesStore();
  const { isOpen, mode, noteId, defaultCategoryId } = formModal;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    body: '',
    category_id: '',
    pinned: false,
  });
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Autosave infrastructure (edit mode only)
  const [saveStatus, setSaveStatus] = useState(null);
  const saveTimeoutRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const closeAfterSaveRef = useRef(false);
  const pendingSaveDataRef = useRef(null);
  const dataLoadedRef = useRef(false);
  const textareaRef = useRef(null);

  // Fetch note data if editing
  const { data: note } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => notesApi.fetchOne(noteId),
    enabled: isOpen && mode === 'edit' && !!noteId,
  });

  // Load note data when editing (only on initial load)
  useEffect(() => {
    if (note && mode === 'edit' && !dataLoadedRef.current) {
      dataLoadedRef.current = true;
      setFormData({
        title: note.title || '',
        body: note.body || '',
        category_id: note.category_id || '',
        pinned: note.pinned || false,
      });
      setSelectedTags(note.tags?.map(t => t.name) || []);
    }
  }, [note, mode]);

  // Reset form when modal opens for new note
  useEffect(() => {
    if (isOpen && mode === 'new') {
      setFormData({ title: '', body: '', category_id: defaultCategoryId || '', pinned: false });
      setSelectedTags([]);
      setTagInput('');
    }
  }, [isOpen, mode]);

  // Reset refs when modal opens
  useEffect(() => {
    if (isOpen) {
      dataLoadedRef.current = false;
      closeAfterSaveRef.current = false;
      setSaveStatus(null);
    }
  }, [isOpen]);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [formData.body]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  // Show saved status briefly
  const showSavedStatus = useCallback(() => {
    setSaveStatus('saved');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus(null);
    }, 2000);
  }, []);

  // Build note data for saving
  const buildNoteData = useCallback((overrides = {}) => {
    const { tags: overrideTags, ...formOverrides } = overrides;
    const currentFormData = { ...formData, ...formOverrides };
    const currentTags = overrideTags !== undefined ? overrideTags : selectedTags;

    return {
      ...currentFormData,
      tag_names: currentTags,
      category_id: currentFormData.category_id || null,
    };
  }, [formData, selectedTags]);

  // Create mutation (new mode only)
  const createMutation = useMutation({
    mutationFn: (data) => notesApi.create({ note: data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
      queryClient.invalidateQueries(['tags']);
      queryClient.invalidateQueries(['category']);
      closeFormModal();
    },
  });

  // Update mutation (autosave in edit mode)
  const updateMutation = useMutation({
    mutationFn: (data) => notesApi.update(noteId, { note: data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] });
      await queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      await queryClient.invalidateQueries({ queryKey: ['category'] });
      if (closeAfterSaveRef.current) {
        closeAfterSaveRef.current = false;
        closeFormModal();
      } else {
        showSavedStatus();
      }
    },
    onError: () => {
      setSaveStatus('error');
      if (closeAfterSaveRef.current) {
        closeAfterSaveRef.current = false;
        closeFormModal();
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => notesApi.delete(noteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] });
      await queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      await queryClient.invalidateQueries({ queryKey: ['category'] });
      closeFormModal();
    },
  });

  // Auto-save (debounced, for text inputs — edit mode only)
  const autoSave = useCallback((overrides = {}) => {
    if (mode !== 'edit') return;
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    setSaveStatus('saving');
    pendingSaveDataRef.current = overrides;
    debounceTimeoutRef.current = setTimeout(() => {
      pendingSaveDataRef.current = null;
      const data = buildNoteData(overrides);
      updateMutation.mutate(data);
    }, 500);
  }, [mode, buildNoteData, updateMutation]);

  // Immediate save (for selections/toggles — edit mode only)
  const immediateSave = useCallback((overrides = {}) => {
    if (mode !== 'edit') return;
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
      pendingSaveDataRef.current = null;
    }

    setSaveStatus('saving');
    const data = buildNoteData(overrides);
    updateMutation.mutate(data);
  }, [mode, buildNoteData, updateMutation]);

  // Handle close
  const handleClose = () => {
    if (mode === 'edit') {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
        const overrides = pendingSaveDataRef.current || {};
        pendingSaveDataRef.current = null;
        closeAfterSaveRef.current = true;
        const data = buildNoteData(overrides);
        updateMutation.mutate(data);
        return;
      }

      if (updateMutation.isPending) {
        closeAfterSaveRef.current = true;
        return;
      }
    }

    closeFormModal();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = buildNoteData();
    createMutation.mutate(data);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteMutation.mutate();
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (mode === 'edit') {
      if (field === 'title' || field === 'body') {
        autoSave({ [field]: value });
      } else {
        immediateSave({ [field]: value });
      }
    }
  };

  // Tag handling
  const handleAddTag = (tagName) => {
    const trimmedTag = tagName.trim();
    if (trimmedTag && !selectedTags.some(tag => tag.toLowerCase() === trimmedTag.toLowerCase())) {
      const newTags = [...selectedTags, trimmedTag];
      setSelectedTags(newTags);
      immediateSave({ tags: newTags });
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) handleAddTag(tagInput);
    } else if (e.key === 'Escape') {
      setShowTagSuggestions(false);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const newTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(newTags);
    immediateSave({ tags: newTags });
  };

  const filteredSuggestions = (allTags || [])
    .filter(tag =>
      tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !selectedTags.some(selectedTag => selectedTag.toLowerCase() === tag.name.toLowerCase())
    )
    .slice(0, 5);

  // Status indicator (edit mode)
  const StatusIndicator = () => {
    if (!saveStatus) return null;
    return (
      <div className="flex items-center gap-2 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
        {saveStatus === 'saving' && (
          <>
            <i className="fa-solid fa-spinner fa-spin" style={{ color: '#8E8E93' }}></i>
            <span style={{ color: '#8E8E93' }}>Saving...</span>
          </>
        )}
        {saveStatus === 'saved' && (
          <>
            <i className="fa-solid fa-check" style={{ color: '#22C55E' }}></i>
            <span style={{ color: '#22C55E' }}>Saved</span>
          </>
        )}
        {saveStatus === 'error' && (
          <>
            <i className="fa-solid fa-exclamation-circle" style={{ color: '#DC2626' }}></i>
            <span style={{ color: '#DC2626' }}>Error saving</span>
          </>
        )}
      </div>
    );
  };

  // Header actions for edit mode
  const headerActions = mode === 'edit' ? (
    <>
      <button
        type="button"
        onClick={handleDelete}
        className="w-8 h-8 rounded-lg transition hover:bg-gray-100 flex items-center justify-center"
        disabled={deleteMutation.isPending}
        title="Delete note"
      >
        {deleteMutation.isPending ? (
          <i className="fa-solid fa-spinner fa-spin text-sm" style={{ color: '#8E8E93' }}></i>
        ) : (
          <i className="fa-solid fa-trash text-sm" style={{ color: '#8E8E93' }}></i>
        )}
      </button>
      <StatusIndicator />
    </>
  ) : null;

  // Footer only for new mode
  const footer = mode === 'new' ? (
    <>
      <button
        type="button"
        onClick={closeFormModal}
        className="btn-liquid-outline-light"
        disabled={createMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="note-form"
        className="btn-liquid"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? 'Creating...' : 'Create Note'}
      </button>
    </>
  ) : null;

  const formContent = (
    <>
      {mode === 'new' && createMutation.isError && (
        <div className="form-error">
          <i className="fa-solid fa-circle-exclamation form-error-icon"></i>
          <span className="form-error-text">
            {createMutation.error?.message || 'An error occurred'}
          </span>
        </div>
      )}

      {/* ==================== CONTENT SECTION ==================== */}
      <Section title="Content">
        {/* Title */}
        <div className="mb-4">
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="Note title (optional)..."
            className="form-input-hero"
          />
        </div>

        {/* Body */}
        <div>
          <textarea
            ref={textareaRef}
            name="body"
            value={formData.body}
            onChange={(e) => handleFieldChange('body', e.target.value)}
            placeholder="Start typing..."
            rows={8}
            className="form-input resize-none"
            style={{ minHeight: '200px', lineHeight: '1.6' }}
          />
        </div>
      </Section>

      {/* ==================== ORGANIZE SECTION ==================== */}
      <Section title="Organize" isLast={true}>
        {/* Category */}
        <div className="mb-4">
          <label className="form-label">
            Category
          </label>
          <div className="button-bar flex-wrap">
            <button
              type="button"
              onClick={() => handleFieldChange('category_id', '')}
              className={`flex items-center gap-2 px-4 py-2.5 ${formData.category_id === '' ? 'liquid-surface-subtle' : ''}`}
              style={formData.category_id === '' ? { '--surface-color': '#1D1D1F' } : {}}
            >
              <i
                className="fa-solid fa-folder text-sm"
                style={{ color: formData.category_id === '' ? 'white' : '#8E8E93' }}
              ></i>
              <span className="bar-item-text" style={{ color: formData.category_id === '' ? 'white' : '#1D1D1F' }}>
                None
              </span>
            </button>
            {categories?.map((category) => {
              const isActive = formData.category_id === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleFieldChange('category_id', category.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 ${isActive ? 'liquid-surface-subtle' : ''}`}
                  style={isActive ? { '--surface-color': category.color } : {}}
                >
                  <i
                    className={`fa-solid ${category.icon} text-sm`}
                    style={{ color: isActive ? 'white' : category.color }}
                  ></i>
                  <span className="bar-item-text" style={{ color: isActive ? 'white' : '#1D1D1F' }}>
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pin toggle */}
        <div className="mb-4">
          <label className="form-label">
            Pin to Top
          </label>
          <button
            type="button"
            onClick={() => handleFieldChange('pinned', !formData.pinned)}
            className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none"
            style={{ backgroundColor: formData.pinned ? '#34C759' : '#E5E5EA' }}
          >
            <span
              className="inline-block h-[22px] w-[22px] rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out"
              style={{ transform: formData.pinned ? 'translateX(22px)' : 'translateX(3px)' }}
            />
          </button>
        </div>

        {/* Tags */}
        <div>
          <label className="form-label">
            Tags
          </label>
          <div className="relative">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setShowTagSuggestions(e.target.value.length > 0);
              }}
              onKeyDown={handleTagInputKeyDown}
              onFocus={() => tagInput.length > 0 && setShowTagSuggestions(true)}
              onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
              className="form-input"
              placeholder="Type to add tags..."
            />

            {showTagSuggestions && (filteredSuggestions.length > 0 || tagInput.trim()) && (
              <div className="form-dropdown">
                {filteredSuggestions.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleAddTag(tag.name)}
                  >
                    {tag.name}
                  </button>
                ))}
                {tagInput.trim() && !filteredSuggestions.find(t => t.name.toLowerCase() === tagInput.toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => handleAddTag(tagInput)}
                    style={{ borderTop: '1px solid rgba(199, 199, 204, 0.3)' }}
                  >
                    <i className="fa-solid fa-plus mr-2 text-gray-400"></i>
                    Create "{tagInput.trim()}"
                  </button>
                )}
              </div>
            )}
          </div>

          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-3 py-1.5 rounded-[10px] flex items-center gap-2 liquid-surface-subtle"
                  style={{
                    '--surface-color': '#2C2C2E',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:opacity-70">
                    <i className="fa-solid fa-times text-xs"></i>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Section>
    </>
  );

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'edit' ? 'Edit Note' : 'New Note'}
      headerActions={headerActions}
      footer={footer}
    >
      {mode === 'new' ? (
        <form id="note-form" onSubmit={handleSubmit}>
          {formContent}
        </form>
      ) : (
        formContent
      )}
    </SlideOverPanel>
  );
};

export default NoteFormModal;
