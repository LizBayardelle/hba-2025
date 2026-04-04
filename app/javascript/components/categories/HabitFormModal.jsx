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

const HabitFormModal = ({ categoryColor, useHabitsPage = false, onSuccess }) => {
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
      if (onSuccess) onSuccess(responseData);
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
      if (onSuccess) onSuccess(responseData);
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
        <button onClick={handleDelete} className="v2-btn v2-btn-danger" disabled={deleteMutation.isPending} title="Delete habit" style={{ marginRight: 'auto' }}>
          {deleteMutation.isPending ? <i className="fa-solid fa-spinner fa-spin" /> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>}
          Delete
        </button>
      )}
      <button type="button" onClick={closeModal} className="v2-btn v2-btn-secondary" disabled={currentMutation.isPending}>Cancel</button>
      <button type="submit" form="habit-form" className="v2-btn v2-btn-primary" disabled={currentMutation.isPending || (useHabitsPage && !formData.category_id && !propsCategory)}>
        {currentMutation.isPending ? 'Saving...' : mode === 'edit' ? 'Update' : 'Create Habit'}
      </button>
    </>
  );

  // v2 style helpers
  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none' };
  const inputSmStyle = { padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.833rem' };
  const labelStyle = { display: 'block', marginBottom: 6, fontFamily: 'var(--font-body)', fontSize: '0.733rem', fontWeight: 500, color: 'var(--ink-tertiary)', letterSpacing: '0.02em' };
  const dashedBtnStyle = { width: '100%', marginTop: 8, padding: 6, borderRadius: 6, border: '1px dashed var(--border-hover)', background: 'none', fontSize: '0.767rem', color: 'var(--ink-tertiary)', fontFamily: 'var(--font-body)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 };

  return (
    <SlideOverPanel isOpen={isOpen} onClose={closeModal} title={mode === 'edit' ? 'Edit Habit' : 'New Habit'} footer={footer}>
      <form id="habit-form" onSubmit={handleSubmit}>
        {currentMutation.isError && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--overdue-bg)', color: 'var(--overdue)', fontSize: '0.833rem', fontFamily: 'var(--font-body)' }}>
            {currentMutation.error?.message || 'An error occurred'}
          </div>
        )}

        {/* ── Basics ── */}
        <Section title="Basics">
          <div style={{ marginBottom: 16 }}>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
              style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: 500, padding: '10px 14px' }} placeholder="Habit name..." />
          </div>

          {useHabitsPage && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Category <span style={{ color: 'var(--overdue)' }}>*</span></label>
              <div className="v2-seg-control flex-wrap">
                {categories?.map((cat) => (
                  <button key={cat.id} type="button" onClick={() => setFormData({ ...formData, category_id: cat.id })}
                    className={`v2-seg-btn ${formData.category_id === cat.id ? 'active' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Schedule</label>
            <div className="v2-seg-control flex-wrap" style={{ marginBottom: 10 }}>
              {[{ value: 'flexible', label: 'Flexible' }, { value: 'specific_days', label: 'Specific Days' }, { value: 'interval', label: 'Interval' }].map(({ value, label }) => (
                <button key={value} type="button"
                  onClick={() => setFormData({ ...formData, schedule_mode: value, schedule_config: value === 'specific_days' ? { days_of_week: [] } : value === 'interval' ? { interval_days: 2, anchor_date: new Date().toISOString().split('T')[0] } : {} })}
                  className={`v2-seg-btn ${formData.schedule_mode === value ? 'active' : ''}`}>{label}</button>
              ))}
            </div>

            {formData.schedule_mode === 'flexible' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: '0.833rem', color: 'var(--ink-secondary)' }}>
                <input type="number" value={formData.target_count} min="1" onChange={(e) => setFormData({ ...formData, target_count: parseInt(e.target.value) || 1 })}
                  style={{ ...inputSmStyle, width: 52, textAlign: 'center' }} />
                <span>times per</span>
                <select value={formData.frequency_type} onChange={(e) => setFormData({ ...formData, frequency_type: e.target.value })} style={inputSmStyle}>
                  <option value="day">day</option><option value="week">week</option><option value="month">month</option><option value="year">year</option>
                </select>
              </div>
            )}

            {formData.schedule_mode === 'specific_days' && (
              <div className="flex flex-wrap gap-3 items-center">
                <div className="v2-seg-control flex-wrap">
                  {[{ label: 'Weekdays', days: [1,2,3,4,5] }, { label: 'Weekends', days: [0,6] }, { label: 'MWF', days: [1,3,5] }, { label: 'T/Th', days: [2,4] }].map((p) => {
                    const cur = formData.schedule_config?.days_of_week || [];
                    const match = JSON.stringify([...cur].sort()) === JSON.stringify([...p.days].sort());
                    return (<button key={p.label} type="button" onClick={() => setFormData({ ...formData, schedule_config: { ...formData.schedule_config, days_of_week: p.days } })}
                      className={`v2-seg-btn ${match ? 'active' : ''}`}>{p.label}</button>);
                  })}
                </div>
                <div className="v2-seg-control flex-wrap">
                  {dayNames.map((d, i) => {
                    const sel = (formData.schedule_config?.days_of_week || []).includes(i);
                    return (<button key={i} type="button" title={fullDayNames[i]}
                      onClick={() => { const days = sel ? (formData.schedule_config?.days_of_week || []).filter(x => x !== i) : [...(formData.schedule_config?.days_of_week || []), i]; setFormData({ ...formData, schedule_config: { ...formData.schedule_config, days_of_week: days } }); }}
                      className={`v2-seg-btn ${sel ? 'active' : ''}`} style={{ width: 36, height: 36, padding: 0, fontWeight: 600 }}>{d}</button>);
                  })}
                </div>
              </div>
            )}

            {formData.schedule_mode === 'interval' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: '0.833rem', color: 'var(--ink-secondary)' }}>
                <span>Every</span>
                <input type="number" value={formData.schedule_config?.interval_days || 2} min="1"
                  onChange={(e) => setFormData({ ...formData, schedule_config: { ...formData.schedule_config, interval_days: parseInt(e.target.value) || 2, anchor_date: formData.schedule_config?.anchor_date || new Date().toISOString().split('T')[0] } })}
                  style={{ ...inputSmStyle, width: 52, textAlign: 'center' }} />
                <select value={formData.schedule_config?.interval_unit || 'days'}
                  onChange={(e) => setFormData({ ...formData, schedule_config: { ...formData.schedule_config, interval_unit: e.target.value, anchor_date: formData.schedule_config?.anchor_date || new Date().toISOString().split('T')[0] } })}
                  style={inputSmStyle}>
                  <option value="days">days</option><option value="weeks">weeks</option><option value="months">months</option>
                </select>
              </div>
            )}
          </div>
        </Section>

        {/* ── Organization ── */}
        <Section title="Organization">
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Time Block</label>
            <div className="v2-seg-control flex-wrap">
              <button type="button" onClick={() => setFormData({ ...formData, time_block_id: '' })}
                className={`v2-seg-btn ${formData.time_block_id === '' ? 'active' : ''}`}>Anytime</button>
              {timeBlocks.map((b) => (
                <button key={b.id} type="button" onClick={() => setFormData({ ...formData, time_block_id: b.id })}
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
                <button key={lv.id} type="button" onClick={() => setFormData({ ...formData, importance_level_id: lv.id })}
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
        <Section title="Attachments" isLast={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Documents</label>
              <input type="text" value={documentSearchQuery} onChange={(e) => setDocumentSearchQuery(e.target.value)}
                style={{ ...inputStyle, fontSize: '0.833rem', marginBottom: 8 }} placeholder="Search..." />
              {documents.length > 0 ? (
                <div className="space-y-0.5" style={{ maxHeight: 120, overflowY: 'auto' }}>
                  {documents.filter((d) => d.title.toLowerCase().includes(documentSearchQuery.toLowerCase())).map((doc) => (
                    <label key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', borderRadius: 6, cursor: 'pointer', fontSize: '0.867rem', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
                      <input type="checkbox" checked={selectedDocumentIds.includes(doc.id)}
                        onChange={(e) => { if (e.target.checked) setSelectedDocumentIds([...selectedDocumentIds, doc.id]); else setSelectedDocumentIds(selectedDocumentIds.filter(id => id !== doc.id)); }}
                        style={{ accentColor: 'var(--ink)', width: 16, height: 16 }} />
                      <span className="truncate">{doc.title}</span>
                    </label>
                  ))}
                </div>
              ) : <p className="v2-caption" style={{ textAlign: 'center', padding: '8px 0' }}>No documents</p>}
              <button type="button" onClick={openNewDocumentModal} style={dashedBtnStyle}>
                <i className="fa-solid fa-plus" style={{ fontSize: '0.55rem' }} /> Add document
              </button>
            </div>

            <div>
              <label style={labelStyle}>Lists <span style={{ fontWeight: 400, color: 'var(--ink-faint)' }}>(daily reset)</span></label>
              <input type="text" value={listSearchQuery} onChange={(e) => setListSearchQuery(e.target.value)}
                style={{ ...inputStyle, fontSize: '0.833rem', marginBottom: 8 }} placeholder="Search..." />
              {availableLists.length > 0 ? (
                <div className="space-y-0.5" style={{ maxHeight: 120, overflowY: 'auto' }}>
                  {availableLists.filter((l) => { const q = listSearchQuery.toLowerCase(); return !q || l.name.toLowerCase().includes(q) || l.category?.name?.toLowerCase().includes(q); }).map((list) => (
                    <label key={list.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', borderRadius: 6, cursor: 'pointer', fontSize: '0.867rem', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
                      <input type="checkbox" checked={selectedListIds.includes(list.id)}
                        onChange={(e) => { if (e.target.checked) setSelectedListIds([...selectedListIds, list.id]); else setSelectedListIds(selectedListIds.filter(id => id !== list.id)); }}
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
              <button type="button" onClick={openNewListModal} style={dashedBtnStyle}>
                <i className="fa-solid fa-plus" style={{ fontSize: '0.55rem' }} /> Add list
              </button>
            </div>
          </div>
        </Section>
      </form>
    </SlideOverPanel>
  );
};

export default HabitFormModal;
