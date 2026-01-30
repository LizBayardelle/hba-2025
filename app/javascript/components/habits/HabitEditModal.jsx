import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import useHabitsStore from '../../stores/habitsStore';
import useDocumentsStore from '../../stores/documentsStore';
import useListsStore from '../../stores/listsStore';
import ListShowModal from '../lists/ListShowModal';
import { tagsApi, documentsApi, categoriesApi, listsApi } from '../../utils/api';

// Helper to darken a hex color
const darkenColor = (hex, percent = 30) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max((num >> 16) - amt, 0);
  const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
  const B = Math.max((num & 0x0000FF) - amt, 0);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
};

// Section Component with header and boxed content
const Section = ({ icon, title, children, isLast = false }) => (
  <div className={!isLast ? 'mb-5' : ''}>
    {/* Compact header */}
    <div className="flex items-center gap-2 mb-2">
      <i className={`fa-solid ${icon} text-xs`} style={{ color: '#8E8E93' }}></i>
      <span className="text-xs uppercase tracking-wide" style={{ color: '#8E8E93', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
        {title}
      </span>
    </div>
    {/* Boxed content */}
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: '#F9F9FB', border: '1px solid rgba(199, 199, 204, 0.25)' }}
    >
      {children}
    </div>
  </div>
);

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
    category_id: '',
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
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [selectedListIds, setSelectedListIds] = useState([]);

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

  // Fetch all documents
  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.fetchAll,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.fetchAll,
  });

  // Fetch lists
  const { data: listsData } = useQuery({
    queryKey: ['lists'],
    queryFn: listsApi.fetchAll,
  });
  const availableLists = listsData?.lists || [];

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
        category_id: habit.category_id || categoryId || '',
        schedule_mode: habit.schedule_mode || 'flexible',
        schedule_config: habit.schedule_config || {},
      });
      setSelectedTags(habit.tags?.map(t => t.name) || []);
      setSelectedDocumentIds(habit.habit_contents?.map(hc => hc.id) || []);
      setSelectedListIds(habit.list_attachments?.map(la => la.list_id) || []);
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
      await queryClient.invalidateQueries({ queryKey: ['habit', habitId] });
      await queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
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
      await queryClient.invalidateQueries({ queryKey: ['habit', habitId] });
      await queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
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
      list_attachment_ids: selectedListIds,
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
        className="px-6 py-3 rounded-lg transition hover:bg-gray-100"
        style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F', border: '0.5px solid rgba(199, 199, 204, 0.3)', backgroundColor: 'white' }}
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
  <>
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

        {/* ==================== BASICS SECTION ==================== */}
        <Section icon="fa-cube" title="Basics">

          {/* Habit Name */}
          <div className="mb-4">
            <label className="block mb-2 text-sm" style={{ fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
              Habit Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-lg focus:outline-none transition"
              style={{ backgroundColor: 'white', border: '1px solid rgba(199, 199, 204, 0.4)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
              placeholder="e.g., Morning meditation"
            />
          </div>

          {/* Category */}
          <div className="mb-4">
            <label className="block mb-2 text-sm" style={{ fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, category_id: category.id })}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full transition hover:scale-105"
                  style={{
                    backgroundColor: formData.category_id === category.id ? category.color : 'white',
                    border: '1px solid ' + (formData.category_id === category.id ? category.color : 'rgba(199, 199, 204, 0.4)'),
                  }}
                >
                  <i
                    className={`fa-solid ${category.icon} text-sm`}
                    style={{ color: formData.category_id === category.id ? 'white' : category.color }}
                  ></i>
                  <span style={{
                    fontWeight: 500,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.8125rem',
                    color: formData.category_id === category.id ? 'white' : '#1D1D1F',
                  }}>
                    {category.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Mode */}
          <div>
            <label className="block mb-2 text-sm" style={{ fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
              Schedule
            </label>

            {/* Mode Toggle Pills */}
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { value: 'flexible', label: 'Flexible', icon: 'fa-shuffle' },
                { value: 'specific_days', label: 'Specific Days', icon: 'fa-calendar-week' },
                { value: 'interval', label: 'Interval', icon: 'fa-repeat' },
              ].map((scheduleMode) => (
                <button
                  key={scheduleMode.value}
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    schedule_mode: scheduleMode.value,
                    schedule_config: scheduleMode.value === 'specific_days' ? { days_of_week: [] } :
                                     scheduleMode.value === 'interval' ? { interval_days: 2, anchor_date: new Date().toISOString().split('T')[0] } : {}
                  })}
                  className="flex items-center gap-2 px-3 py-2 rounded-full transition hover:scale-105"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: '0.8125rem',
                    backgroundColor: formData.schedule_mode === scheduleMode.value ? '#1D1D1F' : 'white',
                    color: formData.schedule_mode === scheduleMode.value ? 'white' : '#1D1D1F',
                    border: '1px solid ' + (formData.schedule_mode === scheduleMode.value ? '#1D1D1F' : 'rgba(199, 199, 204, 0.4)'),
                  }}
                >
                  <i className={`fa-solid ${scheduleMode.icon} text-xs`}></i>
                  {scheduleMode.label}
                </button>
              ))}
            </div>

            {/* Flexible Mode */}
            {formData.schedule_mode === 'flexible' && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg" style={{ backgroundColor: 'white', border: '1px solid rgba(199, 199, 204, 0.4)' }}>
                <div>
                  <label className="block mb-1 text-xs" style={{ fontWeight: 500, color: '#8E8E93' }}>Times</label>
                  <input
                    type="number"
                    value={formData.target_count}
                    onChange={(e) => setFormData({ ...formData, target_count: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full px-3 py-2 rounded-lg focus:outline-none transition bg-white"
                    style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs" style={{ fontWeight: 500, color: '#8E8E93' }}>Per</label>
                  <select
                    value={formData.frequency_type}
                    onChange={(e) => setFormData({ ...formData, frequency_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg focus:outline-none transition bg-white"
                    style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>
              </div>
            )}

            {/* Specific Days Mode */}
            {formData.schedule_mode === 'specific_days' && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'white', border: '1px solid rgba(199, 199, 204, 0.4)' }}>
                <div className="flex flex-wrap gap-2 mb-3">
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
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition"
                        style={{
                          backgroundColor: isActive ? '#1D1D1F' : 'white',
                          color: isActive ? 'white' : '#1D1D1F',
                          border: '1px solid ' + (isActive ? '#1D1D1F' : 'rgba(199, 199, 204, 0.4)'),
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
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
                        className="w-9 h-9 rounded-lg font-semibold text-sm transition"
                        style={{
                          backgroundColor: isSelected ? '#1D1D1F' : 'white',
                          color: isSelected ? 'white' : '#1D1D1F',
                          border: '1px solid ' + (isSelected ? '#1D1D1F' : 'rgba(199, 199, 204, 0.4)'),
                        }}
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
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'white', border: '1px solid rgba(199, 199, 204, 0.4)' }}>
                <span style={{ fontWeight: 500, color: '#1D1D1F' }}>Every</span>
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
                  className="w-16 px-3 py-2 rounded-lg focus:outline-none transition text-center bg-white"
                  style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
                />
                <span style={{ fontWeight: 500, color: '#1D1D1F' }}>days</span>
              </div>
            )}
          </div>
        </Section>

        {/* ==================== PRIORITY SECTION ==================== */}
        <Section icon="fa-sliders" title="Priority">

          {/* Time Block */}
          <div className="mb-4">
            <label className="block mb-2 text-sm" style={{ fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
              Time Block
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, time_block_id: '' })}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full transition hover:scale-105"
                style={{
                  backgroundColor: formData.time_block_id === '' ? '#1D1D1F' : 'white',
                  border: '1px solid ' + (formData.time_block_id === '' ? '#1D1D1F' : 'rgba(199, 199, 204, 0.4)'),
                }}
              >
                <i
                  className="fa-solid fa-clock text-sm"
                  style={{ color: formData.time_block_id === '' ? 'white' : '#1D1D1F' }}
                ></i>
                <span style={{ fontWeight: 500, fontSize: '0.8125rem', color: formData.time_block_id === '' ? 'white' : '#1D1D1F' }}>
                  Anytime
                </span>
              </button>
              {timeBlocks.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, time_block_id: block.id })}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full transition hover:scale-105"
                  style={{
                    backgroundColor: formData.time_block_id === block.id ? block.color : 'white',
                    border: '1px solid ' + (formData.time_block_id === block.id ? block.color : 'rgba(199, 199, 204, 0.4)'),
                  }}
                >
                  <i
                    className={`${block.icon} text-sm`}
                    style={{ color: formData.time_block_id === block.id ? 'white' : block.color }}
                  ></i>
                  <span style={{ fontWeight: 500, fontSize: '0.8125rem', color: formData.time_block_id === block.id ? 'white' : '#1D1D1F' }}>
                    {block.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Importance Level */}
          <div className="mb-4">
            <label className="block mb-2 text-sm" style={{ fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
              Importance Level
            </label>
            <div className="flex flex-wrap gap-2">
              {importanceLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, importance_level_id: level.id })}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full transition hover:scale-105"
                  style={{
                    backgroundColor: formData.importance_level_id === level.id ? level.color : 'white',
                    border: '1px solid ' + (formData.importance_level_id === level.id ? level.color : 'rgba(199, 199, 204, 0.4)'),
                  }}
                >
                  <i
                    className={`${level.icon} text-sm`}
                    style={{ color: formData.importance_level_id === level.id ? 'white' : level.color }}
                  ></i>
                  <span style={{ fontWeight: 500, fontSize: '0.8125rem', color: formData.importance_level_id === level.id ? 'white' : '#1D1D1F' }}>
                    {level.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block mb-2 text-sm" style={{ fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
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
                className="w-full px-4 py-2 rounded-lg focus:outline-none transition"
                style={{ backgroundColor: 'white', border: '1px solid rgba(199, 199, 204, 0.4)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
                placeholder="Type to add tags..."
              />

              {showTagSuggestions && (filteredSuggestions.length > 0 || tagInput.trim()) && (
                <div
                  className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg max-h-40 overflow-y-auto"
                  style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
                >
                  {filteredSuggestions.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleAddTag(tag.name)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition text-sm"
                      style={{ color: '#1D1D1F' }}
                    >
                      {tag.name}
                    </button>
                  ))}
                  {tagInput.trim() && !filteredSuggestions.find(t => t.name.toLowerCase() === tagInput.toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => handleAddTag(tagInput)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition border-t text-sm"
                      style={{ borderColor: 'rgba(199, 199, 204, 0.3)', color: '#1D1D1F' }}
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
                    className="text-xs px-3 py-1.5 rounded-full flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)', color: '#FFFFFF', fontWeight: 600 }}
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
        <Section icon="fa-paperclip" title="Attachments" isLast={true}>
          <div className="grid grid-cols-2 gap-4">
            {/* Documents */}
            <div>
              <label className="block mb-2 text-sm" style={{ fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
                <i className="fa-solid fa-file-lines mr-2 text-xs" style={{ color: '#8E8E93' }}></i>
                Documents
              </label>
              <div className="rounded-lg p-3" style={{ backgroundColor: 'white', border: '1px solid rgba(199, 199, 204, 0.4)' }}>
                <input
                  type="text"
                  value={documentSearchQuery}
                  onChange={(e) => setDocumentSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 mb-2 rounded-lg focus:outline-none transition text-sm"
                  style={{ backgroundColor: '#F9F9FB', border: '1px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
                  placeholder="Search..."
                />
                {documents.length > 0 ? (
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {documents
                      .filter((doc) => doc.title.toLowerCase().includes(documentSearchQuery.toLowerCase()))
                      .map((doc) => (
                        <label key={doc.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
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
                          <span className="text-sm flex-1 truncate" style={{ color: '#1D1D1F' }}>{doc.title}</span>
                        </label>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-center py-2" style={{ color: '#8E8E93' }}>No documents</p>
                )}
                <button
                  type="button"
                  onClick={openNewDocumentModal}
                  className="mt-2 w-full px-2 py-1.5 rounded-lg hover:bg-gray-50 transition text-xs flex items-center justify-center gap-1"
                  style={{ fontWeight: 500, color: '#8E8E93', border: '1px dashed rgba(199, 199, 204, 0.5)' }}
                >
                  <i className="fa-solid fa-plus"></i>
                  New
                </button>
              </div>
            </div>

            {/* Lists */}
            <div>
              <label className="block mb-2 text-sm" style={{ fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
                <i className="fa-solid fa-list-check mr-2 text-xs" style={{ color: '#8E8E93' }}></i>
                Lists
                <span className="ml-1 text-xs font-normal" style={{ color: '#8E8E93' }}>(daily reset)</span>
              </label>
              <div className="rounded-lg p-3" style={{ backgroundColor: 'white', border: '1px solid rgba(199, 199, 204, 0.4)' }}>
                <input
                  type="text"
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 mb-2 rounded-lg focus:outline-none transition text-sm"
                  style={{ backgroundColor: '#F9F9FB', border: '1px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
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
                        <label key={list.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
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
                            style={{ backgroundColor: list.category?.color || '#1d3e4c' }}
                            title="Preview list"
                          >
                            <i className={`fa-solid ${list.category?.icon || 'fa-list-check'} text-white`} style={{ fontSize: '0.6rem' }}></i>
                          </button>
                          <span className="text-sm flex-1 truncate" style={{ color: '#1D1D1F' }}>{list.name}</span>
                        </label>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-center py-2" style={{ color: '#8E8E93' }}>No lists</p>
                )}
                <button
                  type="button"
                  onClick={openNewListModal}
                  className="mt-2 w-full px-2 py-1.5 rounded-lg hover:bg-gray-50 transition text-xs flex items-center justify-center gap-1"
                  style={{ fontWeight: 500, color: '#8E8E93', border: '1px dashed rgba(199, 199, 204, 0.5)' }}
                >
                  <i className="fa-solid fa-plus"></i>
                  New
                </button>
              </div>
            </div>
          </div>
        </Section>
      </form>
    </BaseModal>

    <ListShowModal />
  </>
  );
};

export default HabitEditModal;
