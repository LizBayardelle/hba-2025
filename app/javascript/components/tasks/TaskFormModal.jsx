import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import ChecklistSection from '../shared/ChecklistSection';
import ListShowModal from '../lists/ListShowModal';
import { tasksApi, documentsApi, listsApi } from '../../utils/api';
import useTasksStore from '../../stores/tasksStore';
import useDocumentsStore from '../../stores/documentsStore';
import useListsStore from '../../stores/listsStore';

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
          className="mr-auto w-10 h-10 rounded-lg transition hover:bg-white/10 flex items-center justify-center"
          disabled={deleteMutation.isPending}
          title="Delete task"
        >
          {deleteMutation.isPending ? (
            <i className="fa-solid fa-spinner fa-spin text-white"></i>
          ) : (
            <i className="fa-solid fa-trash text-white text-lg"></i>
          )}
        </button>
      )}
      <button
        type="button"
        onClick={closeFormModal}
        className="px-6 py-3 rounded-lg transition hover:bg-gray-100"
        style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F', border: '0.5px solid rgba(199, 199, 204, 0.3)', backgroundColor: 'white' }}
        disabled={currentMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="task-form"
        className="px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition cursor-pointer disabled:opacity-50 hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #A8A8AC 0%, #E5E5E7 45%, #FFFFFF 55%, #C7C7CC 70%, #8E8E93 100%)', border: '0.5px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3)', color: '#1D1D1F', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
        disabled={currentMutation.isPending}
      >
        {currentMutation.isPending ? 'Saving...' : mode === 'edit' ? 'Update Task' : 'Create Task'}
      </button>
    </>
  );

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={closeFormModal}
        title={mode === 'edit' ? 'Edit Task' : 'New Task'}
        footer={footer}
        size="large"
      >
        <form id="task-form" onSubmit={handleSubmit}>
          {currentMutation.isError && (
            <div
              className="mb-4 p-4 rounded-lg"
              style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
            >
              <i className="fa-solid fa-exclamation-circle mr-2"></i>
              {currentMutation.error?.message || 'An error occurred'}
            </div>
          )}

          {/* ==================== BASICS SECTION ==================== */}
          <Section icon="fa-cube" title="Basics">
            {/* Task Name */}
            <div className="mb-4">
              <label className="block mb-2 text-sm" style={{ fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
                Task Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Enter task name..."
                className="w-full px-4 py-3 rounded-lg focus:outline-none transition"
                style={{ backgroundColor: 'white', border: '1px solid rgba(199, 199, 204, 0.4)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
              />
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="block mb-2 text-sm" style={{ fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, category_id: '' })}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full transition hover:scale-105"
                  style={{
                    backgroundColor: formData.category_id === '' ? '#1D1D1F' : 'white',
                    border: '1px solid ' + (formData.category_id === '' ? '#1D1D1F' : 'rgba(199, 199, 204, 0.4)'),
                  }}
                >
                  <i
                    className="fa-solid fa-folder text-sm"
                    style={{ color: formData.category_id === '' ? 'white' : '#8E8E93' }}
                  ></i>
                  <span style={{ fontWeight: 500, fontSize: '0.8125rem', color: formData.category_id === '' ? 'white' : '#1D1D1F' }}>
                    None
                  </span>
                </button>
                {categories?.map((category) => (
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

            {/* Due Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-2 text-sm" style={{ fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
                  Due Date
                </label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none transition"
                  style={{ backgroundColor: 'white', border: '1px solid rgba(199, 199, 204, 0.4)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm" style={{ fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
                  Due Time
                </label>
                <input
                  type="time"
                  name="due_time"
                  value={formData.due_time}
                  onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none transition"
                  style={{ backgroundColor: 'white', border: '1px solid rgba(199, 199, 204, 0.4)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
                />
              </div>
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
                {timeBlocks?.map((block) => (
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
          <Section icon="fa-paperclip" title="Attachments">
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
                  <span className="ml-1 text-xs font-normal" style={{ color: '#8E8E93' }}>(single use)</span>
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

          {/* ==================== DETAILS SECTION ==================== */}
          <Section icon="fa-circle-info" title="Details">
            {/* Location */}
            <div className="mb-4">
              <label className="block mb-2 text-sm" style={{ fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
                Location / Address
              </label>
              <input
                type="text"
                name="location_name"
                value={formData.location_name}
                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                placeholder="123 Main St, City, State 12345"
                className="w-full px-4 py-3 rounded-lg focus:outline-none transition"
                style={{ backgroundColor: 'white', border: '1px solid rgba(199, 199, 204, 0.4)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
              />
            </div>

            {/* URL */}
            <div className="mb-4">
              <label className="block mb-2 text-sm" style={{ fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
                URL
              </label>
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-lg focus:outline-none transition"
                style={{ backgroundColor: 'white', border: '1px solid rgba(199, 199, 204, 0.4)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
              />
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block mb-2 text-sm" style={{ fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
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
                <label className="block mb-2 text-sm" style={{ fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
                  Checklist
                </label>
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'white', border: '1px solid rgba(199, 199, 204, 0.4)' }}
                >
                  <ChecklistSection
                    parentType="task"
                    parentId={taskId}
                    items={task?.checklist_items || []}
                    color={categories?.find(c => c.id === formData.category_id)?.color || '#1D1D1F'}
                    editable={true}
                  />
                </div>
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
            <label className="text-sm font-medium" style={{ color: '#1D1D1F' }}>
              Put task on hold
            </label>
          </div>
        </form>
      </BaseModal>

      <ListShowModal />
    </>
  );
};

export default TaskFormModal;
