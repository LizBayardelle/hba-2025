import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import { documentsApi, tasksApi, categoriesApi } from '../../utils/api';

const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp,.svg';

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
import useDocumentsStore from '../../stores/documentsStore';

// Helper function to detect content type from URL
const detectContentType = (url) => {
  if (!url || !url.trim()) {
    return 'document';
  }

  const lowerUrl = url.toLowerCase();

  // YouTube
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube';
  }

  // Video platforms
  if (lowerUrl.includes('vimeo.com') ||
      lowerUrl.includes('dailymotion.com') ||
      lowerUrl.includes('twitch.tv') ||
      lowerUrl.includes('wistia.com') ||
      lowerUrl.match(/\.(mp4|webm|mov|avi|mkv)(\?|$)/i)) {
    return 'video';
  }

  // Any other URL is a link
  return 'link';
};

const DocumentFormModal = ({ habits, allTags }) => {
  const { formModal, closeFormModal } = useDocumentsStore();
  const { isOpen, mode, documentId } = formModal;
  const queryClient = useQueryClient();
  const trixEditorRef = useRef(null);
  const trixLoadedRef = useRef(false);

  const [formData, setFormData] = useState({
    title: '',
    url: '',
    habit_ids: [],
    task_ids: [],
    category_ids: [],
    pinned: false,
  });
  const [showHabitDropdown, setShowHabitDropdown] = useState(false);
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const [habitFilter, setHabitFilter] = useState('');
  const [taskFilter, setTaskFilter] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Save status tracking (for edit mode only)
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'saved', 'error'
  const saveTimeoutRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const closeAfterSaveRef = useRef(false);
  const pendingSaveDataRef = useRef(null);

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

  // Fetch all categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.fetchAll,
    enabled: isOpen,
  });

  // Load document data when editing
  useEffect(() => {
    if (document && mode === 'edit') {
      setFormData({
        title: document.title,
        url: document.metadata?.url || '',
        habit_ids: document.habits?.map(h => h.id.toString()) || [],
        task_ids: document.tasks?.map(t => t.id.toString()) || [],
        category_ids: document.categories?.map(c => c.id.toString()) || [],
        pinned: document.pinned || false,
      });
      setSelectedTags(document.tags?.map(t => t.name) || []);

      // Only load Trix content on initial load, not after autosave refetches
      if (!trixLoadedRef.current) {
        setTimeout(() => {
          const trixEditor = trixEditorRef.current?.editor;
          if (trixEditor && document.body) {
            trixEditor.loadHTML(document.body || '');
          }
          trixLoadedRef.current = true;
        }, 100);
      }
    }
  }, [document, mode]);

  // Reset form when modal opens for new document
  useEffect(() => {
    if (isOpen && mode === 'new') {
      setFormData({
        title: '',
        url: '',
        habit_ids: [],
        task_ids: [],
        category_ids: [],
        pinned: false,
      });
      setSelectedTags([]);
      setTagInput('');
      setHabitFilter('');
      setTaskFilter('');
      setSaveStatus(null);
      setPendingFiles([]);
      trixLoadedRef.current = false;
      if (trixEditorRef.current?.editor) {
        trixEditorRef.current.editor.loadHTML('');
      }
    }
    if (isOpen && mode === 'edit') {
      trixLoadedRef.current = false;
      closeAfterSaveRef.current = false;
    }
  }, [isOpen, mode]);

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

  // Build document data for saving
  const buildDocumentData = useCallback((overrides = {}) => {
    const currentFormData = { ...formData, ...overrides };
    const currentTags = overrides.tags !== undefined ? overrides.tags : selectedTags;
    const contentType = detectContentType(currentFormData.url);

    const data = {
      content_type: contentType,
      title: currentFormData.title,
      habit_ids: currentFormData.habit_ids,
      task_ids: currentFormData.task_ids,
      category_ids: currentFormData.category_ids,
      tag_names: currentTags,
      pinned: currentFormData.pinned,
      metadata: {
        url: currentFormData.url,
      },
    };

    // Always include body content from Trix editor
    if (trixEditorRef.current) {
      data.body = trixEditorRef.current.value;
    }

    return data;
  }, [formData, selectedTags]);

  // Create mutation (for new mode - button click)
  const createMutation = useMutation({
    mutationFn: (data) => documentsApi.create({ habit_content: data }),
    onSuccess: async (response) => {
      // Upload pending files if any
      if (pendingFiles.length > 0 && response.content?.id) {
        await documentsApi.addFiles(response.content.id, pendingFiles);
        setPendingFiles([]);
      }
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      closeFormModal();
    },
  });

  // Update mutation (for edit mode - auto-save)
  const updateMutation = useMutation({
    mutationFn: (data) => documentsApi.update(documentId, { habit_content: data }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['documents'] }),
        queryClient.invalidateQueries({ queryKey: ['document', documentId] })
      ]);
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
    mutationFn: () => documentsApi.delete(documentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      closeFormModal();
    },
  });

  // File upload state
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]); // Local files for new mode
  const fileInputRef = useRef(null);

  // Add files mutation (edit mode only)
  const addFilesMutation = useMutation({
    mutationFn: (files) => documentsApi.addFiles(documentId, files),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['documents'] }),
        queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
      ]);
      setIsUploadingFiles(false);
    },
    onError: () => {
      setIsUploadingFiles(false);
    },
  });

  // Remove file mutation (edit mode only)
  const removeFileMutation = useMutation({
    mutationFn: (fileId) => documentsApi.removeFile(documentId, fileId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['documents'] }),
        queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
      ]);
    },
  });

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (mode === 'edit') {
      setIsUploadingFiles(true);
      addFilesMutation.mutate(files);
    } else {
      // New mode: collect files locally
      setPendingFiles(prev => [...prev, ...files]);
    }
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  // Handle file removal
  const handleRemoveFile = (fileId, isPending = false) => {
    if (isPending) {
      // Remove from local pending files by index
      setPendingFiles(prev => prev.filter((_, i) => i !== fileId));
    } else {
      removeFileMutation.mutate(fileId);
    }
  };

  // Auto-save for edit mode (debounced)
  const autoSave = useCallback((overrides = {}) => {
    if (mode !== 'edit') return;
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    const currentFormData = { ...formData, ...overrides };
    if (!currentFormData.title.trim()) return;

    setSaveStatus('saving');
    pendingSaveDataRef.current = overrides;
    debounceTimeoutRef.current = setTimeout(() => {
      pendingSaveDataRef.current = null;
      const data = buildDocumentData(overrides);
      updateMutation.mutate(data);
    }, 500);
  }, [mode, formData, buildDocumentData, updateMutation]);

  // Immediate save for edit mode (selections)
  const immediateSave = useCallback((overrides = {}) => {
    if (mode !== 'edit') return;

    const currentFormData = { ...formData, ...overrides };
    if (!currentFormData.title.trim()) return;

    setSaveStatus('saving');
    const data = buildDocumentData(overrides);
    updateMutation.mutate(data);
  }, [mode, formData, buildDocumentData, updateMutation]);

  // Handle title change
  const handleTitleChange = (e) => {
    const newFormData = { ...formData, title: e.target.value };
    setFormData(newFormData);
    if (mode === 'edit') {
      autoSave({ title: e.target.value });
    }
  };

  // Handle URL change
  const handleUrlChange = (e) => {
    const newFormData = { ...formData, url: e.target.value };
    setFormData(newFormData);
    if (mode === 'edit') {
      autoSave({ url: e.target.value });
    }
  };

  // Handle Trix editor changes (edit mode only)
  useEffect(() => {
    if (mode !== 'edit') return;

    const trixEditor = trixEditorRef.current;
    if (!trixEditor) return;

    const handleTrixChange = () => {
      if (formData.title.trim()) {
        autoSave({});
      }
    };

    trixEditor.addEventListener('trix-change', handleTrixChange);
    return () => {
      trixEditor.removeEventListener('trix-change', handleTrixChange);
    };
  }, [mode, autoSave, formData.title]);

  // Handle pin toggle
  const handlePinToggle = () => {
    const newPinned = !formData.pinned;
    setFormData(prev => ({ ...prev, pinned: newPinned }));
    if (mode === 'edit') {
      immediateSave({ pinned: newPinned });
    }
  };

  // Handle category toggle
  const handleCategoryToggle = (categoryId) => {
    const isSelected = formData.category_ids.includes(categoryId.toString());
    const newCategoryIds = isSelected
      ? formData.category_ids.filter(id => id !== categoryId.toString())
      : [...formData.category_ids, categoryId.toString()];

    setFormData(prev => ({ ...prev, category_ids: newCategoryIds }));
    if (mode === 'edit') {
      immediateSave({ category_ids: newCategoryIds });
    }
  };

  // Handle habit toggle
  const handleHabitToggle = (habitId, isChecked) => {
    const newHabitIds = isChecked
      ? [...formData.habit_ids, habitId]
      : formData.habit_ids.filter((id) => id !== habitId);

    setFormData(prev => ({ ...prev, habit_ids: newHabitIds }));
    if (mode === 'edit') {
      immediateSave({ habit_ids: newHabitIds });
    }
  };

  // Handle task toggle
  const handleTaskToggle = (taskId, isChecked) => {
    const newTaskIds = isChecked
      ? [...formData.task_ids, taskId]
      : formData.task_ids.filter((id) => id !== taskId);

    setFormData(prev => ({ ...prev, task_ids: newTaskIds }));
    if (mode === 'edit') {
      immediateSave({ task_ids: newTaskIds });
    }
  };

  // Handle adding a tag
  const handleAddTag = (tagName) => {
    const trimmedTag = tagName.trim();
    if (trimmedTag && !selectedTags.some(tag => tag.toLowerCase() === trimmedTag.toLowerCase())) {
      const newTags = [...selectedTags, trimmedTag];
      setSelectedTags(newTags);
      if (mode === 'edit' && formData.title.trim()) {
        immediateSave({ tags: newTags });
      }
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  // Handle removing a tag
  const handleRemoveTag = (tagToRemove) => {
    const newTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(newTags);
    if (mode === 'edit' && formData.title.trim()) {
      immediateSave({ tags: newTags });
    }
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

  // Handle form submit (new mode only)
  const handleSubmit = (e) => {
    e.preventDefault();
    const data = buildDocumentData();
    createMutation.mutate(data);
  };

  // Handle delete
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate();
    }
  };

  const handleClose = () => {
    if (mode !== 'edit') {
      closeFormModal();
      return;
    }

    // If there's a pending debounced save, flush it immediately
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
      const overrides = pendingSaveDataRef.current || {};
      pendingSaveDataRef.current = null;
      closeAfterSaveRef.current = true;
      const data = buildDocumentData(overrides);
      updateMutation.mutate(data);
      return;
    }

    // If a save is currently in-flight, wait for it
    if (updateMutation.isPending) {
      closeAfterSaveRef.current = true;
      return;
    }

    // Nothing pending, close immediately
    closeFormModal();
  };

  // Filter suggestions based on input (case insensitive)
  const filteredSuggestions = (allTags || [])
    .filter(tag =>
      tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !selectedTags.some(selectedTag => selectedTag.toLowerCase() === tag.name.toLowerCase())
    )
    .slice(0, 5);

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

  // Status indicator component (edit mode only)
  const StatusIndicator = () => {
    if (mode !== 'edit' || !saveStatus) return null;

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

  // Header actions for edit mode: delete button + save status
  const headerActions = mode === 'edit' ? (
    <>
      <button
        type="button"
        onClick={handleDelete}
        className="w-8 h-8 rounded-lg transition hover:bg-red-50 flex items-center justify-center"
        disabled={deleteMutation.isPending}
        title="Delete document"
      >
        {deleteMutation.isPending ? (
          <i className="fa-solid fa-spinner fa-spin text-sm" style={{ color: '#DC2626' }}></i>
        ) : (
          <i className="fa-solid fa-trash text-sm" style={{ color: '#DC2626' }}></i>
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
        onClick={handleClose}
        className="px-6 py-3 rounded-lg transition hover:bg-gray-100"
        style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F', border: '0.5px solid rgba(199, 199, 204, 0.3)', backgroundColor: 'white' }}
        disabled={createMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="document-form"
        className="px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition cursor-pointer disabled:opacity-50 hover:opacity-90"
        style={{
          background: 'linear-gradient(135deg, #A8A8AC 0%, #E5E5E7 45%, #FFFFFF 55%, #C7C7CC 70%, #8E8E93 100%)',
          border: '0.5px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
          color: '#1D1D1F',
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
        }}
        disabled={createMutation.isPending || !formData.title.trim()}
      >
        {createMutation.isPending ? 'Creating...' : 'Add Document'}
      </button>
    </>
  ) : null;

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'edit' ? (formData.title.trim() || 'Edit Document') : 'Add New Document'}
      footer={footer}
      headerActions={headerActions}
    >
      <form id="document-form" onSubmit={handleSubmit}>
        {createMutation.isError && (
          <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            <i className="fa-solid fa-exclamation-circle mr-2"></i>
            {createMutation.error?.message || 'An error occurred'}
          </div>
        )}

        {/* Title and Pin Toggle */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>Title</label>
            <button
              type="button"
              onClick={handlePinToggle}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition hover:opacity-80"
              style={{
                background: formData.pinned ? 'linear-gradient(135deg, #2D2D2F, #1D1D1F)' : 'rgba(142, 142, 147, 0.1)',
                color: formData.pinned ? 'white' : '#8E8E93',
              }}
              title={formData.pinned ? 'Unpin document' : 'Pin document'}
            >
              <i className={`fa-solid fa-thumbtack text-sm ${formData.pinned ? '' : 'opacity-60'}`}></i>
              <span className="text-xs font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
                {formData.pinned ? 'Pinned' : 'Pin'}
              </span>
            </button>
          </div>
          <input
            type="text"
            value={formData.title}
            onChange={handleTitleChange}
            required
            className="w-full px-4 py-3 rounded-lg focus:outline-none transition font-light"
            style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
            placeholder="e.g., Daily Affirmations, World Domination Plans"
            autoFocus={mode === 'new'}
          />
        </div>

        {/* Document Body */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
            Content <span className="font-normal" style={{ color: '#8E8E93' }}>(optional)</span>
          </label>
          <input type="hidden" name="body" id="document-form-body-hidden" />
          <trix-editor ref={trixEditorRef} input="document-form-body-hidden" className="trix-content"></trix-editor>
        </div>

        {/* URL Field */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
            URL <span className="font-normal" style={{ color: '#8E8E93' }}>(optional)</span>
          </label>
          <input
            type="url"
            value={formData.url}
            onChange={handleUrlChange}
            className="w-full px-4 py-3 rounded-lg focus:outline-none transition font-light"
            style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
            placeholder="https://youtube.com/watch?v=... or any link"
          />
          <p className="text-xs font-light mt-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#8E8E93' }}>
            Add a URL to embed YouTube, Vimeo, or link to external content
          </p>
        </div>

        {/* File Attachments */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
            Attachments <span className="font-normal" style={{ color: '#8E8E93' }}>(optional)</span>
          </label>

          {/* Existing server files (edit mode) */}
          {mode === 'edit' && document?.files && document.files.length > 0 && (
            <div className="space-y-2 mb-3">
              {document.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(142, 142, 147, 0.08)', border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <i className={`fa-solid ${file.content_type?.startsWith('image/') ? 'fa-image' : file.content_type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file'} text-sm`} style={{ color: '#8E8E93' }}></i>
                    <span className="text-sm truncate" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, color: '#1D1D1F' }}>
                      {file.filename}
                    </span>
                    <span className="text-xs flex-shrink-0" style={{ color: '#8E8E93' }}>
                      {formatFileSize(file.byte_size)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.id)}
                    disabled={removeFileMutation.isPending}
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-50 transition"
                    title="Remove file"
                  >
                    <i className="fa-solid fa-times text-xs" style={{ color: '#DC2626' }}></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pending local files (new mode) */}
          {mode === 'new' && pendingFiles.length > 0 && (
            <div className="space-y-2 mb-3">
              {pendingFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(142, 142, 147, 0.08)', border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <i className={`fa-solid ${file.type?.startsWith('image/') ? 'fa-image' : file.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file'} text-sm`} style={{ color: '#8E8E93' }}></i>
                    <span className="text-sm truncate" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, color: '#1D1D1F' }}>
                      {file.name}
                    </span>
                    <span className="text-xs flex-shrink-0" style={{ color: '#8E8E93' }}>
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index, true)}
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-50 transition"
                    title="Remove file"
                  >
                    <i className="fa-solid fa-times text-xs" style={{ color: '#DC2626' }}></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingFiles}
            className="w-full px-4 py-3 rounded-lg transition hover:opacity-80 flex items-center justify-center gap-2"
            style={{
              border: '1.5px dashed rgba(142, 142, 147, 0.4)',
              backgroundColor: 'rgba(142, 142, 147, 0.04)',
              color: '#8E8E93',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            {isUploadingFiles ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-sm"></i>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-paperclip text-sm"></i>
                <span>Attach Files</span>
              </>
            )}
          </button>
          <p className="text-xs font-light mt-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#8E8E93' }}>
            PDFs, images, documents, spreadsheets
          </p>
        </div>

        {/* Categories */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
            Categories <span className="font-normal" style={{ color: '#8E8E93' }}>(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const isSelected = formData.category_ids.includes(category.id.toString());
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryToggle(category.id)}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full transition hover:scale-105"
                  style={{
                    backgroundColor: isSelected ? category.color : 'white',
                    border: '1px solid ' + (isSelected ? category.color : 'rgba(199, 199, 204, 0.4)'),
                  }}
                >
                  <i
                    className={`fa-solid ${category.icon} text-sm`}
                    style={{ color: isSelected ? 'white' : category.color }}
                  ></i>
                  <span style={{
                    fontWeight: 500,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.8125rem',
                    color: isSelected ? 'white' : '#1D1D1F',
                  }}>
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

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
                            onChange={(e) => handleHabitToggle(e.target.value, e.target.checked)}
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
                          onChange={(e) => handleTaskToggle(e.target.value, e.target.checked)}
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
    </SlideOverPanel>
  );
};

export default DocumentFormModal;
