import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import { tasksApi } from '../../utils/api';
import useTasksStore from '../../stores/tasksStore';

const TaskFormModal = ({ allTags, categories, documents }) => {
  const { formModal, closeFormModal } = useTasksStore();
  const { isOpen, mode, taskId } = formModal;
  const queryClient = useQueryClient();
  const trixEditorRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    importance_level_id: '',
    category_id: '',
    on_hold: false,
    url: '',
    location_name: '',
    location_lat: '',
    location_lng: '',
    due_date: '',
    due_time: '',
    attached_document_id: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false); // Default closed

  // Fetch user's importance levels
  const { data: importanceLevels = [] } = useQuery({
    queryKey: ['importanceLevels'],
    queryFn: async () => {
      const response = await fetch('/settings/importance_levels');
      if (!response.ok) throw new Error('Failed to fetch importance levels');
      return response.json();
    },
  });

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
        on_hold: task.on_hold || false,
        url: task.url || '',
        location_name: task.location_name || '',
        location_lat: task.location_lat || '',
        location_lng: task.location_lng || '',
        due_date: task.due_date || '',
        due_time: task.due_time || '',
        attached_document_id: task.attached_document_id || '',
      });
      setSelectedTags(task.tags?.map(t => t.name) || []);

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
        importance_level_id: '',
        category_id: '',
        on_hold: false,
        url: '',
        location_name: '',
        location_lat: '',
        location_lng: '',
        due_date: '',
        due_time: '',
        attached_document_id: '',
      });
      setSelectedTags([]);
      setTagInput('');
      setShowAdvanced(false);
      if (trixEditorRef.current?.editor) {
        trixEditorRef.current.editor.loadHTML('');
      }
    }
  }, [isOpen, mode]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => tasksApi.create({ task: data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      closeFormModal();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data) => tasksApi.update(taskId, { task: data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['task', taskId]);
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      ...formData,
      notes: trixEditorRef.current?.value || '',
      tag_names: selectedTags,
      category_id: formData.category_id || null,
      attached_document_id: formData.attached_document_id || null,
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
    // Case insensitive check for duplicates
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
          className="mr-auto px-6 py-3 rounded-lg font-semibold transition"
          style={{ color: '#DC2626' }}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        </button>
      )}
      <button
        type="button"
        onClick={closeFormModal}
        className="px-6 py-3 rounded-lg font-semibold border-2 transition"
        style={{ color: '#1d3e4c', borderColor: '#E8EEF1' }}
        disabled={currentMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="task-form"
        className="px-6 py-3 rounded-lg text-white font-semibold shadow-lg hover:shadow-xl transition cursor-pointer disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #1d3e4c, #45606b)' }}
        disabled={currentMutation.isPending}
      >
        {currentMutation.isPending ? 'Saving...' : mode === 'edit' ? 'Update Task' : 'Create Task'}
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={closeFormModal}
      title={mode === 'edit' ? 'Edit Task' : 'New Task'}
      footer={footer}
      size="large"
    >
      <form id="task-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Task Name */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: '#1d3e4c' }}>
            Task Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Enter task name..."
            className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
            style={{ borderColor: '#E8EEF1', color: '#1d3e4c' }}
          />
        </div>

        {/* Importance Level Slider */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2" style={{ color: '#1d3e4c' }}>
            Importance Level
          </label>
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

        {/* Two columns: Category and Due Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#1d3e4c' }}>
              Category
            </label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
              style={{ borderColor: '#E8EEF1', color: '#1d3e4c' }}
            >
              <option value="">No Category</option>
              {categories?.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#1d3e4c' }}>
              Due Date
            </label>
            <input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
              style={{ borderColor: '#E8EEF1', color: '#1d3e4c' }}
            />
          </div>
        </div>

        {/* Advanced Options Section */}
        <div
          className="border-2 rounded-lg overflow-hidden"
          style={{
            borderColor: '#E8EEF1',
            backgroundColor: '#F9FAFB',
          }}
        >
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold transition hover:bg-gray-100"
            style={{ color: '#1d3e4c' }}
          >
            <span>Advanced Options</span>
            <i className={`fa-solid fa-chevron-${showAdvanced ? 'up' : 'down'} transition-transform`}></i>
          </button>

          {showAdvanced && (
            <div className="p-4 space-y-4 border-t-2" style={{ borderColor: '#E8EEF1', backgroundColor: 'white' }}>
              {/* Due Time */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1d3e4c' }}>
                  Due Time
                </label>
                <input
                  type="time"
                  name="due_time"
                  value={formData.due_time}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
                  style={{ borderColor: '#E8EEF1', color: '#1d3e4c' }}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1d3e4c' }}>
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
                    className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
                    style={{ borderColor: '#E8EEF1', color: '#1d3e4c' }}
                    placeholder="Type to search or add new tag"
                  />

                  {/* Tag suggestions dropdown */}
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

              {/* Location (Address) */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1d3e4c' }}>
                  Location / Address
                </label>
                <input
                  type="text"
                  name="location_name"
                  value={formData.location_name}
                  onChange={handleChange}
                  placeholder="123 Main St, City, State 12345"
                  className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
                  style={{ borderColor: '#E8EEF1', color: '#1d3e4c' }}
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1d3e4c' }}>
                  URL
                </label>
                <input
                  type="url"
                  name="url"
                  value={formData.url}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
                  style={{ borderColor: '#E8EEF1', color: '#1d3e4c' }}
                />
              </div>

              {/* Attached Document */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1d3e4c' }}>
                  Attached Document
                </label>
                <select
                  name="attached_document_id"
                  value={formData.attached_document_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
                  style={{ borderColor: '#E8EEF1', color: '#1d3e4c' }}
                >
                  <option value="">No Document</option>
                  {documents?.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes (Trix Editor) */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1d3e4c' }}>
                  Notes
                </label>
                <input id="task-notes-input" type="hidden" />
                <trix-editor
                  ref={trixEditorRef}
                  input="task-notes-input"
                  className="trix-content"
                ></trix-editor>
              </div>
            </div>
          )}
        </div>

        {/* On Hold Checkbox - Outside advanced options */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="on_hold"
            checked={formData.on_hold}
            onChange={handleChange}
            className="w-5 h-5 rounded cursor-pointer"
            style={{ accentColor: '#1d3e4c' }}
          />
          <label className="text-sm font-medium" style={{ color: '#1d3e4c' }}>
            Put task on hold
          </label>
        </div>
      </form>
    </BaseModal>
  );
};

export default TaskFormModal;
