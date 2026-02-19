import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import ChecklistSection from '../shared/ChecklistSection';
import ListShowModal from '../lists/ListShowModal';
import { tasksApi, documentsApi, listsApi } from '../../utils/api';
import useTasksStore from '../../stores/tasksStore';
import useDocumentsStore from '../../stores/documentsStore';
import useListsStore from '../../stores/listsStore';

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

const TaskFormModal = ({ allTags, categories }) => {
  const { formModal, closeFormModal } = useTasksStore();
  const { isOpen, mode, taskId, categoryId: initialCategoryId, importanceLevelId: initialImportanceLevelId, timeBlockId: initialTimeBlockId } = formModal;
  const queryClient = useQueryClient();
  const trixEditorRef = useRef(null);

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

  // Load task data when editing
  useEffect(() => {
    if (task && mode === 'edit') {
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => tasksApi.create({ task: data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['lists']);
      closeFormModal();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data) => tasksApi.update(taskId, { task: data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['task', taskId]);
      queryClient.invalidateQueries(['lists']);
      closeFormModal();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      closeFormModal();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      ...formData,
      notes: trixEditorRef.current?.value || '',
      tag_names: selectedTags,
      category_id: formData.category_id || null,
      task_content_ids: selectedDocumentIds,
      list_attachment_ids: selectedListIds,
      repeat_frequency: formData.repeat_frequency || null,
      repeat_interval: formData.repeat_frequency ? formData.repeat_interval : null,
      repeat_days: formData.repeat_frequency ? formData.repeat_days : [],
      repeat_end_date: formData.repeat_frequency ? formData.repeat_end_date : null,
    };

    if (mode === 'edit') {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate();
    }
  };

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
          className="btn-delete-icon"
          disabled={deleteMutation.isPending}
          title="Delete task"
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
        onClick={closeFormModal}
        className="btn-liquid-outline-light"
        disabled={currentMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="task-form"
        className="btn-liquid"
        disabled={currentMutation.isPending}
      >
        {currentMutation.isPending ? 'Saving...' : mode === 'edit' ? 'Update Task' : 'Create Task'}
      </button>
    </>
  );

  return (
    <>
      <SlideOverPanel
        isOpen={isOpen}
        onClose={closeFormModal}
        title={mode === 'edit' ? 'Edit Task' : 'New Task'}
        footer={footer}
      >
        <form id="task-form" onSubmit={handleSubmit}>
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
            {/* Task Name */}
            <div className="mb-4">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Task name..."
                className="form-input-hero"
              />
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="form-label">
                Category
              </label>
              <div className="button-bar flex-wrap">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, category_id: '' })}
                  className={`flex items-center gap-2 px-4 py-2.5 ${formData.category_id === '' ? 'liquid-surface-subtle' : ''}`}
                  style={formData.category_id === '' ? { '--surface-color': '#1D1D1F' } : {}}
                >
                  <i
                    className="fa-solid fa-folder text-sm"
                    style={{ color: formData.category_id === '' ? 'white' : '#8E8E93' }}
                  ></i>
                  <span className="bar-item-text" style={{ color: formData.category_id === '' ? 'white' : '#1D1D1F' }}>
                    None
                  </span>
                </button>
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

            {/* Due Date & Time */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="form-label">
                  Due Date
                </label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">
                  Due Time
                </label>
                <input
                  type="time"
                  name="due_time"
                  value={formData.due_time}
                  onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>

            {/* Repeat */}
            <div>
              <label className="form-label">
                Repeat
                {formData.repeat_frequency && !formData.due_date && (
                  <span className="ml-2 text-xs font-normal" style={{ color: '#DC2626' }}>
                    (requires due date)
                  </span>
                )}
              </label>
              <div className="button-bar flex-wrap mb-3">
                {[
                  { value: '', label: 'Never' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'yearly', label: 'Yearly' },
                ].map(({ value, label }) => {
                  const isActive = formData.repeat_frequency === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData({ ...formData, repeat_frequency: value, repeat_days: [] })}
                      className={`px-4 py-2.5 ${isActive ? 'liquid-surface-subtle' : ''}`}
                      style={isActive ? { '--surface-color': '#2C2C2E' } : {}}
                    >
                      <span className="bar-item-text" style={{ color: isActive ? 'white' : '#1D1D1F' }}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Repeat options when a frequency is selected */}
              {formData.repeat_frequency && (
                <div className="space-y-3">
                  {/* Interval */}
                  <div className="form-inline-config">
                    <span style={{ fontWeight: 400 }}>Every</span>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={formData.repeat_interval}
                      onChange={(e) => setFormData({ ...formData, repeat_interval: parseInt(e.target.value) || 1 })}
                      className="w-14 text-center form-input-sm"
                    />
                    <span style={{ fontWeight: 400 }}>
                      {formData.repeat_frequency === 'daily' && (formData.repeat_interval === 1 ? 'day' : 'days')}
                      {formData.repeat_frequency === 'weekly' && (formData.repeat_interval === 1 ? 'week' : 'weeks')}
                      {formData.repeat_frequency === 'monthly' && (formData.repeat_interval === 1 ? 'month' : 'months')}
                      {formData.repeat_frequency === 'yearly' && (formData.repeat_interval === 1 ? 'year' : 'years')}
                    </span>
                  </div>

                  {/* Weekly: Day of week selection */}
                  {formData.repeat_frequency === 'weekly' && (
                    <div>
                      <span className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>On these days</span>
                      <div className="button-bar">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                          const isSelected = (formData.repeat_days || []).includes(index);
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                const days = formData.repeat_days || [];
                                const newDays = days.includes(index)
                                  ? days.filter(d => d !== index)
                                  : [...days, index].sort((a, b) => a - b);
                                setFormData({ ...formData, repeat_days: newDays });
                              }}
                              className={`w-10 h-10 font-semibold text-sm ${isSelected ? 'liquid-surface-subtle' : ''}`}
                              style={isSelected ? { '--surface-color': '#2C2C2E' } : {}}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs mt-1" style={{ color: '#8E8E93' }}>
                        Leave empty to repeat on the same day each week
                      </p>
                    </div>
                  )}

                  {/* Monthly: Day of month selection */}
                  {formData.repeat_frequency === 'monthly' && (
                    <div>
                      <span className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>On day of month</span>
                      <select
                        value={formData.repeat_days?.[0] || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({
                            ...formData,
                            repeat_days: value ? [value === 'last' ? 'last' : parseInt(value)] : []
                          });
                        }}
                        className="form-input-sm"
                        style={{ minWidth: '120px' }}
                      >
                        <option value="">Same day each month</option>
                        {[...Array(31)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}
                          </option>
                        ))}
                        <option value="last">Last day</option>
                      </select>
                    </div>
                  )}

                  {/* End date */}
                  <div className="form-inline-config">
                    <span style={{ fontWeight: 400 }}>Until</span>
                    <input
                      type="date"
                      value={formData.repeat_end_date}
                      onChange={(e) => setFormData({ ...formData, repeat_end_date: e.target.value })}
                      className="form-input-sm"
                    />
                    <span style={{ fontWeight: 400 }}>(optional)</span>
                  </div>
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
                {timeBlocks?.map((block) => {
                  const isActive = formData.time_block_id === block.id;
                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, time_block_id: block.id })}
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
                      onClick={() => setFormData({ ...formData, importance_level_id: level.id })}
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
          <Section title="Attachments">
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
                  <span className="ml-1 text-xs font-normal" style={{ color: '#8E8E93' }}>(single use)</span>
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

          {/* ==================== DETAILS SECTION ==================== */}
          <Section title="Details">
            {/* Location */}
            <div className="mb-4">
              <label className="form-label">
                Location / Address
              </label>
              <input
                type="text"
                name="location_name"
                value={formData.location_name}
                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                placeholder="123 Main St, City, State 12345"
                className="form-input"
              />
            </div>

            {/* URL */}
            <div className="mb-4">
              <label className="form-label">
                URL
              </label>
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
                className="form-input"
              />
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="form-label">
                Notes
              </label>
              <input id="task-notes-input" type="hidden" />
              <trix-editor
                ref={trixEditorRef}
                input="task-notes-input"
                className="trix-content"
              ></trix-editor>
            </div>

            {/* Checklist (only in edit mode) */}
            {mode === 'edit' && taskId && (
              <div>
                <label className="form-label">
                  Checklist
                </label>
                <ChecklistSection
                  parentType="task"
                  parentId={taskId}
                  items={task?.checklist_items || []}
                  color={categories?.find(c => c.id === formData.category_id)?.color || '#1D1D1F'}
                  editable={true}
                />
              </div>
            )}
          </Section>

          {/* On Hold Checkbox */}
          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              name="on_hold"
              checked={formData.on_hold}
              onChange={(e) => setFormData({ ...formData, on_hold: e.target.checked })}
              className="w-5 h-5 rounded cursor-pointer"
              style={{ accentColor: '#2C2C2E' }}
            />
            <label className="checkbox-row" style={{ padding: 0 }}>
              Put task on hold
            </label>
          </div>
        </form>
      </SlideOverPanel>

      <ListShowModal />
    </>
  );
};

export default TaskFormModal;
