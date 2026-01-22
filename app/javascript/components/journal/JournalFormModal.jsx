import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
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
    // Case insensitive check for duplicates
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
          className="mr-auto w-10 h-10 rounded-lg transition hover:bg-white/10 flex items-center justify-center"
          disabled={deleteMutation.isPending}
          title="Delete journal entry"
        >
          {deleteMutation.isPending ? (
            <i className="fa-solid fa-spinner fa-spin text-white"></i>
          ) : (
            <i className="fa-solid fa-trash text-white text-lg"></i>
          )}
        </button>
      )}
      <button
        type="button"
        onClick={closeFormModal}
        className="px-6 py-3 rounded-lg font-semibold transition text-white hover:opacity-70"
        style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
        disabled={currentMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="journal-form"
        className="px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition cursor-pointer disabled:opacity-50 hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #A8A8AC 0%, #E5E5E7 45%, #FFFFFF 55%, #C7C7CC 70%, #8E8E93 100%)', border: '0.5px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3)', color: '#1D1D1F', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
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
    <BaseModal
      isOpen={isOpen}
      onClose={closeFormModal}
      title={mode === 'edit' ? 'Edit Journal Entry' : 'New Journal Entry'}
      footer={footer}
      maxWidth="max-w-4xl"
    >
      <form id="journal-form" onSubmit={handleSubmit}>
        {currentMutation.isError && (
          <div
            className="mb-4 p-4 rounded-lg"
            style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
          >
            <i className="fa-solid fa-exclamation-circle mr-2"></i>
            {currentMutation.error?.message || 'An error occurred'}
          </div>
        )}

        {/* Tags */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
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
              className="w-full px-4 py-3 rounded-lg focus:outline-none transition font-light"
              style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#1d3e4c' }}
              placeholder="Type to search or add new tag"
            />

            {/* Tag suggestions dropdown */}
            {showTagSuggestions && (filteredSuggestions.length > 0 || tagInput.trim()) && (
              <div
                className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg max-h-48 overflow-y-auto"
                style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
              >
                {filteredSuggestions.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleAddTag(tag.name)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 transition font-light"
                    style={{ color: '#1d3e4c' }}
                  >
                    {tag.name}
                  </button>
                ))}
                {tagInput.trim() && !filteredSuggestions.find(t => t.name.toLowerCase() === tagInput.toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => handleAddTag(tagInput)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 transition font-light border-t"
                    style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', color: '#1d3e4c' }}
                  >
                    <i className="fa-solid fa-plus mr-2" style={{ color: '#1d3e4c' }}></i>
                    Create "<strong>{tagInput.trim()}</strong>"
                  </button>
                )}
              </div>
            )}
          </div>

          <p className="text-xs font-light mt-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#8E8E93' }}>
            Type to search existing tags or create a new one. Press Enter or click to add.
          </p>

          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)',
                    color: '#FFFFFF',
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

        {/* Content */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
            Entry
          </label>
          <input type="hidden" name="content" id="journal-form-content-hidden" />
          <trix-editor ref={trixEditorRef} input="journal-form-content-hidden" className="trix-content"></trix-editor>
        </div>
      </form>
    </BaseModal>
  );
};

export default JournalFormModal;
