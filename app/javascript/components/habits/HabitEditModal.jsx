import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import useHabitsStore from '../../stores/habitsStore';
import useDocumentsStore from '../../stores/documentsStore';
import { tagsApi, documentsApi } from '../../utils/api';

const HabitEditModal = () => {
  const queryClient = useQueryClient();
  const { editModal, closeEditModal } = useHabitsStore();
  const { isOpen, habitId, categoryId } = editModal;

  const [formData, setFormData] = useState({
    name: '',
    target_count: 1,
    frequency_type: 'day',
    time_block_id: '',
    importance_level_id: '',
  });

  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');

  const { openNewModal: openNewDocumentModal } = useDocumentsStore();

  // Fetch all user tags for autocomplete
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.fetchAll,
  });

  // Fetch user's importance levels
  const { data: importanceLevels = [] } = useQuery({
    queryKey: ['importanceLevels'],
    queryFn: async () => {
      const response = await fetch('/settings/importance_levels');
      if (!response.ok) throw new Error('Failed to fetch importance levels');
      return response.json();
    },
  });

  // Fetch user's time blocks
  const { data: timeBlocks = [] } = useQuery({
    queryKey: ['timeBlocks'],
    queryFn: async () => {
      const response = await fetch('/settings/time_blocks');
      if (!response.ok) throw new Error('Failed to fetch time blocks');
      return response.json();
    },
  });

  // Fetch all documents
  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.fetchAll,
  });

  // Fetch habit data
  const { data: habit } = useQuery({
    queryKey: ['habit', habitId],
    queryFn: async () => {
      const response = await fetch(`/categories/${categoryId}/habits/${habitId}.json`);
      if (!response.ok) throw new Error('Failed to fetch habit');
      return response.json();
    },
    enabled: isOpen && !!habitId && !!categoryId,
  });

  // Load habit data when editing
  useEffect(() => {
    if (habit && isOpen) {
      setFormData({
        name: habit.name || '',
        target_count: habit.target_count || 1,
        frequency_type: habit.frequency_type || 'day',
        time_block_id: habit.time_block_id || '',
        importance_level_id: habit.importance_level_id || '',
      });
      setSelectedTags(habit.tags?.map(t => t.name) || []);
      setSelectedDocumentIds(habit.habit_contents?.map(hc => hc.id) || []);
    }
  }, [habit, isOpen]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch(`/categories/${categoryId}/habits/${habitId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': document.querySelector('[name=csrf-token]').content,
        },
        body: JSON.stringify({ habit: data }),
      });
      if (!response.ok) throw new Error('Failed to update habit');
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['habits'] });
      closeEditModal();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/categories/${categoryId}/habits/${habitId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': document.querySelector('[name=csrf-token]').content,
        },
      });
      if (!response.ok) throw new Error('Failed to delete habit');
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['habits'] });
      closeEditModal();
    },
  });

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

  const filteredSuggestions = (allTags || [])
    .filter(tag =>
      tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !selectedTags.some(selectedTag => selectedTag.toLowerCase() === tag.name.toLowerCase())
    )
    .slice(0, 5);

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      tag_names: selectedTags,
      habit_content_ids: selectedDocumentIds,
    };
    updateMutation.mutate(submitData);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this habit?')) {
      deleteMutation.mutate();
    }
  };

  const footer = (
    <>
      <button
        type="button"
        onClick={handleDelete}
        className="mr-auto w-10 h-10 rounded-lg transition hover:bg-white/10 flex items-center justify-center"
        disabled={deleteMutation.isPending}
        title="Delete habit"
      >
        {deleteMutation.isPending ? (
          <i className="fa-solid fa-spinner fa-spin text-white"></i>
        ) : (
          <i className="fa-solid fa-trash text-white text-lg"></i>
        )}
      </button>
      <button
        type="button"
        onClick={closeEditModal}
        className="px-6 py-3 rounded-lg transition text-white hover:opacity-70"
        style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F', border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
        disabled={updateMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="habit-edit-form"
        className="px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition cursor-pointer disabled:opacity-50 hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #A8A8AC 0%, #E5E5E7 45%, #FFFFFF 55%, #C7C7CC 70%, #8E8E93 100%)', border: '0.5px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3)', color: '#1D1D1F', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? 'Saving...' : 'Update Habit'}
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={closeEditModal}
      title="Edit Habit"
      footer={footer}
    >
      <form id="habit-edit-form" onSubmit={handleSubmit}>
        {updateMutation.isError && (
          <div
            className="mb-4 p-4 rounded-lg"
            style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
          >
            <i className="fa-solid fa-exclamation-circle mr-2"></i>
            {updateMutation.error?.message || 'An error occurred'}
          </div>
        )}

        {/* Habit Name */}
        <div className="mb-6">
          <label className="block mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>Habit Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-4 py-3 rounded-lg focus:outline-none transition font-light"
            style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
            placeholder="e.g., Morning meditation"
          />
        </div>

        {/* Frequency: Times per Period */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-2 text-sm" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>Times</label>
              <input
                type="number"
                value={formData.target_count}
                onChange={(e) =>
                  setFormData({ ...formData, target_count: parseInt(e.target.value) || 1 })
                }
                min="1"
                className="w-full px-4 py-3 rounded-lg focus:outline-none transition font-light"
                style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
              />
            </div>
            <div>
              <label className="block mb-2 text-sm" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>Per</label>
              <select
                value={formData.frequency_type}
                onChange={(e) => setFormData({ ...formData, frequency_type: e.target.value })}
                className="w-full px-4 py-3 rounded-lg focus:outline-none transition font-light"
                style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Time Block */}
        <div className="mb-6">
          <label className="block mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>Time Block</label>
          <div className="overflow-x-auto pb-2 pt-2 px-1">
            <div className="flex gap-4 min-w-max pl-1">
              {/* Anytime option (no time block) */}
              <div
                className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105"
                onClick={() => setFormData({ ...formData, time_block_id: '' })}
              >
                <div
                  className={`w-16 h-16 rounded-lg flex items-center justify-center shadow-md transition ${
                    formData.time_block_id === '' ? 'ring-4 ring-offset-2' : ''
                  }`}
                  style={{
                    backgroundColor: '#1d3e4c',
                    ringColor: formData.time_block_id === '' ? '#1d3e4c' : 'transparent',
                  }}
                >
                  <i className="fa-solid fa-clock text-white text-2xl"></i>
                </div>
                <span
                  className="text-xs font-medium text-center max-w-[80px]"
                  style={{ color: '#1d3e4c' }}
                >
                  Anytime
                </span>
              </div>

              {/* User's time blocks */}
              {timeBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setFormData({ ...formData, time_block_id: block.id })}
                >
                  <div
                    className={`w-16 h-16 rounded-lg flex items-center justify-center shadow-md transition ${
                      formData.time_block_id === block.id ? 'ring-4 ring-offset-2' : ''
                    }`}
                    style={{
                      backgroundColor: block.color,
                      ringColor: formData.time_block_id === block.id ? block.color : 'transparent',
                    }}
                  >
                    <i className={`${block.icon} text-white text-2xl`}></i>
                  </div>
                  <span
                    className="text-xs font-medium text-center max-w-[80px]"
                    style={{ color: '#1d3e4c' }}
                  >
                    {block.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ color: '#1d3e4c' }}>
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
              style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
              placeholder="Type to search or add new tag"
            />

            {showTagSuggestions && (filteredSuggestions.length > 0 || tagInput.trim()) && (
              <div
                className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg max-h-48 overflow-y-auto"
                style={{ borderColor: 'rgba(199, 199, 204, 0.3)' }}
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
                    style={{ borderColor: 'rgba(199, 199, 204, 0.3)', color: '#1d3e4c' }}
                  >
                    <i className="fa-solid fa-plus mr-2" style={{ color: '#1d3e4c' }}></i>
                    Create "<strong>{tagInput.trim()}</strong>"
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
                  className="text-xs px-3 py-1.5 rounded-full flex items-center gap-2"
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

        {/* Documents */}
        <div className="mb-6">
          <label className="block mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
            Attached Documents (optional)
          </label>
          <div className="rounded-lg p-3" style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}>
            <input
              type="text"
              value={documentSearchQuery}
              onChange={(e) => setDocumentSearchQuery(e.target.value)}
              className="w-full px-4 py-2 mb-3 rounded-lg focus:outline-none transition font-light text-sm"
              style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
              placeholder="Search documents..."
            />
            {documents.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {documents
                  .filter((doc) => {
                    const query = documentSearchQuery.toLowerCase();
                    return (
                      doc.title.toLowerCase().includes(query) ||
                      (doc.body && doc.body.toLowerCase().includes(query))
                    );
                  })
                  .map((doc) => (
                    <label
                      key={doc.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocumentIds.includes(doc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocumentIds([...selectedDocumentIds, doc.id]);
                          } else {
                            setSelectedDocumentIds(selectedDocumentIds.filter(id => id !== doc.id));
                          }
                        }}
                        className="w-4 h-4 rounded cursor-pointer"
                        style={{ accentColor: '#2C2C2E' }}
                      />
                      <span className="text-sm flex-1" style={{ color: '#1d3e4c' }}>
                        {doc.title}
                      </span>
                    </label>
                  ))}
                {documents.filter((doc) => {
                  const query = documentSearchQuery.toLowerCase();
                  return (
                    doc.title.toLowerCase().includes(query) ||
                    (doc.body && doc.body.toLowerCase().includes(query))
                  );
                }).length === 0 && (
                  <p className="text-sm text-center py-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#8E8E93' }}>
                    No matching documents
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-center py-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#8E8E93' }}>
                No documents available
              </p>
            )}
            <button
              type="button"
              onClick={openNewDocumentModal}
              className="mt-3 w-full px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
              style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F', border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
            >
              <i className="fa-solid fa-plus mr-2"></i>
              Create New Document
            </button>
          </div>
        </div>

        {/* Importance Level */}
        <div className="mb-6">
          <label className="block mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>Importance Level</label>
          <div className="overflow-x-auto pb-2 pt-2">
            <div className="flex gap-4 min-w-max">
              {importanceLevels.map((level) => (
                <div
                  key={level.id}
                  className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setFormData({ ...formData, importance_level_id: level.id })}
                >
                  <div
                    className={`w-16 h-16 rounded-lg flex items-center justify-center shadow-md transition ${
                      formData.importance_level_id === level.id ? 'ring-4 ring-offset-2' : ''
                    }`}
                    style={{
                      backgroundColor: level.color,
                      ringColor: formData.importance_level_id === level.id ? level.color : 'transparent',
                    }}
                  >
                    <i className={`${level.icon} text-white text-2xl`}></i>
                  </div>
                  <span
                    className="text-xs font-medium text-center max-w-[80px]"
                    style={{ color: '#1d3e4c' }}
                  >
                    {level.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </BaseModal>
  );
};

export default HabitEditModal;
