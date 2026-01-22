import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import { documentsApi, tasksApi } from '../../utils/api';
import useDocumentsStore from '../../stores/documentsStore';

const DocumentFormModal = ({ habits, allTags }) => {
  const { formModal, closeFormModal } = useDocumentsStore();
  const { isOpen, mode, documentId } = formModal;
  const queryClient = useQueryClient();
  const trixEditorRef = useRef(null);

  const [formData, setFormData] = useState({
    content_type: 'document',
    title: '',
    url: '',
    habit_ids: [],
    task_ids: [],
  });
  const [showHabitDropdown, setShowHabitDropdown] = useState(false);
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const [habitFilter, setHabitFilter] = useState('');
  const [taskFilter, setTaskFilter] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Fetch document data if editing
  const { data: document } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => documentsApi.fetchOne(documentId),
    enabled: isOpen && mode === 'edit' && !!documentId,
  });

  // Fetch all tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.fetchAll,
    enabled: isOpen,
  });

  // Load document data when editing
  useEffect(() => {
    if (document && mode === 'edit') {
      setFormData({
        content_type: document.content_type,
        title: document.title,
        url: document.metadata?.url || '',
        habit_ids: document.habits?.map(h => h.id.toString()) || [],
        task_ids: document.tasks?.map(t => t.id.toString()) || [],
      });
      setSelectedTags(document.tags?.map(t => t.name) || []);

      // Set Trix content if document type
      if (document.content_type === 'document' && trixEditorRef.current) {
        // Wait for Trix to be ready
        setTimeout(() => {
          const trixEditor = trixEditorRef.current?.editor;
          if (trixEditor && document.body) {
            trixEditor.loadHTML(document.body || '');
          }
        }, 100);
      }
    }
  }, [document, mode]);

  // Reset form when modal opens for new document
  useEffect(() => {
    if (isOpen && mode === 'new') {
      setFormData({
        content_type: 'document',
        title: '',
        url: '',
        habit_ids: [],
        task_ids: [],
      });
      setSelectedTags([]);
      setTagInput('');
      setHabitFilter('');
      setTaskFilter('');
      if (trixEditorRef.current?.editor) {
        trixEditorRef.current.editor.loadHTML('');
      }
    }
  }, [isOpen, mode]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => documentsApi.create({ habit_content: data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      closeFormModal();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data) => documentsApi.update(documentId, { habit_content: data }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['documents'] }),
        queryClient.invalidateQueries({ queryKey: ['document', documentId] })
      ]);
      closeFormModal();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      content_type: formData.content_type,
      title: formData.title,
      habit_ids: formData.habit_ids,
      task_ids: formData.task_ids,
      tag_names: selectedTags,
      metadata: {
        url: formData.url,
      },
    };

    // Get Trix content for document type
    if (formData.content_type === 'document' && trixEditorRef.current) {
      data.body = trixEditorRef.current.value;
    }

    if (mode === 'edit') {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
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

  // Group habits by category
  const groupedHabits = habits.reduce((acc, habit) => {
    const categoryName = habit.category_name || 'Uncategorized';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(habit);
    return acc;
  }, {});

  // Filter habits based on search
  const filteredGroupedHabits = Object.entries(groupedHabits).reduce((acc, [category, categoryHabits]) => {
    const filtered = categoryHabits.filter(habit =>
      habit.name.toLowerCase().includes(habitFilter.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {});

  // Filter tasks based on search
  const filteredTasks = tasks.filter(task =>
    task.name?.toLowerCase().includes(taskFilter.toLowerCase())
  );

  const footer = (
    <>
      <button
        type="button"
        onClick={closeFormModal}
        className="px-6 py-3 rounded-lg font-semibold transition text-white hover:opacity-70"
        style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
        disabled={currentMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="document-form"
        className="px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition cursor-pointer disabled:opacity-50 hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #A8A8AC 0%, #E5E5E7 45%, #FFFFFF 55%, #C7C7CC 70%, #8E8E93 100%)', border: '0.5px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3)', color: '#1D1D1F', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
        disabled={currentMutation.isPending}
      >
        {currentMutation.isPending ? 'Saving...' : mode === 'edit' ? 'Update Document' : 'Add Document'}
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={closeFormModal}
      title={mode === 'edit' ? 'Edit Document' : 'Add New Document'}
      footer={footer}
    >
      <form id="document-form" onSubmit={handleSubmit}>
        {currentMutation.isError && (
          <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            <i className="fa-solid fa-exclamation-circle mr-2"></i>
            {currentMutation.error?.message || 'An error occurred'}
          </div>
        )}

        {/* Content Type */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>Content Type</label>
          <div className="grid grid-cols-4 gap-3">
            {['document', 'youtube', 'video', 'link'].map((type) => (
              <label key={type} className="cursor-pointer">
                <input
                  type="radio"
                  name="content_type"
                  value={type}
                  checked={formData.content_type === type}
                  onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                  className="hidden"
                />
                <div
                  className={`p-3 rounded-lg border-2 transition hover:shadow-md ${
                    formData.content_type === type ? 'border-[#6B8A99] bg-[#E8EEF1]' : 'border-gray-200'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <i
                      className={`fa-solid ${
                        type === 'document'
                          ? 'fa-file-alt'
                          : type === 'youtube'
                          ? 'fa-brands fa-youtube'
                          : type === 'video'
                          ? 'fa-video'
                          : 'fa-link'
                      } text-lg`}
                      style={{ color: formData.content_type === type ? '#1d3e4c' : '#9CA3A8' }}
                    ></i>
                    <span
                      className="font-semibold capitalize text-xs"
                      style={{ color: formData.content_type === type ? '#1d3e4c' : '#657b84' }}
                    >
                      {type}
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-4 py-3 rounded-lg focus:outline-none transition font-light"
            style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
            placeholder="e.g., Morning Prayer, Spanish Lesson 1"
          />
        </div>

        {/* URL Field (for youtube, video, link) */}
        {['youtube', 'video', 'link'].includes(formData.content_type) && (
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>URL</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-4 py-3 rounded-lg focus:outline-none transition font-light"
              style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <p className="text-xs font-light mt-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#8E8E93' }}>
              Paste the full URL - we'll handle the rest!
            </p>
          </div>
        )}

        {/* Document Body (for document type) */}
        {formData.content_type === 'document' && (
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>Document Content</label>
            <input type="hidden" name="body" id="document-form-body-hidden" />
            <trix-editor ref={trixEditorRef} input="document-form-body-hidden" className="trix-content"></trix-editor>
          </div>
        )}

        {/* Attach to Habits and Tasks - Side by Side */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Attach to Habits */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
              Attach to Habits
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHabitDropdown(!showHabitDropdown)}
                className="w-full px-4 py-3 rounded-lg focus:outline-none transition font-light text-left flex items-center justify-between"
                style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
              >
                <span style={{ color: '#657b84' }}>
                  {formData.habit_ids.length === 0
                    ? 'None'
                    : `${formData.habit_ids.length} selected`}
                </span>
                <i className="fa-solid fa-chevron-down text-sm" style={{ color: '#657b84' }}></i>
              </button>

              {showHabitDropdown && (
                <div
                  className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
                >
                  {/* Filter input */}
                  <div className="p-2 border-b sticky top-0 bg-white" style={{ borderColor: '#E8EEF1' }}>
                    <input
                      type="text"
                      value={habitFilter}
                      onChange={(e) => setHabitFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded border text-sm font-light"
                      style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
                      placeholder="Filter habits..."
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {Object.entries(filteredGroupedHabits).map(([category, categoryHabits]) => (
                    <div key={category} className="p-2 border-b" style={{ borderColor: '#E8EEF1' }}>
                      <div className="text-xs font-semibold uppercase tracking-wide px-2 py-1" style={{ color: '#657b84' }}>
                        {category}
                      </div>
                      {categoryHabits.map((habit) => (
                        <label key={habit.id} className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            value={habit.id}
                            checked={formData.habit_ids.includes(habit.id.toString())}
                            onChange={(e) => {
                              const habitId = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                habit_ids: e.target.checked
                                  ? [...prev.habit_ids, habitId]
                                  : prev.habit_ids.filter((id) => id !== habitId),
                              }));
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm font-light" style={{ color: '#1d3e4c' }}>
                            {habit.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  ))}
                  {Object.keys(filteredGroupedHabits).length === 0 && (
                    <div className="p-4 text-center text-sm font-light" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#8E8E93' }}>
                      {habitFilter ? 'No matching habits' : 'No habits available'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Attach to Tasks */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
              Attach to Tasks
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTaskDropdown(!showTaskDropdown)}
                className="w-full px-4 py-3 rounded-lg focus:outline-none transition font-light text-left flex items-center justify-between"
                style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
              >
                <span style={{ color: '#657b84' }}>
                  {formData.task_ids.length === 0
                    ? 'None'
                    : `${formData.task_ids.length} selected`}
                </span>
                <i className="fa-solid fa-chevron-down text-sm" style={{ color: '#657b84' }}></i>
              </button>

              {showTaskDropdown && (
                <div
                  className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
                >
                  {/* Filter input */}
                  <div className="p-2 border-b sticky top-0 bg-white" style={{ borderColor: '#E8EEF1' }}>
                    <input
                      type="text"
                      value={taskFilter}
                      onChange={(e) => setTaskFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded border text-sm font-light"
                      style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
                      placeholder="Filter tasks..."
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="p-2">
                    {filteredTasks.map((task) => (
                      <label key={task.id} className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          value={task.id}
                          checked={formData.task_ids.includes(task.id.toString())}
                          onChange={(e) => {
                            const taskId = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              task_ids: e.target.checked
                                ? [...prev.task_ids, taskId]
                                : prev.task_ids.filter((id) => id !== taskId),
                            }));
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm font-light" style={{ color: '#1d3e4c' }}>
                          {task.name}
                        </span>
                      </label>
                    ))}
                    {filteredTasks.length === 0 && (
                      <div className="p-4 text-center text-sm font-light" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#8E8E93' }}>
                        {taskFilter ? 'No matching tasks' : 'No tasks available'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
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
              className="w-full px-4 py-3 rounded-lg focus:outline-none transition font-light"
              style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
              placeholder="Type to search or add new tag"
            />

            {/* Tag suggestions dropdown */}
            {showTagSuggestions && (filteredSuggestions.length > 0 || tagInput.trim()) && (
              <div
                className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg max-h-48 overflow-y-auto"
                style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
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
                    style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', color: '#1d3e4c' }}
                  >
                    <i className="fa-solid fa-plus mr-2" style={{ color: '#1d3e4c' }}></i>
                    Create "<strong>{tagInput.trim()}</strong>"
                  </button>
                )}
              </div>
            )}
          </div>

          <p className="text-xs font-light mt-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#8E8E93' }}>
            Type to search existing tags or create a new one. Press Enter or click to add.
          </p>

          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)', color: '#FFFFFF', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
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
      </form>
    </BaseModal>
  );
};

export default DocumentFormModal;
