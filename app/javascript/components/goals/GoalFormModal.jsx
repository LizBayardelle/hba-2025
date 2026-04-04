import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import ChecklistSection from '../shared/ChecklistSection';
import ListShowModal from '../lists/ListShowModal';
import { goalsApi, documentsApi, listsApi } from '../../utils/api';
import useGoalsStore from '../../stores/goalsStore';
import useDocumentsStore from '../../stores/documentsStore';
import useListsStore from '../../stores/listsStore';

const Section = ({ title, children, isLast = false }) => (
  <div className={!isLast ? 'mb-5' : ''}>
    <div className="v2-card" style={{ padding: 0 }}>
      <div style={{ padding: '10px 18px 6px' }}><span className="v2-section-label">{title}</span></div>
      <div style={{ padding: '0 18px 16px' }}>{children}</div>
    </div>
  </div>
);

const GoalFormModal = ({ allTags, categories }) => {
  const { formModal, closeFormModal } = useGoalsStore();
  const { isOpen, mode, goalId, categoryId: initialCategoryId, importanceLevelId: initialImportanceLevelId, timeBlockId: initialTimeBlockId } = formModal;
  const queryClient = useQueryClient();

  const { openNewModal: openNewDocumentModal } = useDocumentsStore();
  const { openFormModal: openNewListModal, openShowModal: openListShowModal } = useListsStore();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goal_type: 'counted',
    target_count: 1,
    unit_name: '',
    category_id: '',
    importance_level_id: '',
    time_block_id: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [selectedListIds, setSelectedListIds] = useState([]);

  // Autosave infrastructure (edit mode only)
  const [saveStatus, setSaveStatus] = useState(null);
  const saveTimeoutRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const closeAfterSaveRef = useRef(false);
  const pendingSaveDataRef = useRef(null);
  const dataLoadedRef = useRef(false);

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

  // Fetch lists
  const { data: listsData } = useQuery({
    queryKey: ['lists'],
    queryFn: listsApi.fetchAll,
  });
  const availableLists = listsData?.lists || [];

  // Fetch goal data if editing
  const { data: goal } = useQuery({
    queryKey: ['goal', goalId],
    queryFn: () => goalsApi.fetchOne(goalId),
    enabled: isOpen && mode === 'edit' && !!goalId,
  });

  // Load goal data when editing (only on initial load, not after autosave refetches)
  useEffect(() => {
    if (goal && mode === 'edit' && !dataLoadedRef.current) {
      dataLoadedRef.current = true;
      setFormData({
        name: goal.name || '',
        description: goal.description || '',
        goal_type: goal.goal_type || 'counted',
        target_count: goal.target_count || 1,
        unit_name: goal.unit_name || '',
        category_id: goal.category_id || '',
        importance_level_id: goal.importance_level_id || '',
        time_block_id: goal.time_block_id || '',
      });
      setSelectedTags(goal.tags?.map(t => t.name) || []);
      setSelectedDocumentIds(goal.goal_contents?.map(tc => tc.id) || []);
      setSelectedListIds(goal.list_attachments?.map(la => la.list_id) || []);
    }
  }, [goal, mode]);

  // Reset form when modal opens for new goal
  useEffect(() => {
    if (isOpen && mode === 'new') {
      setFormData({
        name: '',
        description: '',
        goal_type: 'counted',
        target_count: 1,
        unit_name: '',
        category_id: initialCategoryId || '',
        importance_level_id: initialImportanceLevelId || '',
        time_block_id: initialTimeBlockId || '',
      });
      setSelectedTags([]);
      setTagInput('');
      setSelectedDocumentIds([]);
      setSelectedListIds([]);
      setDocumentSearchQuery('');
      setListSearchQuery('');
    }
  }, [isOpen, mode, initialCategoryId, initialImportanceLevelId, initialTimeBlockId]);

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

  // Build goal data for saving
  const buildGoalData = useCallback((overrides = {}) => {
    const { tags: overrideTags, goal_content_ids: overrideDocIds, list_attachment_ids: overrideListIds, ...formOverrides } = overrides;
    const currentFormData = { ...formData, ...formOverrides };
    const currentTags = overrideTags !== undefined ? overrideTags : selectedTags;
    const currentDocIds = overrideDocIds !== undefined ? overrideDocIds : selectedDocumentIds;
    const currentListIds = overrideListIds !== undefined ? overrideListIds : selectedListIds;

    return {
      ...currentFormData,
      tag_names: currentTags,
      category_id: currentFormData.category_id || null,
      goal_content_ids: currentDocIds,
      list_attachment_ids: currentListIds,
    };
  }, [formData, selectedTags, selectedDocumentIds, selectedListIds]);

  // Create mutation (new mode only)
  const createMutation = useMutation({
    mutationFn: (data) => goalsApi.create({ goal: data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      queryClient.invalidateQueries(['lists']);
      closeFormModal();
    },
  });

  // Update mutation (autosave in edit mode)
  const updateMutation = useMutation({
    mutationFn: (data) => goalsApi.update(goalId, { goal: data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
      await queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
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
    mutationFn: () => goalsApi.delete(goalId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
      await queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      closeFormModal();
    },
  });

  // Auto-save (debounced, for text/number inputs — edit mode only)
  const autoSave = useCallback((overrides = {}) => {
    if (mode !== 'edit') return;
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    const nameVal = overrides.name !== undefined ? overrides.name : formData.name;
    if (!nameVal.trim()) return;

    setSaveStatus('saving');
    pendingSaveDataRef.current = overrides;
    debounceTimeoutRef.current = setTimeout(() => {
      pendingSaveDataRef.current = null;
      const data = buildGoalData(overrides);
      updateMutation.mutate(data);
    }, 500);
  }, [mode, formData, buildGoalData, updateMutation]);

  // Immediate save (for selections/toggles — edit mode only)
  const immediateSave = useCallback((overrides = {}) => {
    if (mode !== 'edit') return;
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
      pendingSaveDataRef.current = null;
    }

    const nameVal = overrides.name !== undefined ? overrides.name : formData.name;
    if (!nameVal.trim()) return;

    setSaveStatus('saving');
    const data = buildGoalData(overrides);
    updateMutation.mutate(data);
  }, [mode, formData, buildGoalData, updateMutation]);

  // Handle close
  const handleClose = () => {
    if (mode === 'edit') {
      // Flush any pending debounced save
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
        const overrides = pendingSaveDataRef.current || {};
        pendingSaveDataRef.current = null;
        closeAfterSaveRef.current = true;
        const data = buildGoalData(overrides);
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
    // Only used in new mode
    const data = buildGoalData();
    createMutation.mutate(data);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      deleteMutation.mutate();
    }
  };

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

  // Field change helper — updates state and triggers autosave
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (mode === 'edit') {
      if (field === 'name' || field === 'description' || field === 'unit_name' || field === 'target_count') {
        autoSave({ [field]: value });
      } else {
        immediateSave({ [field]: value });
      }
    }
  };

  // Status indicator (edit mode)
  const StatusIndicator = () => {
    if (!saveStatus) return null;
    return (
      <div className="flex items-center gap-2 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
        {saveStatus === 'saving' && (
          <>
            <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--ink-tertiary)' }}></i>
            <span style={{ color: 'var(--ink-tertiary)' }}>Saving...</span>
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
            <i className="fa-solid fa-exclamation-circle" style={{ color: 'var(--overdue)' }}></i>
            <span style={{ color: 'var(--overdue)' }}>Error saving</span>
          </>
        )}
      </div>
    );
  };

  // Header actions for edit mode: grey trash + save status
  const headerActions = mode === 'edit' ? (
    <>
      <button
        type="button"
        onClick={handleDelete}
        className="w-8 h-8 rounded-lg transition hover:bg-gray-100 flex items-center justify-center"
        disabled={deleteMutation.isPending}
        title="Delete goal"
      >
        {deleteMutation.isPending ? (
          <i className="fa-solid fa-spinner fa-spin text-sm" style={{ color: 'var(--ink-tertiary)' }}></i>
        ) : (
          <i className="fa-solid fa-trash text-sm" style={{ color: 'var(--ink-tertiary)' }}></i>
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
        className="v2-btn v2-btn-secondary"
        disabled={createMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="goal-form"
        className="v2-btn v2-btn-primary"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? 'Creating...' : 'Create Goal'}
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

      {/* ==================== BASICS SECTION ==================== */}
      <Section title="Basics">
        {/* Goal Name */}
        <div className="mb-4">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            required={mode === 'new'}
            placeholder="Goal name..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '1.1rem', fontWeight: 500, outline: 'none' }} className=""
          />
        </div>

        {/* Goal Type Toggle */}
        <div className="mb-4">
          <label style={{ display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' }} className="">
            Goal Type
          </label>
          <div className="v2-seg-control flex-wrap">
            {[
              { value: 'counted', label: 'Counted', icon: 'fa-hashtag' },
              { value: 'named_steps', label: 'Named Steps', icon: 'fa-list-ol' },
            ].map(({ value, label, icon }) => {
              const isActive = formData.goal_type === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleFieldChange('goal_type', value)}
                  className={`flex items-center gap-2 px-4 py-2.5 ${isActive ? 'active' : ''} v2-seg-btn`}
                  style={{}}
                >
                  <i className={`fa-solid ${icon} text-sm`} style={{ color: isActive ? 'white' : 'var(--ink-tertiary)' }}></i>
                  <span className="" style={{ color: isActive ? 'white' : 'var(--ink)' }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category */}
        <div className="mb-4">
          <label style={{ display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' }} className="">
            Category
          </label>
          <div className="v2-seg-control flex-wrap">
            {/* None option */}
            <button
              type="button"
              onClick={() => handleFieldChange('category_id', '')}
              className={`flex items-center gap-2 px-4 py-2.5 ${formData.category_id === '' ? 'active' : ''} v2-seg-btn`}
            >
              <i
                className="fa-solid fa-folder text-sm"
                style={{ color: formData.category_id === '' ? 'white' : 'var(--ink-tertiary)' }}
              ></i>
              <span className="" style={{ color: formData.category_id === '' ? 'white' : 'var(--ink)' }}>
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
                  className={`flex items-center gap-2 px-4 py-2.5 ${isActive ? 'active' : ''} v2-seg-btn`}
                  style={{}}
                >
                  <i
                    className={`fa-solid ${category.icon} text-sm`}
                    style={{ color: isActive ? 'white' : category.color }}
                  ></i>
                  <span className="" style={{ color: isActive ? 'white' : 'var(--ink)' }}>
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' }} className="">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Describe your goal..."
            rows={3}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none' }} className=" resize-none"
          />
        </div>
      </Section>

      {/* ==================== GOAL CONFIG SECTION ==================== */}
      <Section title="Goal Config">
        {formData.goal_type === 'counted' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' }} className="">
                Target Count *
              </label>
              <input
                type="number"
                min="1"
                value={formData.target_count}
                onChange={(e) => handleFieldChange('target_count', parseInt(e.target.value) || 1)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none' }} className=""
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' }} className="">
                Unit Name
              </label>
              <input
                type="text"
                value={formData.unit_name}
                onChange={(e) => handleFieldChange('unit_name', e.target.value)}
                placeholder="e.g., miles, reps, books..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none' }} className=""
              />
            </div>
          </div>
        ) : (
          <div>
            {mode === 'edit' && goalId ? (
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' }} className="">
                  Steps
                </label>
                <ChecklistSection
                  parentType="goal"
                  parentId={goalId}
                  items={goal?.checklist_items || []}
                  color={categories?.find(c => c.id === formData.category_id)?.color || 'var(--ink)'}
                  editable={true}
                />
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="fa-solid fa-info-circle text-lg mb-2" style={{ color: 'var(--ink-tertiary)' }}></i>
                <p className="text-sm" style={{ color: 'var(--ink-tertiary)', fontFamily: 'var(--font-body)' }}>
                  Steps can be added after creating the goal.
                </p>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ==================== PRIORITY SECTION ==================== */}
      <Section title="Priority">
        {/* Time Block */}
        <div className="mb-4">
          <label style={{ display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' }} className="">
            Time Block
          </label>
          <div className="v2-seg-control flex-wrap">
            <button
              type="button"
              onClick={() => handleFieldChange('time_block_id', '')}
              className={`flex items-center gap-2 px-4 py-2.5 ${formData.time_block_id === '' ? 'active' : ''} v2-seg-btn`}
            >
              <i
                className="fa-solid fa-clock text-sm"
                style={{ color: formData.time_block_id === '' ? 'white' : 'var(--ink-tertiary)' }}
              ></i>
              <span className="" style={{ color: formData.time_block_id === '' ? 'white' : 'var(--ink)' }}>
                Anytime
              </span>
            </button>
            {timeBlocks?.map((block) => {
              const isActive = formData.time_block_id === block.id;
              return (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => handleFieldChange('time_block_id', block.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 ${isActive ? 'active' : ''} v2-seg-btn`}
                  style={{}}
                >
                  <i
                    className={`${block.icon} text-sm`}
                    style={{ color: isActive ? 'white' : block.color }}
                  ></i>
                  <span className="" style={{ color: isActive ? 'white' : 'var(--ink)' }}>
                    {block.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Importance Level */}
        <div className="mb-4">
          <label style={{ display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' }} className="">
            Importance Level
          </label>
          <div className="v2-seg-control flex-wrap">
            {importanceLevels.map((level) => {
              const isActive = formData.importance_level_id === level.id;
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => handleFieldChange('importance_level_id', level.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 ${isActive ? 'active' : ''} v2-seg-btn`}
                  style={{}}
                >
                  <i
                    className={`${level.icon} text-sm`}
                    style={{ color: isActive ? 'white' : level.color }}
                  ></i>
                  <span className="" style={{ color: isActive ? 'white' : 'var(--ink)' }}>
                    {level.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' }} className="">
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
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none' }} className=""
              placeholder="Type to add tags..."
            />

            {showTagSuggestions && (filteredSuggestions.length > 0 || tagInput.trim()) && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', overflow: 'hidden' }} className="">
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
                  className="text-xs px-3 py-1.5 rounded-[10px] flex items-center gap-2 v2-badge v2-badge-neutral"
                  style={{
                    fontFamily: 'var(--font-body)',
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
            <label style={{ display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' }} className="">
              <i className="fa-solid fa-file-lines mr-2 text-xs" style={{ color: 'var(--ink-tertiary)' }}></i>
              Documents
            </label>
            <div>
              <input
                type="text"
                value={documentSearchQuery}
                onChange={(e) => setDocumentSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none' }} className=" mb-2 text-sm"
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
                              immediateSave({ goal_content_ids: newDocIds });
                            }
                          }}
                          className="w-4 h-4 rounded cursor-pointer"
                          style={{ accentColor: '#2C2C2E' }}
                        />
                        <span className="text-sm flex-1 truncate" style={{ color: 'var(--ink)' }}>{doc.title}</span>
                      </label>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-center py-2" style={{ color: 'var(--ink-tertiary)' }}>No documents</p>
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
            <label style={{ display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' }} className="">
              <i className="fa-solid fa-list-check mr-2 text-xs" style={{ color: 'var(--ink-tertiary)' }}></i>
              Lists
            </label>
            <div>
              <input
                type="text"
                value={listSearchQuery}
                onChange={(e) => setListSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none' }} className=" mb-2 text-sm"
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
                          style={{ backgroundColor: list.category?.color || 'var(--ink)' }}
                          title="Preview list"
                        >
                          <i className={`fa-solid ${list.category?.icon || 'fa-list-check'} text-white`} style={{ fontSize: '0.6rem' }}></i>
                        </button>
                        <span className="text-sm flex-1 truncate" style={{ color: 'var(--ink)' }}>{list.name}</span>
                      </label>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-center py-2" style={{ color: 'var(--ink-tertiary)' }}>No lists</p>
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
    </>
  );

  return (
    <>
      <SlideOverPanel
        isOpen={isOpen}
        onClose={handleClose}
        title={mode === 'edit' ? 'Edit Goal' : 'New Goal'}
        headerActions={headerActions}
        footer={footer}
      >
        {mode === 'new' ? (
          <form id="goal-form" onSubmit={handleSubmit}>
            {formContent}
          </form>
        ) : (
          formContent
        )}
      </SlideOverPanel>

      <ListShowModal />
    </>
  );
};

export default GoalFormModal;
