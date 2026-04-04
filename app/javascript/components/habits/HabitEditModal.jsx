import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import useHabitsStore from '../../stores/habitsStore';
import useDocumentsStore from '../../stores/documentsStore';
import useListsStore from '../../stores/listsStore';
import ListShowModal from '../lists/ListShowModal';
import { tagsApi, documentsApi, categoriesApi, listsApi } from '../../utils/api';

// v2 Section — clean card with subtle label
const Section = ({ title, children, isLast = false }) => (
  <div className={!isLast ? 'mb-5' : ''}>
    <div className="v2-card" style={{ padding: 0 }}>
      <div style={{ padding: '10px 18px 6px' }}>
        <span className="v2-section-label">{title}</span>
      </div>
      <div style={{ padding: '0 18px 16px' }}>
        {children}
      </div>
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

  // v2 input style helper
  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--ink)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    outline: 'none',
  };

  const inputSmStyle = {
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--ink)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.833rem',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: 6,
    fontFamily: 'var(--font-body)',
    fontSize: '0.733rem',
    fontWeight: 500,
    color: 'var(--ink-tertiary)',
    letterSpacing: '0.02em',
  };

  return (
    <>
      <SlideOverPanel
        isOpen={isOpen}
        onClose={handleClose}
        title="Edit Habit"
        headerActions={
          <>
            <button onClick={handleDelete} className="v2-btn-icon" disabled={deleteMutation.isPending} title="Delete habit">
              {deleteMutation.isPending
                ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)' }} />
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-tertiary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              }
            </button>
            <StatusIndicator />
          </>
        }
      >
        {/* ── Basics ── */}
        <Section title="Basics">
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => { const v = e.target.value; setFormData(prev => ({ ...prev, name: v })); autoSave({ name: v }); }}
              style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: 500, padding: '10px 14px' }}
              placeholder="Habit name..."
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Category</label>
            <div className="v2-seg-control flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setFormData(prev => ({ ...prev, category_id: cat.id })); immediateSave({ category_id: cat.id }); }}
                  className={`v2-seg-btn ${formData.category_id === cat.id ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px' }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Schedule</label>
            <div className="v2-seg-control flex-wrap" style={{ marginBottom: 10 }}>
              {[
                { value: 'flexible', label: 'Flexible' },
                { value: 'specific_days', label: 'Specific Days' },
                { value: 'interval', label: 'Interval' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    const cfg = value === 'specific_days' ? { days_of_week: [] } : value === 'interval' ? { interval_days: 2, anchor_date: new Date().toISOString().split('T')[0] } : {};
                    setFormData(prev => ({ ...prev, schedule_mode: value, schedule_config: cfg }));
                    immediateSave({ schedule_mode: value, schedule_config: cfg });
                  }}
                  className={`v2-seg-btn ${formData.schedule_mode === value ? 'active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {formData.schedule_mode === 'flexible' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: '0.833rem', color: 'var(--ink-secondary)' }}>
                <input
                  type="number" value={formData.target_count} min="1"
                  onChange={(e) => { const v = parseInt(e.target.value) || 1; setFormData(prev => ({ ...prev, target_count: v })); autoSave({ target_count: v }); }}
                  style={{ ...inputSmStyle, width: 52, textAlign: 'center' }}
                />
                <span>times per</span>
                <select
                  value={formData.frequency_type}
                  onChange={(e) => { const v = e.target.value; setFormData(prev => ({ ...prev, frequency_type: v })); immediateSave({ frequency_type: v }); }}
                  style={inputSmStyle}
                >
                  <option value="day">day</option>
                  <option value="week">week</option>
                  <option value="month">month</option>
                  <option value="year">year</option>
                </select>
              </div>
            )}

            {formData.schedule_mode === 'specific_days' && (
              <div className="flex flex-wrap gap-3 items-center">
                <div className="v2-seg-control flex-wrap">
                  {[{ label: 'Weekdays', days: [1,2,3,4,5] }, { label: 'Weekends', days: [0,6] }, { label: 'MWF', days: [1,3,5] }, { label: 'T/Th', days: [2,4] }].map((p) => {
                    const cur = formData.schedule_config?.days_of_week || [];
                    const match = JSON.stringify([...cur].sort()) === JSON.stringify([...p.days].sort());
                    return (
                      <button key={p.label} type="button"
                        onClick={() => { const cfg = { ...formData.schedule_config, days_of_week: p.days }; setFormData(prev => ({ ...prev, schedule_config: cfg })); immediateSave({ schedule_config: cfg }); }}
                        className={`v2-seg-btn ${match ? 'active' : ''}`}
                      >{p.label}</button>
                    );
                  })}
                </div>
                <div className="v2-seg-control flex-wrap">
                  {dayNames.map((d, i) => {
                    const sel = (formData.schedule_config?.days_of_week || []).includes(i);
                    return (
                      <button key={i} type="button" title={fullDayNames[i]}
                        onClick={() => {
                          const days = sel ? (formData.schedule_config?.days_of_week || []).filter(x => x !== i) : [...(formData.schedule_config?.days_of_week || []), i];
                          const cfg = { ...formData.schedule_config, days_of_week: days };
                          setFormData(prev => ({ ...prev, schedule_config: cfg })); immediateSave({ schedule_config: cfg });
                        }}
                        className={`v2-seg-btn ${sel ? 'active' : ''}`}
                        style={{ width: 36, height: 36, padding: 0, fontWeight: 600 }}
                      >{d}</button>
                    );
                  })}
                </div>
              </div>
            )}

            {formData.schedule_mode === 'interval' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: '0.833rem', color: 'var(--ink-secondary)' }}>
                <span>Every</span>
                <input
                  type="number" value={formData.schedule_config?.interval_days || 2} min="1"
                  onChange={(e) => {
                    const cfg = { ...formData.schedule_config, interval_days: parseInt(e.target.value) || 2, anchor_date: formData.schedule_config?.anchor_date || new Date().toISOString().split('T')[0] };
                    setFormData(prev => ({ ...prev, schedule_config: cfg })); autoSave({ schedule_config: cfg });
                  }}
                  style={{ ...inputSmStyle, width: 52, textAlign: 'center' }}
                />
                <span>days</span>
              </div>
            )}
          </div>
        </Section>

        {/* ── Organization ── */}
        <Section title="Organization">
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Time Block</label>
            <div className="v2-seg-control flex-wrap">
              <button type="button"
                onClick={() => { setFormData(prev => ({ ...prev, time_block_id: '' })); immediateSave({ time_block_id: '' }); }}
                className={`v2-seg-btn ${formData.time_block_id === '' ? 'active' : ''}`}
              >Anytime</button>
              {timeBlocks.map((b) => (
                <button key={b.id} type="button"
                  onClick={() => { setFormData(prev => ({ ...prev, time_block_id: b.id })); immediateSave({ time_block_id: b.id }); }}
                  className={`v2-seg-btn ${formData.time_block_id === b.id ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px' }}
                >
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
                <button key={lv.id} type="button"
                  onClick={() => { setFormData(prev => ({ ...prev, importance_level_id: lv.id })); immediateSave({ importance_level_id: lv.id }); }}
                  className={`v2-seg-btn ${formData.importance_level_id === lv.id ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px' }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: lv.color, flexShrink: 0 }} />
                  {lv.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Tags</label>
            <div className="relative">
              <input
                type="text" value={tagInput}
                onChange={(e) => { setTagInput(e.target.value); setShowTagSuggestions(e.target.value.length > 0); }}
                onKeyDown={handleTagInputKeyDown}
                onFocus={() => tagInput.length > 0 && setShowTagSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                style={inputStyle}
                placeholder="Type to add tags..."
              />
              {showTagSuggestions && (filteredSuggestions.length > 0 || tagInput.trim()) && (
                <div style={{ position: 'absolute', zIndex: 10, width: '100%', marginTop: 4, background: 'var(--surface)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', border: '1px solid var(--border)', maxHeight: 160, overflowY: 'auto' }}>
                  {filteredSuggestions.map((tag) => (
                    <button key={tag.id} type="button" onClick={() => handleAddTag(tag.name)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '0.867rem', fontFamily: 'var(--font-body)', color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >{tag.name}</button>
                  ))}
                  {tagInput.trim() && !filteredSuggestions.find(t => t.name.toLowerCase() === tagInput.toLowerCase()) && (
                    <button type="button" onClick={() => handleAddTag(tagInput)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '0.867rem', fontFamily: 'var(--font-body)', color: 'var(--ink-secondary)', background: 'none', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                    >+ Create "{tagInput.trim()}"</button>
                  )}
                </div>
              )}
            </div>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedTags.map((tag) => (
                  <span key={tag} className="v2-badge v2-badge-neutral" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px' }}>
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: '0.65rem' }}>
                      <i className="fa-solid fa-times" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* ── Attachments ── */}
        <Section title="Attachments" isLast={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Documents */}
            <div>
              <label style={labelStyle}>Documents</label>
              <input type="text" value={documentSearchQuery} onChange={(e) => setDocumentSearchQuery(e.target.value)}
                style={{ ...inputStyle, fontSize: '0.833rem', marginBottom: 8 }} placeholder="Search..." />
              {documents.length > 0 ? (
                <div className="space-y-0.5" style={{ maxHeight: 120, overflowY: 'auto' }}>
                  {documents.filter((d) => d.title.toLowerCase().includes(documentSearchQuery.toLowerCase())).map((doc) => (
                    <label key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', borderRadius: 6, cursor: 'pointer', fontSize: '0.867rem', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
                      <input type="checkbox" checked={selectedDocumentIds.includes(doc.id)}
                        onChange={(e) => { const ids = e.target.checked ? [...selectedDocumentIds, doc.id] : selectedDocumentIds.filter(id => id !== doc.id); setSelectedDocumentIds(ids); if (formData.name.trim()) immediateSave({ habit_content_ids: ids }); }}
                        style={{ accentColor: 'var(--ink)', width: 16, height: 16 }} />
                      <span className="truncate">{doc.title}</span>
                    </label>
                  ))}
                </div>
              ) : <p className="v2-caption" style={{ textAlign: 'center', padding: '8px 0' }}>No documents</p>}
              <button type="button" onClick={openNewDocumentModal}
                style={{ width: '100%', marginTop: 8, padding: 6, borderRadius: 6, border: '1px dashed var(--border-hover)', background: 'none', fontSize: '0.767rem', color: 'var(--ink-tertiary)', fontFamily: 'var(--font-body)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <i className="fa-solid fa-plus" style={{ fontSize: '0.55rem' }} /> Add document
              </button>
            </div>

            {/* Lists */}
            <div>
              <label style={labelStyle}>Lists <span style={{ fontWeight: 400, color: 'var(--ink-faint)' }}>(daily reset)</span></label>
              <input type="text" value={listSearchQuery} onChange={(e) => setListSearchQuery(e.target.value)}
                style={{ ...inputStyle, fontSize: '0.833rem', marginBottom: 8 }} placeholder="Search..." />
              {availableLists.length > 0 ? (
                <div className="space-y-0.5" style={{ maxHeight: 120, overflowY: 'auto' }}>
                  {availableLists.filter((l) => { const q = listSearchQuery.toLowerCase(); return !q || l.name.toLowerCase().includes(q) || l.category?.name?.toLowerCase().includes(q); }).map((list) => (
                    <label key={list.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', borderRadius: 6, cursor: 'pointer', fontSize: '0.867rem', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
                      <input type="checkbox" checked={selectedListIds.includes(list.id)}
                        onChange={(e) => { const ids = e.target.checked ? [...selectedListIds, list.id] : selectedListIds.filter(id => id !== list.id); setSelectedListIds(ids); if (formData.name.trim()) immediateSave({ list_attachment_ids: ids }); }}
                        style={{ accentColor: 'var(--ink)', width: 16, height: 16 }} />
                      <span style={{ width: 18, height: 18, borderRadius: 4, background: list.category?.color || 'var(--ink-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openListShowModal(list.id); }} title="Preview list">
                        <i className={`fa-solid ${list.category?.icon || 'fa-list-check'}`} style={{ fontSize: '0.5rem', color: 'white' }} />
                      </span>
                      <span className="truncate">{list.name}</span>
                    </label>
                  ))}
                </div>
              ) : <p className="v2-caption" style={{ textAlign: 'center', padding: '8px 0' }}>No lists</p>}
              <button type="button" onClick={openNewListModal}
                style={{ width: '100%', marginTop: 8, padding: 6, borderRadius: 6, border: '1px dashed var(--border-hover)', background: 'none', fontSize: '0.767rem', color: 'var(--ink-tertiary)', fontFamily: 'var(--font-body)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <i className="fa-solid fa-plus" style={{ fontSize: '0.55rem' }} /> Add list
              </button>
            </div>
          </div>
        </Section>
      </SlideOverPanel>

      <ListShowModal />
    </>
  );
};

export default HabitEditModal;
