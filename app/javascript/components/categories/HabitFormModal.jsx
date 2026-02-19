import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import useCategoryStore from '../../stores/categoryStore';
import useHabitsStore from '../../stores/habitsStore';
import useDocumentsStore from '../../stores/documentsStore';
import useListsStore from '../../stores/listsStore';
import { tagsApi, categoriesApi, documentsApi, listsApi } from '../../utils/api';

// Helper to darken a hex color
const darkenColor = (hex, percent = 30) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max((num >> 16) - amt, 0);
  const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
  const B = Math.max((num & 0x0000FF) - amt, 0);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
};

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

const HabitFormModal = ({ categoryColor, useHabitsPage = false }) => {
  const queryClient = useQueryClient();
  const categoryStore = useCategoryStore();
  const habitsStore = useHabitsStore();

  // Use appropriate store based on context
  const modalState = useHabitsPage ? habitsStore.newModal : categoryStore.habitFormModal;
  const closeModal = useHabitsPage ? habitsStore.closeNewModal : categoryStore.closeHabitFormModal;

  const { isOpen, mode, habitId, categoryId: propsCategory, timeBlockId: propsTimeBlock, importanceLevelId: propsImportanceLevel } = useHabitsPage
    ? { isOpen: modalState.isOpen, mode: 'new', habitId: null, categoryId: modalState.categoryId, timeBlockId: modalState.timeBlockId, importanceLevelId: modalState.importanceLevelId }
    : { ...modalState, timeBlockId: null, importanceLevelId: null };

  const [formData, setFormData] = useState({
    name: '',
    target_count: 1,
    frequency_type: 'day',
    time_block_id: '',
    importance_level_id: '',
    category_id: propsCategory || '',
    schedule_mode: 'flexible',
    schedule_config: {},
  });

  // Day names for specific_days mode
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const fullDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [listSearchQuery, setListSearchQuery] = useState('');

  const { openNewModal: openNewDocumentModal } = useDocumentsStore();
  const { openFormModal: openNewListModal, openShowModal: openListShowModal } = useListsStore();

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

  // Fetch categories (only when on habits page)
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.fetchAll,
    enabled: useHabitsPage,
  });

  // Fetch all documents
  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.fetchAll,
  });

  // Fetch lists
  const { data: listsData } = useQuery({
    queryKey: ['lists'],
    queryFn: listsApi.fetchAll,
  });
  const availableLists = listsData?.lists || [];

  // Fetch habit data if editing
  const { data: habit } = useQuery({
    queryKey: ['habit', habitId],
    queryFn: async () => {
      const response = await fetch(`/categories/${formData.category_id || propsCategory}/habits/${habitId}.json`);
      if (!response.ok) throw new Error('Failed to fetch habit');
      return response.json();
    },
    enabled: isOpen && mode === 'edit' && !!habitId && !!(formData.category_id || propsCategory),
  });

  // Load habit data when editing
  useEffect(() => {
    if (habit && mode === 'edit') {
      setFormData({
        name: habit.name || '',
        target_count: habit.target_count || 1,
        frequency_type: habit.frequency_type || 'day',
        time_block_id: habit.time_block_id || '',
        importance_level_id: habit.importance_level_id || '',
        category_id: habit.category_id || propsCategory || '',
        schedule_mode: habit.schedule_mode || 'flexible',
        schedule_config: habit.schedule_config || {},
      });
      setSelectedTags(habit.tags?.map(t => t.name) || []);
      setSelectedDocumentIds(habit.habit_contents?.map(hc => hc.id) || []);
    }
  }, [habit, mode, propsCategory]);

  // Reset form when modal opens for new habit
  useEffect(() => {
    if (isOpen && mode === 'new') {
      setFormData({
        name: '',
        target_count: 1,
        frequency_type: 'day',
        time_block_id: propsTimeBlock || '',
        importance_level_id: propsImportanceLevel || '',
        category_id: propsCategory || '',
        schedule_mode: 'flexible',
        schedule_config: {},
      });
      setSelectedTags([]);
      setSelectedDocumentIds([]);
      setSelectedListIds([]);
      setTagInput('');
      setListSearchQuery('');
    }
  }, [isOpen, mode, propsCategory, propsTimeBlock, propsImportanceLevel]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const targetCategoryId = data.category_id || propsCategory;
      if (!targetCategoryId) {
        throw new Error('Please select a category');
      }
      const response = await fetch(`/categories/${targetCategoryId}/habits`, {
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
      if (useHabitsPage) {
        await queryClient.invalidateQueries({ queryKey: ['habits'] });
      } else {
        await queryClient.invalidateQueries({ queryKey: ['category', propsCategory] });
      }
      closeModal();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const targetCategoryId = data.category_id || propsCategory;
      const response = await fetch(`/categories/${targetCategoryId}/habits/${habitId}`, {
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
      if (useHabitsPage) {
        await queryClient.invalidateQueries({ queryKey: ['habits'] });
      } else {
        await queryClient.invalidateQueries({ queryKey: ['category', propsCategory] });
      }
      await queryClient.invalidateQueries({ queryKey: ['habit', habitId] });
      closeModal();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const targetCategoryId = formData.category_id || propsCategory;
      const response = await fetch(`/categories/${targetCategoryId}/habits/${habitId}`, {
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
      if (useHabitsPage) {
        await queryClient.invalidateQueries({ queryKey: ['habits'] });
      } else {
        queryClient.setQueriesData(
          { queryKey: ['category', propsCategory], exact: false },
          (oldData) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              habits: oldData.habits.filter(h => h.id !== habitId)
            };
          }
        );
      }
      await queryClient.invalidateQueries({ queryKey: ['habit', habitId] });
      closeModal();
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
      list_attachment_ids: selectedListIds,
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
          className="btn-delete-icon"
          disabled={deleteMutation.isPending}
          title="Delete habit"
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
        onClick={closeModal}
        className="btn-liquid-outline-light"
        disabled={currentMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="habit-form"
        className="btn-liquid"
        disabled={currentMutation.isPending || (useHabitsPage && !formData.category_id && !propsCategory)}
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
    <SlideOverPanel
      isOpen={isOpen}
      onClose={closeModal}
      title={mode === 'edit' ? 'Edit Habit' : 'Create a New Habit'}
      footer={footer}
    >
      <form id="habit-form" onSubmit={handleSubmit}>
        {currentMutation.isError && (
          <div className="form-error">
            <i className="fa-solid fa-circle-exclamation form-error-icon"></i>
            <span className="form-error-text">
              {currentMutation.error?.message || 'An error occurred'}
            </span>
          </div>
        )}

        {/* ==================== BASICS SECTION ==================== */}
        <Section title="Basics">
          {/* Habit Name */}
          <div className="mb-4">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="form-input-hero"
              placeholder="Habit name..."
            />
          </div>

          {/* Category Picker (only on habits page) */}
          {useHabitsPage && (
            <div className="mb-4">
              <label className="form-label">
                Category <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div className="button-bar flex-wrap">
                {categories?.map((category) => {
                  const isActive = formData.category_id === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category_id: category.id })}
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
          )}

          {/* Schedule Mode */}
          <div>
            <label className="form-label">
              Schedule
            </label>

            {/* Mode Toggle Pills */}
            <div className="button-bar mb-3">
              {[
                { value: 'flexible', label: 'Flexible', icon: 'fa-shuffle' },
                { value: 'specific_days', label: 'Specific Days', icon: 'fa-calendar-week' },
                { value: 'interval', label: 'Interval', icon: 'fa-repeat' },
              ].map((scheduleMode) => {
                const isActive = formData.schedule_mode === scheduleMode.value;
                return (
                  <button
                    key={scheduleMode.value}
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      schedule_mode: scheduleMode.value,
                      schedule_config: scheduleMode.value === 'specific_days' ? { days_of_week: [] } :
                                       scheduleMode.value === 'interval' ? { interval_days: 2, anchor_date: new Date().toISOString().split('T')[0] } : {}
                    })}
                    className={`flex items-center gap-2 px-4 py-2.5 ${isActive ? 'liquid-surface-subtle' : ''}`}
                    style={isActive ? { '--surface-color': '#2C2C2E' } : {}}
                  >
                    <i className={`fa-solid ${scheduleMode.icon} text-xs`} style={{ color: isActive ? 'white' : '#8E8E93' }}></i>
                    {scheduleMode.label}
                  </button>
                );
              })}
            </div>

            {/* Flexible Mode - Times per Period (inline) */}
            {formData.schedule_mode === 'flexible' && (
              <div className="form-inline-config">
                <input
                  type="number"
                  value={formData.target_count}
                  onChange={(e) =>
                    setFormData({ ...formData, target_count: parseInt(e.target.value) || 1 })
                  }
                  min="1"
                  className="w-14 text-center form-input-sm"
                />
                <span style={{ fontWeight: 400 }}>times per</span>
                <select
                  value={formData.frequency_type}
                  onChange={(e) => setFormData({ ...formData, frequency_type: e.target.value })}
                  className="form-input-sm"
                >
                  <option value="day">day</option>
                  <option value="week">week</option>
                  <option value="month">month</option>
                  <option value="year">year</option>
                </select>
              </div>
            )}

            {/* Specific Days Mode */}
            {formData.schedule_mode === 'specific_days' && (
              <div className="flex flex-wrap gap-3 items-center">
                {/* Preset Buttons */}
                <div className="button-bar">
                  {[
                    { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
                    { label: 'Weekends', days: [0, 6] },
                    { label: 'MWF', days: [1, 3, 5] },
                    { label: 'T/Th', days: [2, 4] },
                  ].map((preset) => {
                    const currentDays = formData.schedule_config?.days_of_week || [];
                    const isActive = JSON.stringify([...currentDays].sort()) === JSON.stringify([...preset.days].sort());
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          schedule_config: { ...formData.schedule_config, days_of_week: preset.days }
                        })}
                        className={`px-4 h-10 text-xs font-semibold ${isActive ? 'liquid-surface-subtle' : ''}`}
                        style={isActive ? { '--surface-color': '#2C2C2E' } : {}}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Day Toggle Grid */}
                <div className="button-bar">
                  {dayNames.map((day, index) => {
                    const selectedDays = formData.schedule_config?.days_of_week || [];
                    const isSelected = selectedDays.includes(index);
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          const newDays = isSelected
                            ? selectedDays.filter(d => d !== index)
                            : [...selectedDays, index];
                          setFormData({
                            ...formData,
                            schedule_config: { ...formData.schedule_config, days_of_week: newDays }
                          });
                        }}
                        className={`w-10 h-10 font-semibold text-sm ${isSelected ? 'liquid-surface-subtle' : ''}`}
                        style={isSelected ? { '--surface-color': '#2C2C2E' } : {}}
                        title={fullDayNames[index]}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Interval Mode */}
            {formData.schedule_mode === 'interval' && (
              <div className="form-inline-config">
                <span style={{ fontWeight: 400 }}>Every</span>
                <input
                  type="number"
                  value={formData.schedule_config?.interval_days || 2}
                  onChange={(e) => setFormData({
                    ...formData,
                    schedule_config: {
                      ...formData.schedule_config,
                      interval_days: parseInt(e.target.value) || 2,
                      anchor_date: formData.schedule_config?.anchor_date || new Date().toISOString().split('T')[0]
                    }
                  })}
                  min="1"
                  className="w-14 px-2 py-1.5 rounded-lg focus:outline-none transition text-center bg-white text-sm"
                  style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 500, color: '#1D1D1F' }}
                />
                <select
                  value={formData.schedule_config?.interval_unit || 'days'}
                  onChange={(e) => setFormData({
                    ...formData,
                    schedule_config: {
                      ...formData.schedule_config,
                      interval_unit: e.target.value,
                      anchor_date: formData.schedule_config?.anchor_date || new Date().toISOString().split('T')[0]
                    }
                  })}
                  className="form-input-sm"
                >
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                </select>
              </div>
            )}
          </div>
        </Section>

        {/* ==================== PRIORITY SECTION ==================== */}
        <Section title="Priority">

          {/* Time Block */}
          <div className="mb-4">
            <label className="form-label">
              Time Block
            </label>
            <div className="button-bar">
              {/* Anytime option */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, time_block_id: '' })}
                className={`flex items-center gap-2 px-4 py-2.5 ${formData.time_block_id === '' ? 'liquid-surface-subtle' : ''}`}
                style={formData.time_block_id === '' ? { '--surface-color': '#1D1D1F' } : {}}
              >
                <i
                  className="fa-solid fa-clock text-sm"
                  style={{ color: formData.time_block_id === '' ? 'white' : '#8E8E93' }}
                ></i>
                <span className="bar-item-text" style={{ color: formData.time_block_id === '' ? 'white' : '#1D1D1F' }}>
                  Anytime
                </span>
              </button>

              {timeBlocks.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, time_block_id: block.id })}
                  className={`flex items-center gap-2 px-4 py-2.5 ${formData.time_block_id === block.id ? 'liquid-surface-subtle' : ''}`}
                  style={formData.time_block_id === block.id ? { '--surface-color': block.color } : {}}
                >
                  <i
                    className={`${block.icon} text-sm`}
                    style={{ color: formData.time_block_id === block.id ? 'white' : block.color }}
                  ></i>
                  <span className="bar-item-text" style={{ color: formData.time_block_id === block.id ? 'white' : '#1D1D1F' }}>
                    {block.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Importance Level */}
          <div className="mb-4">
            <label className="form-label">
              Importance Level
            </label>
            <div className="button-bar">
              {importanceLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, importance_level_id: level.id })}
                  className={`flex items-center gap-2 px-4 py-2.5 ${formData.importance_level_id === level.id ? 'liquid-surface-subtle' : ''}`}
                  style={formData.importance_level_id === level.id ? { '--surface-color': level.color } : {}}
                >
                  <i
                    className={`${level.icon} text-sm`}
                    style={{ color: formData.importance_level_id === level.id ? 'white' : level.color }}
                  ></i>
                  <span className="bar-item-text" style={{ color: formData.importance_level_id === level.id ? 'white' : '#1D1D1F' }}>
                    {level.name}
                  </span>
                </button>
              ))}
            </div>
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

        {/* ==================== ATTACHMENTS SECTION ==================== */}
        <Section title="Attachments" isLast={true}>
          <div className="grid grid-cols-2 gap-4">
            {/* Documents */}
            <div>
              <label className="form-label">
                <i className="fa-solid fa-file-lines mr-2 text-xs" style={{ color: '#8E8E93' }}></i>
                Documents
              </label>
              <div>
                <input
                  type="text"
                  value={documentSearchQuery}
                  onChange={(e) => setDocumentSearchQuery(e.target.value)}
                  className="form-input mb-2 text-sm"
                  placeholder="Search..."
                />
                {documents.length > 0 ? (
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {documents
                      .filter((doc) => {
                        const query = documentSearchQuery.toLowerCase();
                        return doc.title.toLowerCase().includes(query);
                      })
                      .map((doc) => (
                        <label
                          key={doc.id}
                          className="checkbox-row"
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
                          <span className="text-sm flex-1 truncate" style={{ color: '#1D1D1F' }}>
                            {doc.title}
                          </span>
                        </label>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-center py-2" style={{ color: '#8E8E93' }}>
                    No documents
                  </p>
                )}
                <button
                  type="button"
                  onClick={openNewDocumentModal}
                  className="btn-add-dashed mt-2"
                >
                  <i className="fa-solid fa-plus" style={{ fontSize: '0.6rem' }}></i>
                  Add document
                </button>
              </div>
            </div>

            {/* Lists */}
            <div>
              <label className="form-label">
                <i className="fa-solid fa-list-check mr-2 text-xs" style={{ color: '#8E8E93' }}></i>
                Lists
                <span className="ml-1 text-xs font-normal" style={{ color: '#8E8E93' }}>(daily reset)</span>
              </label>
              <div>
                <input
                  type="text"
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  className="form-input mb-2 text-sm"
                  placeholder="Search..."
                />
                {availableLists.length > 0 ? (
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {availableLists
                      .filter((list) => {
                        const query = listSearchQuery.toLowerCase();
                        if (!query) return true;
                        return list.name.toLowerCase().includes(query) || list.category?.name?.toLowerCase().includes(query);
                      })
                      .map((list) => (
                        <label
                          key={list.id}
                          className="checkbox-row"
                        >
                          <input
                            type="checkbox"
                            checked={selectedListIds.includes(list.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedListIds([...selectedListIds, list.id]);
                              } else {
                                setSelectedListIds(selectedListIds.filter(id => id !== list.id));
                              }
                            }}
                            className="w-4 h-4 rounded cursor-pointer"
                            style={{ accentColor: '#2C2C2E' }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openListShowModal(list.id);
                            }}
                            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: list.category?.color || '#1D1D1F' }}
                            title="Preview list"
                          >
                            <i className={`fa-solid ${list.category?.icon || 'fa-list-check'} text-white`} style={{ fontSize: '0.6rem' }}></i>
                          </button>
                          <span className="text-sm flex-1 truncate" style={{ color: '#1D1D1F' }}>
                            {list.name}
                          </span>
                        </label>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-center py-2" style={{ color: '#8E8E93' }}>
                    No lists
                  </p>
                )}
                <button
                  type="button"
                  onClick={openNewListModal}
                  className="btn-add-dashed mt-2"
                >
                  <i className="fa-solid fa-plus" style={{ fontSize: '0.6rem' }}></i>
                  Add list
                </button>
              </div>
            </div>
          </div>
        </Section>
      </form>
    </SlideOverPanel>
  );
};

export default HabitFormModal;
