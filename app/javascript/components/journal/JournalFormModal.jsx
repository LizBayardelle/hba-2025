import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import { journalsApi } from '../../utils/api';
import useJournalStore from '../../stores/journalStore';

const JournalFormModal = ({ allTags }) => {
  const { formModal, closeFormModal } = useJournalStore();
  const { isOpen, mode, journalId } = formModal;
  const queryClient = useQueryClient();
  const trixEditorRef = useRef(null);

  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  // Fetch journal data if editing
  const { data: journal } = useQuery({
    queryKey: ['journal', journalId],
    queryFn: () => journalsApi.fetchOne(journalId),
    enabled: isOpen && mode === 'edit' && !!journalId,
  });

  // Load journal data when editing
  useEffect(() => {
    if (journal && mode === 'edit') {
      setSelectedTags(journal.tags?.map(t => t.name) || []);
      setIsPrivate(journal.private || false);

      // Set Trix content
      if (trixEditorRef.current) {
        setTimeout(() => {
          const trixEditor = trixEditorRef.current?.editor;
          if (trixEditor && journal.content) {
            trixEditor.loadHTML(journal.content || '');
          }
        }, 100);
      }
    }
  }, [journal, mode]);

  // Reset form when modal opens for new journal
  useEffect(() => {
    if (isOpen && mode === 'new') {
      setSelectedTags([]);
      setTagInput('');
      setIsPrivate(false);
      if (trixEditorRef.current?.editor) {
        trixEditorRef.current.editor.loadHTML('');
      }
    }
  }, [isOpen, mode]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => journalsApi.create({ journal: data }),
    onSuccess: async () => {
      const queries = queryClient.getQueriesData({ queryKey: ['journals'] });
      queries.forEach(([queryKey]) => {
        queryClient.invalidateQueries({ queryKey });
      });
      closeFormModal();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data) => journalsApi.update(journalId, { journal: data }),
    onSuccess: async () => {
      const queries = queryClient.getQueriesData({ queryKey: ['journals'] });
      queries.forEach(([queryKey]) => {
        queryClient.invalidateQueries({ queryKey });
      });
      queryClient.invalidateQueries({ queryKey: ['journal', journalId] });
      closeFormModal();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => journalsApi.delete(journalId),
    onSuccess: async () => {
      const queries = queryClient.getQueriesData({ queryKey: ['journals'] });
      queries.forEach(([queryKey]) => {
        queryClient.invalidateQueries({ queryKey });
      });
      closeFormModal();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      content: trixEditorRef.current?.value || '',
      tag_names: selectedTags,
      private: isPrivate,
    };

    if (mode === 'edit') {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this journal entry?')) {
      deleteMutation.mutate();
    }
  };

  const handleAddTag = (tagName) => {
    const trimmedTag = tagName.trim();
    if (trimmedTag && !selectedTags.some(tag => tag.toLowerCase() === trimmedTag.toLowerCase())) {
      setSelectedTags([...selectedTags, trimmedTag]);
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) {
        handleAddTag(tagInput);
      }
    } else if (e.key === 'Escape') {
      setShowTagSuggestions(false);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  // Filter suggestions based on input (case insensitive)
  const filteredSuggestions = (allTags || [])
    .filter(tag =>
      tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !selectedTags.some(selectedTag => selectedTag.toLowerCase() === tag.name.toLowerCase())
    )
    .slice(0, 5);

  const currentMutation = mode === 'edit' ? updateMutation : createMutation;

  const footer = (
    <>
      {mode === 'edit' && (
        <button
          type="button"
          onClick={handleDelete}
          className="btn-delete-icon"
          disabled={deleteMutation.isPending}
          title="Delete journal entry"
        >
          {deleteMutation.isPending ? (
            <i className="fa-solid fa-spinner fa-spin" style={{ color: '#8E8E93' }}></i>
          ) : (
            <i className="fa-solid fa-trash text-lg" style={{ color: '#DC2626' }}></i>
          )}
        </button>
      )}
      <button
        type="button"
        onClick={closeFormModal}
        className="btn-liquid-outline-light"
        disabled={currentMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="journal-form"
        className="btn-liquid"
        disabled={currentMutation.isPending}
      >
        {currentMutation.isPending
          ? 'Saving...'
          : mode === 'edit'
          ? 'Update Entry'
          : 'Save Entry'}
      </button>
    </>
  );

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={closeFormModal}
      title={mode === 'edit' ? 'Edit Journal Entry' : 'New Journal Entry'}
      footer={footer}
    >
      <form id="journal-form" onSubmit={handleSubmit}>
        {currentMutation.isError && (
          <div className="form-error">
            <i className="fa-solid fa-circle-exclamation form-error-icon"></i>
            <span className="form-error-text">
              {currentMutation.error?.message || 'An error occurred'}
            </span>
          </div>
        )}

        {/* Entry Content */}
        <div className="mb-6">
          <label className="form-label">
            Entry
          </label>
          <input type="hidden" name="content" id="journal-form-content-hidden" />
          <trix-editor ref={trixEditorRef} input="journal-form-content-hidden" className="trix-content"></trix-editor>
        </div>

        {/* Private Toggle */}
        <div className="mb-6">
          <label className="checkbox-row cursor-pointer select-none" style={{ gap: '0.75rem' }}>
            <div
              onClick={() => setIsPrivate(!isPrivate)}
              className="relative w-12 h-7 rounded-full transition-colors cursor-pointer"
              style={{ backgroundColor: isPrivate ? '#2C2C2E' : '#E5E5E7' }}
            >
              <div
                className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: isPrivate ? 'translateX(22px)' : 'translateX(4px)' }}
              />
            </div>
            <div>
              <span className="text-sm" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
                Private Entry
              </span>
              <p className="text-xs" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#8E8E93' }}>
                Do Not Show Preview on Journal List
              </p>
            </div>
          </label>
        </div>

        {/* Tags */}
        <div className="mb-6">
          <label className="form-label">
            Tags (optional)
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
              placeholder="Type to search or add new tag"
            />

            {/* Tag suggestions dropdown */}
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

          <p className="text-xs mt-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#8E8E93' }}>
            Type to search existing tags or create a new one. Press Enter or click to add.
          </p>

          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
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
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:opacity-70"
                  >
                    <i className="fa-solid fa-times text-xs"></i>
                  </button>
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
