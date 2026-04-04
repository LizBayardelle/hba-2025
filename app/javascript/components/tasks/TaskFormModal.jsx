import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import ChecklistSection from '../shared/ChecklistSection';
import ListShowModal from '../lists/ListShowModal';
import useNoteTakingMode, { useTrixExpandButton } from '../../hooks/useNoteTakingMode';
import { tasksApi, documentsApi, listsApi } from '../../utils/api';
import useTasksStore from '../../stores/tasksStore';
import useDocumentsStore from '../../stores/documentsStore';
import useListsStore from '../../stores/listsStore';

// v2 Section
const Section = ({ title, children, isLast = false }) => (
  <div className={!isLast ? 'mb-5' : ''}>
    <div className="v2-card" style={{ padding: 0 }}>
      <div style={{ padding: '10px 18px 6px' }}><span className="v2-section-label">{title}</span></div>
      <div style={{ padding: '0 18px 16px' }}>{children}</div>
    </div>
  </div>
);

const TaskFormModal = ({ allTags, categories, onSuccess }) => {
  const { formModal, closeFormModal } = useTasksStore();
  const { isOpen, mode, taskId, categoryId: initialCategoryId, importanceLevelId: initialImportanceLevelId, timeBlockId: initialTimeBlockId } = formModal;
  const queryClient = useQueryClient();
  const trixEditorRef = useRef(null);
  const { isNoteTakingMode, toggleNoteTakingMode, exitNoteTakingMode, viewportHeight } = useNoteTakingMode();
  useTrixExpandButton(trixEditorRef, isNoteTakingMode, toggleNoteTakingMode);

  const { openNewModal: openNewDocumentModal } = useDocumentsStore();
  const { openFormModal: openNewListModal, openShowModal: openListShowModal } = useListsStore();

  const [formData, setFormData] = useState({
    name: '',
    importance_level_id: '',
    category_id: '',
    time_block_id: '',
    on_hold: false,
    url: '',
    location_name: '',
    location_lat: '',
    location_lng: '',
    due_date: '',
    due_time: '',
    repeat_frequency: '',
    repeat_interval: 1,
    repeat_days: [],
    repeat_end_date: '',
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

  // Fetch task data if editing
  const { data: task } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.fetchOne(taskId),
    enabled: isOpen && mode === 'edit' && !!taskId,
  });

  // Load task data when editing (only on initial load, not after autosave refetches)
  useEffect(() => {
    if (task && mode === 'edit' && !dataLoadedRef.current) {
      dataLoadedRef.current = true;
      setFormData({
        name: task.name || '',
        importance_level_id: task.importance_level_id || '',
        category_id: task.category_id || '',
        time_block_id: task.time_block_id || '',
        on_hold: task.on_hold || false,
        url: task.url || '',
        location_name: task.location_name || '',
        location_lat: task.location_lat || '',
        location_lng: task.location_lng || '',
        due_date: task.due_date || '',
        due_time: task.due_time || '',
        repeat_frequency: task.repeat_frequency || '',
        repeat_interval: task.repeat_interval || 1,
        repeat_days: task.repeat_days || [],
        repeat_end_date: task.repeat_end_date || '',
      });
      setSelectedTags(task.tags?.map(t => t.name) || []);
      setSelectedDocumentIds(task.task_contents?.map(tc => tc.id) || []);
      setSelectedListIds(task.list_attachments?.map(la => la.list_id) || []);

      // Set Trix content for notes
      if (trixEditorRef.current) {
        setTimeout(() => {
          const trixEditor = trixEditorRef.current?.editor;
          if (trixEditor && task.notes) {
            trixEditor.loadHTML(task.notes || '');
          }
        }, 100);
      }
    }
  }, [task, mode]);

  // Reset form when modal opens for new task
  useEffect(() => {
    if (isOpen && mode === 'new') {
      setFormData({
        name: '',
        importance_level_id: initialImportanceLevelId || '',
        category_id: initialCategoryId || '',
        time_block_id: initialTimeBlockId || '',
        on_hold: false,
        url: '',
        location_name: '',
        location_lat: '',
        location_lng: '',
        due_date: '',
        due_time: '',
        repeat_frequency: '',
        repeat_interval: 1,
        repeat_days: [],
        repeat_end_date: '',
      });
      setSelectedTags([]);
      setTagInput('');
      setSelectedDocumentIds([]);
      setSelectedListIds([]);
      setDocumentSearchQuery('');
      setListSearchQuery('');
      if (trixEditorRef.current?.editor) {
        trixEditorRef.current.editor.loadHTML('');
      }
    }
  }, [isOpen, mode, initialCategoryId, initialImportanceLevelId, initialTimeBlockId]);

  // Reset refs when modal opens
  useEffect(() => {
    if (isOpen) {
      dataLoadedRef.current = false;
      closeAfterSaveRef.current = false;
      setSaveStatus(null);
      exitNoteTakingMode();
    }
  }, [isOpen]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  // Set heading color CSS variable on trix editor based on selected category
  useEffect(() => {
    const el = trixEditorRef.current;
    if (!el) return;
    const selectedCat = categories?.find(c => c.id.toString() === formData.category_id?.toString());
    if (selectedCat?.color) {
      el.style.setProperty('--heading-color', selectedCat.color);
    } else {
      el.style.removeProperty('--heading-color');
    }
  }, [formData.category_id, categories]);

  // Show saved status briefly
  const showSavedStatus = useCallback(() => {
    setSaveStatus('saved');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus(null);
    }, 2000);
  }, []);

  // Build task data for saving
  const buildTaskData = useCallback((overrides = {}) => {
    const { tags: overrideTags, task_content_ids: overrideDocIds, list_attachment_ids: overrideListIds, ...formOverrides } = overrides;
    const currentFormData = { ...formData, ...formOverrides };
    const currentTags = overrideTags !== undefined ? overrideTags : selectedTags;
    const currentDocIds = overrideDocIds !== undefined ? overrideDocIds : selectedDocumentIds;
    const currentListIds = overrideListIds !== undefined ? overrideListIds : selectedListIds;

    return {
      ...currentFormData,
      notes: trixEditorRef.current?.value || '',
      tag_names: currentTags,
      category_id: currentFormData.category_id || null,
      task_content_ids: currentDocIds,
      list_attachment_ids: currentListIds,
      repeat_frequency: currentFormData.repeat_frequency || null,
      repeat_interval: currentFormData.repeat_frequency ? currentFormData.repeat_interval : null,
      repeat_days: currentFormData.repeat_frequency ? currentFormData.repeat_days : [],
      repeat_end_date: currentFormData.repeat_frequency ? currentFormData.repeat_end_date : null,
    };
  }, [formData, selectedTags, selectedDocumentIds, selectedListIds]);

  // Create mutation (new mode only)
  const createMutation = useMutation({
    mutationFn: (data) => tasksApi.create({ task: data }),
    onSuccess: (responseData) => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['lists']);
      closeFormModal();
      if (onSuccess) onSuccess(responseData);
    },
  });

  // Update mutation (autosave in edit mode)
  const updateMutation = useMutation({
    mutationFn: (data) => tasksApi.update(taskId, { task: data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      await queryClient.invalidateQueries({ queryKey: ['task', taskId] });
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
    mutationFn: () => tasksApi.delete(taskId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      await queryClient.invalidateQueries({ queryKey: ['task', taskId] });
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
      const data = buildTaskData(overrides);
      updateMutation.mutate(data);
    }, 500);
  }, [mode, formData, buildTaskData, updateMutation]);

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
    const data = buildTaskData(overrides);
    updateMutation.mutate(data);
  }, [mode, formData, buildTaskData, updateMutation]);

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
        const data = buildTaskData(overrides);
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
    const data = buildTaskData();
    createMutation.mutate(data);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
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

  // Filter suggestions based on input (case insensitive)
  const filteredSuggestions = (allTags || [])
    .filter(tag =>
      tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !selectedTags.some(selectedTag => selectedTag.toLowerCase() === tag.name.toLowerCase())
    )
    .slice(0, 5);

  // v2 Status indicator
  const StatusIndicator = () => {
    if (!saveStatus) return null;
    return (
      <span className="v2-caption" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {saveStatus === 'saving' && <><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.6rem' }} /> Saving</>}
        {saveStatus === 'saved' && <><i className="fa-solid fa-check" style={{ fontSize: '0.6rem', color: 'var(--ink-tertiary)' }} /> Saved</>}
        {saveStatus === 'error' && <><i className="fa-solid fa-exclamation-circle" style={{ fontSize: '0.6rem', color: 'var(--overdue)' }} /> Error</>}
      </span>
    );
  };

  const noteTakingToggle = (
    <button type="button" onClick={toggleNoteTakingMode} className="v2-btn-icon" title={isNoteTakingMode ? 'Exit writing mode' : 'Writing mode'}>
      <i className={`fa-solid ${isNoteTakingMode ? 'fa-compress' : 'fa-expand'}`} style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)' }} />
    </button>
  );

  const headerActions = mode === 'edit' ? (
    <>
      {noteTakingToggle}
      <button onClick={handleDelete} className="v2-btn-icon" disabled={deleteMutation.isPending} title="Delete task">
        {deleteMutation.isPending
          ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)' }} />
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-tertiary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        }
      </button>
      <StatusIndicator />
    </>
  ) : noteTakingToggle;

  const footer = mode === 'new' ? (
    <>
      <button type="button" onClick={closeFormModal} className="v2-btn v2-btn-secondary" disabled={createMutation.isPending}>Cancel</button>
      <button type="submit" form="task-form" className="v2-btn v2-btn-primary" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creating...' : 'Create Task'}
      </button>
    </>
  ) : null;

  // Field change helper — updates state and triggers autosave
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (mode === 'edit') {
      if (field === 'name' || field === 'url' || field === 'location_name' || field === 'repeat_interval') {
        autoSave({ [field]: value });
      } else {
        immediateSave({ [field]: value });
      }
    }
  };

  // For multi-field changes (repeat, schedule, etc.)
  const handleMultiFieldChange = (updates, immediate = true) => {
    setFormData(prev => ({ ...prev, ...updates }));
    if (mode === 'edit') {
      if (immediate) {
        immediateSave(updates);
      } else {
        autoSave(updates);
      }
    }
  };

  // v2 style helpers
  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none' };
  const inputSmStyle = { padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.833rem' };
  const labelStyle = { display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' };
  const inlineConfig = { display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: '0.833rem', color: 'var(--ink-secondary)' };
  const dashedBtnStyle = { width: '100%', marginTop: 8, padding: 6, borderRadius: 6, border: '1px dashed var(--border-hover)', background: 'none', fontSize: '0.767rem', color: 'var(--ink-tertiary)', fontFamily: 'var(--font-body)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 };

  const formContent = (
    <>
      {mode === 'new' && createMutation.isError && (
        <div className="note-taking-hidden" style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--overdue-bg)', color: 'var(--overdue)', fontSize: '0.833rem', fontFamily: 'var(--font-body)' }}>
          {createMutation.error?.message || 'An error occurred'}
        </div>
      )}

      {/* ── Basics ── */}
      <div className="note-taking-hidden">
      <Section title="Basics">
        <div style={{ marginBottom: 16 }}>
          <input type="text" name="name" value={formData.name} onChange={(e) => handleFieldChange('name', e.target.value)} required={mode === 'new'}
            style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: 500, padding: '10px 14px' }} placeholder="Task name..." />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Category</label>
          <div className="v2-seg-control flex-wrap">
            <button type="button" onClick={() => handleFieldChange('category_id', '')} className={`v2-seg-btn ${formData.category_id === '' ? 'active' : ''}`}>None</button>
            {categories?.map((cat) => (
              <button key={cat.id} type="button" onClick={() => handleFieldChange('category_id', cat.id)}
                className={`v2-seg-btn ${formData.category_id === cat.id ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Due Date</label>
            <input type="date" name="due_date" value={formData.due_date} onChange={(e) => handleFieldChange('due_date', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Due Time</label>
            <input type="time" name="due_time" value={formData.due_time} onChange={(e) => handleFieldChange('due_time', e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>
            Repeat
            {formData.repeat_frequency && !formData.due_date && <span style={{ color: 'var(--overdue)', fontWeight: 400, marginLeft: 6 }}>(requires due date)</span>}
          </label>
          <div className="v2-seg-control flex-wrap" style={{ marginBottom: 10 }}>
            {[{ value: '', label: 'Never' }, { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }].map(({ value, label }) => (
              <button key={value} type="button" onClick={() => handleMultiFieldChange({ repeat_frequency: value, repeat_days: [] })}
                className={`v2-seg-btn ${formData.repeat_frequency === value ? 'active' : ''}`}>{label}</button>
            ))}
          </div>

          {formData.repeat_frequency && (
            <div className="space-y-3">
              <div style={inlineConfig}>
                <span>Every</span>
                <input type="number" min="1" max="99" value={formData.repeat_interval} onChange={(e) => handleFieldChange('repeat_interval', parseInt(e.target.value) || 1)}
                  style={{ ...inputSmStyle, width: 52, textAlign: 'center' }} />
                <span>
                  {formData.repeat_frequency === 'daily' && (formData.repeat_interval === 1 ? 'day' : 'days')}
                  {formData.repeat_frequency === 'weekly' && (formData.repeat_interval === 1 ? 'week' : 'weeks')}
                  {formData.repeat_frequency === 'monthly' && (formData.repeat_interval === 1 ? 'month' : 'months')}
                  {formData.repeat_frequency === 'yearly' && (formData.repeat_interval === 1 ? 'year' : 'years')}
                </span>
              </div>

              {formData.repeat_frequency === 'weekly' && (
                <div>
                  <label style={labelStyle}>On these days</label>
                  <div className="v2-seg-control flex-wrap">
                    {['S','M','T','W','T','F','S'].map((day, i) => {
                      const sel = (formData.repeat_days || []).includes(i);
                      return (<button key={i} type="button" onClick={() => { const days = formData.repeat_days || []; handleFieldChange('repeat_days', days.includes(i) ? days.filter(d => d !== i) : [...days, i].sort((a,b) => a-b)); }}
                        className={`v2-seg-btn ${sel ? 'active' : ''}`} style={{ width: 36, height: 36, padding: 0, fontWeight: 600 }}>{day}</button>);
                    })}
                  </div>
                  <p className="v2-caption" style={{ marginTop: 4, color: 'var(--ink-faint)' }}>Leave empty to repeat on the same day each week</p>
                </div>
              )}

              {formData.repeat_frequency === 'monthly' && (
                <div>
                  <label style={labelStyle}>On day of month</label>
                  <select value={formData.repeat_days?.[0] || ''} onChange={(e) => { const v = e.target.value; handleFieldChange('repeat_days', v ? [v === 'last' ? 'last' : parseInt(v)] : []); }}
                    style={{ ...inputSmStyle, minWidth: 120 }}>
                    <option value="">Same day each month</option>
                    {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1}{i===0?'st':i===1?'nd':i===2?'rd':'th'}</option>)}
                    <option value="last">Last day</option>
                  </select>
                </div>
              )}

              <div style={inlineConfig}>
                <span>Until</span>
                <input type="date" value={formData.repeat_end_date} onChange={(e) => handleFieldChange('repeat_end_date', e.target.value)} style={inputSmStyle} />
                <span style={{ color: 'var(--ink-faint)' }}>(optional)</span>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Organization ── */}
      <Section title="Organization">
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Time Block</label>
          <div className="v2-seg-control flex-wrap">
            <button type="button" onClick={() => handleFieldChange('time_block_id', '')} className={`v2-seg-btn ${formData.time_block_id === '' ? 'active' : ''}`}>Anytime</button>
            {timeBlocks?.map((b) => (
              <button key={b.id} type="button" onClick={() => handleFieldChange('time_block_id', b.id)}
                className={`v2-seg-btn ${formData.time_block_id === b.id ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                {b.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Importance</label>
          <div className="v2-seg-control flex-wrap">
            {importanceLevels.map((lv) => (
              <button key={lv.id} type="button" onClick={() => handleFieldChange('importance_level_id', lv.id)}
                className={`v2-seg-btn ${formData.importance_level_id === lv.id ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: lv.color, flexShrink: 0 }} />
                {lv.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Tags</label>
          <div className="relative">
            <input type="text" value={tagInput}
              onChange={(e) => { setTagInput(e.target.value); setShowTagSuggestions(e.target.value.length > 0); }}
              onKeyDown={handleTagInputKeyDown}
              onFocus={() => tagInput.length > 0 && setShowTagSuggestions(true)}
              onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
              style={inputStyle} placeholder="Type to add tags..." />
            {showTagSuggestions && (filteredSuggestions.length > 0 || tagInput.trim()) && (
              <div style={{ position: 'absolute', zIndex: 10, width: '100%', marginTop: 4, background: 'var(--surface)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', border: '1px solid var(--border)', maxHeight: 160, overflowY: 'auto' }}>
                {filteredSuggestions.map((tag) => (
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
              {selectedTags.map((tag) => (
                <span key={tag} className="v2-badge v2-badge-neutral" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px' }}>
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: '0.65rem' }}><i className="fa-solid fa-times" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* ── Attachments ── */}
      <Section title="Attachments">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Documents</label>
            <input type="text" value={documentSearchQuery} onChange={(e) => setDocumentSearchQuery(e.target.value)}
              style={{ ...inputStyle, fontSize: '0.833rem', marginBottom: 8 }} placeholder="Search..." />
            {documents.length > 0 ? (
              <div className="space-y-0.5" style={{ maxHeight: 120, overflowY: 'auto' }}>
                {documents.filter(d => d.title.toLowerCase().includes(documentSearchQuery.toLowerCase())).map(doc => (
                  <label key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', borderRadius: 6, cursor: 'pointer', fontSize: '0.867rem', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
                    <input type="checkbox" checked={selectedDocumentIds.includes(doc.id)}
                      onChange={(e) => { const ids = e.target.checked ? [...selectedDocumentIds, doc.id] : selectedDocumentIds.filter(id => id !== doc.id); setSelectedDocumentIds(ids); if (formData.name.trim()) immediateSave({ task_content_ids: ids }); }}
                      style={{ accentColor: 'var(--ink)', width: 16, height: 16 }} />
                    <span className="truncate">{doc.title}</span>
                  </label>
                ))}
              </div>
            ) : <p className="v2-caption" style={{ textAlign: 'center', padding: '8px 0' }}>No documents</p>}
            <button type="button" onClick={openNewDocumentModal} style={dashedBtnStyle}><i className="fa-solid fa-plus" style={{ fontSize: '0.55rem' }} /> Add document</button>
          </div>
          <div>
            <label style={labelStyle}>Lists <span style={{ fontWeight: 400, color: 'var(--ink-faint)' }}>(single use)</span></label>
            <input type="text" value={listSearchQuery} onChange={(e) => setListSearchQuery(e.target.value)}
              style={{ ...inputStyle, fontSize: '0.833rem', marginBottom: 8 }} placeholder="Search..." />
            {availableLists.length > 0 ? (
              <div className="space-y-0.5" style={{ maxHeight: 120, overflowY: 'auto' }}>
                {availableLists.filter(l => { const q = listSearchQuery.toLowerCase(); return !q || l.name.toLowerCase().includes(q) || l.category?.name?.toLowerCase().includes(q); }).map(list => (
                  <label key={list.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', borderRadius: 6, cursor: 'pointer', fontSize: '0.867rem', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
                    <input type="checkbox" checked={selectedListIds.includes(list.id)}
                      onChange={(e) => { const ids = e.target.checked ? [...selectedListIds, list.id] : selectedListIds.filter(id => id !== list.id); setSelectedListIds(ids); if (formData.name.trim()) immediateSave({ list_attachment_ids: ids }); }}
                      style={{ accentColor: 'var(--ink)', width: 16, height: 16 }} />
                    <span style={{ width: 18, height: 18, borderRadius: 4, background: list.category?.color || 'var(--ink-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openListShowModal(list.id); }} title="Preview">
                      <i className={`fa-solid ${list.category?.icon || 'fa-list-check'}`} style={{ fontSize: '0.5rem', color: 'white' }} />
                    </span>
                    <span className="truncate">{list.name}</span>
                  </label>
                ))}
              </div>
            ) : <p className="v2-caption" style={{ textAlign: 'center', padding: '8px 0' }}>No lists</p>}
            <button type="button" onClick={openNewListModal} style={dashedBtnStyle}><i className="fa-solid fa-plus" style={{ fontSize: '0.55rem' }} /> Add list</button>
          </div>
        </div>
      </Section>
      </div>

      {/* ── Details ── */}
      <div className="note-taking-editor-wrapper">
      <Section title="Details">
        <div className="mb-4 note-taking-hide-in-mode">
          <label style={labelStyle}>Location / Address</label>
          <input type="text" name="location_name" value={formData.location_name} onChange={(e) => handleFieldChange('location_name', e.target.value)}
            placeholder="123 Main St, City, State 12345" style={inputStyle} />
        </div>
        <div className="mb-4 note-taking-hide-in-mode">
          <label style={labelStyle}>URL</label>
          <input type="url" name="url" value={formData.url} onChange={(e) => handleFieldChange('url', e.target.value)} placeholder="https://..." style={inputStyle} />
        </div>
        <div className="mb-4 note-taking-editor-inner">
          <label className="note-taking-hide-in-mode" style={labelStyle}>Notes</label>
          <input id="task-notes-input" type="hidden" />
          <trix-editor ref={trixEditorRef} input="task-notes-input" className="trix-content" />
        </div>
        {mode === 'edit' && taskId && (
          <div className="note-taking-hide-in-mode">
            <label style={labelStyle}>Checklist</label>
            <ChecklistSection parentType="task" parentId={taskId} items={task?.checklist_items || []}
              color={categories?.find(c => c.id === formData.category_id)?.color || 'var(--ink)'} editable={true} />
          </div>
        )}
      </Section>
      </div>

      {/* On Hold */}
      <div className="flex items-center gap-2 mt-4 note-taking-hidden" style={{ fontFamily: 'var(--font-body)', fontSize: '0.867rem', color: 'var(--ink)' }}>
        <input type="checkbox" name="on_hold" checked={formData.on_hold} onChange={(e) => handleFieldChange('on_hold', e.target.checked)}
          style={{ accentColor: 'var(--ink)', width: 16, height: 16 }} />
        <span>Put task on hold</span>
      </div>
    </>
  );

  return (
    <>
      <SlideOverPanel
        isOpen={isOpen}
        onClose={handleClose}
        title={mode === 'edit' ? 'Edit Task' : 'New Task'}
        headerActions={headerActions}
        footer={footer}
        noteTakingMode={isNoteTakingMode}
        viewportHeight={viewportHeight}
      >
        {mode === 'new' ? (
          <form id="task-form" onSubmit={handleSubmit}>
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

export default TaskFormModal;
