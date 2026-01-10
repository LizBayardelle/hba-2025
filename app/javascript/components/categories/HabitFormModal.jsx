import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import useCategoryStore from '../../stores/categoryStore';
import { tagsApi } from '../../utils/api';

const HabitFormModal = ({ categoryColor }) => {
  const queryClient = useQueryClient();
  const { habitFormModal, closeHabitFormModal } = useCategoryStore();
  const { isOpen, mode, habitId, categoryId } = habitFormModal;

  const [formData, setFormData] = useState({
    name: '',
    target_count: 1,
    frequency_type: 'day',
    time_of_day: 'anytime',
    importance: 'normal',
  });

  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Fetch all user tags for autocomplete
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.fetchAll,
  });

  // Fetch habit data if editing
  const { data: habit } = useQuery({
    queryKey: ['habit', habitId],
    queryFn: async () => {
      const response = await fetch(`/categories/${categoryId}/habits/${habitId}.json`);
      if (!response.ok) throw new Error('Failed to fetch habit');
      return response.json();
    },
    enabled: isOpen && mode === 'edit' && !!habitId && !!categoryId,
  });

  // Load habit data when editing
  useEffect(() => {
    if (habit && mode === 'edit') {
      setFormData({
        name: habit.name || '',
        target_count: habit.target_count || 1,
        frequency_type: habit.frequency_type || 'day',
        time_of_day: habit.time_of_day || 'anytime',
        importance: habit.importance || 'normal',
      });
      setSelectedTags(habit.tags?.map(t => t.name) || []);
    }
  }, [habit, mode]);

  // Reset form when modal opens for new habit
  useEffect(() => {
    if (isOpen && mode === 'new') {
      setFormData({
        name: '',
        target_count: 1,
        frequency_type: 'day',
        time_of_day: 'anytime',
        importance: 'normal',
      });
      setSelectedTags([]);
      setTagInput('');
    }
  }, [isOpen, mode]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch(`/categories/${categoryId}/habits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': document.querySelector('[name=csrf-token]').content,
        },
        body: JSON.stringify({ habit: data }),
      });
      if (!response.ok) throw new Error('Failed to create habit');
      return response.json();
    },
    onSuccess: async (responseData) => {
      // Invalidate and refetch to get fresh data with tags
      await queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
      closeHabitFormModal();
    },
  });

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
    onSuccess: async (responseData, variables) => {
      // Invalidate and refetch to get fresh data with tags
      await queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
      closeHabitFormModal();
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
      // Remove the habit from the category query data
      queryClient.setQueriesData(
        { queryKey: ['category', categoryId], exact: false },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            habits: oldData.habits.filter(h => h.id !== habitId)
          };
        }
      );
      closeHabitFormModal();
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
    };
    if (mode === 'edit') {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this habit?')) {
      deleteMutation.mutate();
    }
  };

  const currentMutation = mode === 'edit' ? updateMutation : createMutation;

  const footer = (
    <>
      {mode === 'edit' && (
        <button
          type="button"
          onClick={handleDelete}
          className="mr-auto px-6 py-3 rounded-lg font-semibold transition"
          style={{ color: '#DC2626' }}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        </button>
      )}
      <button
        type="button"
        onClick={closeHabitFormModal}
        className="px-6 py-3 rounded-lg font-semibold border-2 transition"
        style={{ color: '#1d3e4c', borderColor: '#E8EEF1' }}
        disabled={currentMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="habit-form"
        className="px-6 py-3 rounded-lg text-white font-semibold shadow-lg hover:shadow-xl transition cursor-pointer disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #1d3e4c, #45606b)' }}
        disabled={currentMutation.isPending}
      >
        {currentMutation.isPending
          ? 'Saving...'
          : mode === 'edit'
          ? 'Update Habit'
          : 'Create Habit'}
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={closeHabitFormModal}
      title={mode === 'edit' ? 'Edit Habit' : 'New Habit'}
      footer={footer}
    >
      <form id="habit-form" onSubmit={handleSubmit}>
        {currentMutation.isError && (
          <div
            className="mb-4 p-4 rounded-lg"
            style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
          >
            <i className="fa-solid fa-exclamation-circle mr-2"></i>
            {currentMutation.error?.message || 'An error occurred'}
          </div>
        )}

        {/* Habit Name */}
        <div className="mb-6">
          <label className="block mb-2">Habit Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
            style={{ borderColor: '#E8EEF1' }}
            placeholder="e.g., Morning meditation"
          />
        </div>

        {/* Frequency: Times per Period */}
        <div className="mb-6">
          <label className="block mb-2">Frequency</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-2 text-sm">Times</label>
              <input
                type="number"
                value={formData.target_count}
                onChange={(e) =>
                  setFormData({ ...formData, target_count: parseInt(e.target.value) || 1 })
                }
                min="1"
                className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
                style={{ borderColor: '#E8EEF1' }}
              />
            </div>
            <div>
              <label className="block mb-2 text-sm">Per</label>
              <select
                value={formData.frequency_type}
                onChange={(e) => setFormData({ ...formData, frequency_type: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
                style={{ borderColor: '#E8EEF1' }}
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Time of Day */}
        <div className="mb-6">
          <label className="block mb-2">Time of Day</label>
          <select
            value={formData.time_of_day}
            onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
            style={{ borderColor: '#E8EEF1' }}
          >
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="anytime">Anytime</option>
          </select>
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
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
              style={{ borderColor: '#E8EEF1' }}
              placeholder="Type to search or add new tag"
            />

            {showTagSuggestions && (filteredSuggestions.length > 0 || tagInput.trim()) && (
              <div
                className="absolute z-10 w-full mt-2 bg-white border-2 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                style={{ borderColor: '#E8EEF1' }}
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
                    style={{ borderColor: '#E8EEF1', color: '#1d3e4c' }}
                  >
                    <i className="fa-solid fa-plus mr-2" style={{ color: '#1d3e4c' }}></i>
                    Create "<strong>{tagInput.trim()}</strong>"
                  </button>
                )}
              </div>
            )}
          </div>

          <p className="text-xs font-light mt-2" style={{ color: '#657b84' }}>
            Type to search existing tags or create a new one. Press Enter or click to add.
          </p>

          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-2"
                  style={{
                    backgroundColor: '#E8EEF1',
                    color: '#1d3e4c',
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

        {/* Importance */}
        <div className="mb-6">
          <label className="block mb-2">Importance</label>
          <select
            value={formData.importance}
            onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
            style={{ borderColor: '#E8EEF1' }}
          >
            <option value="critical">Critical (!!)</option>
            <option value="important">Important (!)</option>
            <option value="normal">Normal</option>
            <option value="optional">Optional (?)</option>
          </select>
        </div>
      </form>
    </BaseModal>
  );
};

export default HabitFormModal;
