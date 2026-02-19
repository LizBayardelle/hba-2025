import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import useHabitsStore from '../../stores/habitsStore';
import useDocumentsStore from '../../stores/documentsStore';
import useListsStore from '../../stores/listsStore';
import ListShowModal from '../lists/ListShowModal';
import { tagsApi, documentsApi, categoriesApi, listsApi } from '../../utils/api';

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

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const fullDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [selectedListIds, setSelectedListIds] = useState([]);

  // Save status tracking
  const [saveStatus, setSaveStatus] = useState(null);
  const saveTimeoutRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const closeAfterSaveRef = useRef(false);
  const pendingSaveDataRef = useRef(null);
  const dataLoadedRef = useRef(false);

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

  // Load habit data (only on initial load, not after autosave refetches)
  useEffect(() => {
    if (habit && isOpen && !dataLoadedRef.current) {
      dataLoadedRef.current = true;
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

  // Reset refs when modal opens
  useEffect(() => {
    if (isOpen) {
      dataLoadedRef.current = false;
      closeAfterSaveRef.current = false;
      setSaveStatus(null);
    }
  }, [isOpen]);

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

  // Build habit data for saving
  const buildHabitData = useCallback((overrides = {}) => {
    const { tags: overrideTags, habit_content_ids: overrideDocIds, list_attachment_ids: overrideListIds, ...formOverrides } = overrides;
    const currentFormData = { ...formData, ...formOverrides };
    const currentTags = overrideTags !== undefined ? overrideTags : selectedTags;
    const currentDocIds = overrideDocIds !== undefined ? overrideDocIds : selectedDocumentIds;
    const currentListIds = overrideListIds !== undefined ? overrideListIds : selectedListIds;

    return {
      ...currentFormData,
      tag_names: currentTags,
      habit_content_ids: currentDocIds,
      list_attachment_ids: currentListIds,
    };
  }, [formData, selectedTags, selectedDocumentIds, selectedListIds]);

  // Update mutation (autosave)
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
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
      if (closeAfterSaveRef.current) {
        closeAfterSaveRef.current = false;
        closeEditModal();
      } else {
        showSavedStatus();
      }
    },
    onError: () => {
      setSaveStatus('error');
      if (closeAfterSaveRef.current) {
        closeAfterSaveRef.current = false;
        closeEditModal();
      }
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
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
      closeEditModal();
    },
  });

  // Auto-save (debounced, for text/number inputs)
  const autoSave = useCallback((overrides = {}) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    const nameVal = overrides.name !== undefined ? overrides.name : formData.name;
    if (!nameVal.trim()) return;

    setSaveStatus('saving');
    pendingSaveDataRef.current = overrides;
    debounceTimeoutRef.current = setTimeout(() => {
      pendingSaveDataRef.current = null;
      const data = buildHabitData(overrides);
      updateMutation.mutate(data);
    }, 500);
  }, [formData, buildHabitData, updateMutation]);

  // Immediate save (for selections/toggles)
  const immediateSave = useCallback((overrides = {}) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
      pendingSaveDataRef.current = null;
    }

    const nameVal = overrides.name !== undefined ? overrides.name : formData.name;
    if (!nameVal.trim()) return;

    setSaveStatus('saving');
    const data = buildHabitData(overrides);
    updateMutation.mutate(data);
  }, [formData, buildHabitData, updateMutation]);

  // Handle close — flush any pending debounced save first
  const handleClose = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
      const overrides = pendingSaveDataRef.current || {};
      pendingSaveDataRef.current = null;
      closeAfterSaveRef.current = true;
      const data = buildHabitData(overrides);
      updateMutation.mutate(data);
      return;
    }

    if (updateMutation.isPending) {
      closeAfterSaveRef.current = true;
      return;
    }

    closeEditModal();
  };

  // Tag handlers
  const handleAddTag = (tagName) => {
    const trimmedTag = tagName.trim();
    if (trimmedTag && !selectedTags.some(tag => tag.toLowerCase() === trimmedTag.toLowerCase())) {
      const newTags = [...selectedTags, trimmedTag];
      setSelectedTags(newTags);
      if (formData.name.trim()) {
        immediateSave({ tags: newTags });
      }
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
    const newTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(newTags);
    if (formData.name.trim()) {
      immediateSave({ tags: newTags });
    }
  };

  const filteredSuggestions = (allTags || [])
    .filter(tag =>
      tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !selectedTags.some(selectedTag => selectedTag.toLowerCase() === tag.name.toLowerCase())
    )
    .slice(0, 5);

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this habit?')) {
      deleteMutation.mutate();
    }
  };

  // Status indicator
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

  // Header actions: grey trash + save status
  const headerActions = (
    <>
      <button
        type="button"
        onClick={handleDelete}
        className="w-8 h-8 rounded-lg transition hover:bg-gray-100 flex items-center justify-center"
        disabled={deleteMutation.isPending}
        title="Delete habit"
      >
        {deleteMutation.isPending ? (
          <i className="fa-solid fa-spinner fa-spin text-sm" style={{ color: '#8E8E93' }}></i>
        ) : (
          <i className="fa-solid fa-trash text-sm" style={{ color: '#8E8E93' }}></i>
        )}
      </button>
      <StatusIndicator />
    </>
  );

  return (
    <>
      <SlideOverPanel
        isOpen={isOpen}
        onClose={handleClose}
        title="Edit Habit"
        headerActions={headerActions}
      >
        {/* ==================== BASICS SECTION ==================== */}
        <Section title="Basics">

          {/* Habit Name */}
          <div className="mb-4">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                const newName = e.target.value;
                setFormData(prev => ({ ...prev, name: newName }));
                autoSave({ name: newName });
              }}
              className="form-input-hero"
              placeholder="Habit name..."
            />
          </div>

          {/* Category */}
          <div className="mb-4">
            <label className="form-label">
              Category
            </label>
            <div className="button-bar flex-wrap">
              {categories.map((category) => {
                const isActive = formData.category_id === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, category_id: category.id }));
                      immediateSave({ category_id: category.id });
                    }}
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
                    onClick={() => {
                      const newConfig = scheduleMode.value === 'specific_days' ? { days_of_week: [] } :
                                       scheduleMode.value === 'interval' ? { interval_days: 2, anchor_date: new Date().toISOString().split('T')[0] } : {};
                      setFormData(prev => ({
                        ...prev,
                        schedule_mode: scheduleMode.value,
                        schedule_config: newConfig,
                      }));
                      immediateSave({ schedule_mode: scheduleMode.value, schedule_config: newConfig });
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 ${isActive ? 'liquid-surface-subtle' : ''}`}
                    style={isActive ? { '--surface-color': '#2C2C2E' } : {}}
                  >
                    <i className={`fa-solid ${scheduleMode.icon} text-xs`} style={{ color: isActive ? 'white' : '#8E8E93' }}></i>
                    {scheduleMode.label}
                  </button>
                );
              })}
            </div>

            {/* Flexible Mode */}
            {formData.schedule_mode === 'flexible' && (
              <div className="form-inline-config">
                <input
                  type="number"
                  value={formData.target_count}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setFormData(prev => ({ ...prev, target_count: val }));
                    autoSave({ target_count: val });
                  }}
                  min="1"
                  className="w-14 text-center form-input-sm"
                />
                <span style={{ fontWeight: 400 }}>times per</span>
                <select
                  value={formData.frequency_type}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({ ...prev, frequency_type: val }));
                    immediateSave({ frequency_type: val });
                  }}
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
                        onClick={() => {
                          const newConfig = { ...formData.schedule_config, days_of_week: preset.days };
                          setFormData(prev => ({ ...prev, schedule_config: newConfig }));
                          immediateSave({ schedule_config: newConfig });
                        }}
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
                          const newConfig = { ...formData.schedule_config, days_of_week: newDays };
                          setFormData(prev => ({ ...prev, schedule_config: newConfig }));
                          immediateSave({ schedule_config: newConfig });
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
                  onChange={(e) => {
                    const newConfig = {
                      ...formData.schedule_config,
                      interval_days: parseInt(e.target.value) || 2,
                      anchor_date: formData.schedule_config?.anchor_date || new Date().toISOString().split('T')[0],
                    };
                    setFormData(prev => ({ ...prev, schedule_config: newConfig }));
                    autoSave({ schedule_config: newConfig });
                  }}
                  min="1"
                  className="w-14 text-center form-input-sm"
                />
                <span style={{ fontWeight: 400 }}>days</span>
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
            <div className="button-bar flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, time_block_id: '' }));
                  immediateSave({ time_block_id: '' });
                }}
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
              {timeBlocks.map((block) => {
                const isActive = formData.time_block_id === block.id;
                return (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, time_block_id: block.id }));
                      immediateSave({ time_block_id: block.id });
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 ${isActive ? 'liquid-surface-subtle' : ''}`}
                    style={isActive ? { '--surface-color': block.color } : {}}
                  >
                    <i
                      className={`${block.icon} text-sm`}
                      style={{ color: isActive ? 'white' : block.color }}
                    ></i>
                    <span className="bar-item-text" style={{ color: isActive ? 'white' : '#1D1D1F' }}>
                      {block.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Importance Level */}
          <div className="mb-4">
            <label className="form-label">
              Importance Level
            </label>
            <div className="button-bar flex-wrap">
              {importanceLevels.map((level) => {
                const isActive = formData.importance_level_id === level.id;
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, importance_level_id: level.id }));
                      immediateSave({ importance_level_id: level.id });
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 ${isActive ? 'liquid-surface-subtle' : ''}`}
                    style={isActive ? { '--surface-color': level.color } : {}}
                  >
                    <i
                      className={`${level.icon} text-sm`}
                      style={{ color: isActive ? 'white' : level.color }}
                    ></i>
                    <span className="bar-item-text" style={{ color: isActive ? 'white' : '#1D1D1F' }}>
                      {level.name}
                    </span>
                  </button>
                );
              })}
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
                      .filter((doc) => doc.title.toLowerCase().includes(documentSearchQuery.toLowerCase()))
                      .map((doc) => (
                        <label key={doc.id} className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={selectedDocumentIds.includes(doc.id)}
                            onChange={(e) => {
                              const newDocIds = e.target.checked
                                ? [...selectedDocumentIds, doc.id]
                                : selectedDocumentIds.filter(id => id !== doc.id);
                              setSelectedDocumentIds(newDocIds);
                              if (formData.name.trim()) {
                                immediateSave({ habit_content_ids: newDocIds });
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
                        <label key={list.id} className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={selectedListIds.includes(list.id)}
                            onChange={(e) => {
                              const newListIds = e.target.checked
                                ? [...selectedListIds, list.id]
                                : selectedListIds.filter(id => id !== list.id);
                              setSelectedListIds(newListIds);
                              if (formData.name.trim()) {
                                immediateSave({ list_attachment_ids: newListIds });
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
                  className="btn-add-dashed mt-2"
                >
                  <i className="fa-solid fa-plus" style={{ fontSize: '0.6rem' }}></i>
                  Add list
                </button>
              </div>
            </div>
          </div>
        </Section>
      </SlideOverPanel>

      <ListShowModal />
    </>
  );
};

export default HabitEditModal;
