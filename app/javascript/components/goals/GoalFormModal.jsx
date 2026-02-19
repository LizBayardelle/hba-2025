import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import ChecklistSection from '../shared/ChecklistSection';
import ListShowModal from '../lists/ListShowModal';
import { goalsApi, documentsApi, listsApi } from '../../utils/api';
import useGoalsStore from '../../stores/goalsStore';
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

  // Load goal data when editing
  useEffect(() => {
    if (goal && mode === 'edit') {
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => goalsApi.create({ goal: data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      queryClient.invalidateQueries(['lists']);
      closeFormModal();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data) => goalsApi.update(goalId, { goal: data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      queryClient.invalidateQueries(['goal', goalId]);
      queryClient.invalidateQueries(['lists']);
      closeFormModal();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => goalsApi.delete(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      closeFormModal();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      ...formData,
      tag_names: selectedTags,
      category_id: formData.category_id || null,
      goal_content_ids: selectedDocumentIds,
      list_attachment_ids: selectedListIds,
    };

    if (mode === 'edit') {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
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
          title="Delete goal"
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
        form="goal-form"
        className="btn-liquid"
        disabled={currentMutation.isPending}
      >
        {currentMutation.isPending ? 'Saving...' : mode === 'edit' ? 'Update Goal' : 'Create Goal'}
      </button>
    </>
  );

  return (
    <>
      <SlideOverPanel
        isOpen={isOpen}
        onClose={closeFormModal}
        title={mode === 'edit' ? 'Edit Goal' : 'New Goal'}
        footer={footer}
      >
        <form id="goal-form" onSubmit={handleSubmit}>
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
            {/* Goal Name */}
            <div className="mb-4">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Goal name..."
                className="form-input-hero"
              />
            </div>

            {/* Goal Type Toggle */}
            <div className="mb-4">
              <label className="form-label">
                Goal Type
              </label>
              <div className="button-bar">
                {[
                  { value: 'counted', label: 'Counted', icon: 'fa-hashtag' },
                  { value: 'named_steps', label: 'Named Steps', icon: 'fa-list-ol' },
                ].map(({ value, label, icon }) => {
                  const isActive = formData.goal_type === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData({ ...formData, goal_type: value })}
                      className={`flex items-center gap-2 px-4 py-2.5 ${isActive ? 'liquid-surface-subtle' : ''}`}
                      style={isActive ? { '--surface-color': '#2C2C2E' } : {}}
                    >
                      <i className={`fa-solid ${icon} text-sm`} style={{ color: isActive ? 'white' : '#8E8E93' }}></i>
                      <span className="bar-item-text" style={{ color: isActive ? 'white' : '#1D1D1F' }}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="form-label">
                Category
              </label>
              <div className="button-bar flex-wrap">
                {/* None option */}
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

            {/* Description */}
            <div>
              <label className="form-label">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your goal..."
                rows={3}
                className="form-input resize-none"
              />
            </div>
          </Section>

          {/* ==================== GOAL CONFIG SECTION ==================== */}
          <Section title="Goal Config">
            {formData.goal_type === 'counted' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">
                    Target Count *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.target_count}
                    onChange={(e) => setFormData({ ...formData, target_count: parseInt(e.target.value) || 1 })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">
                    Unit Name
                  </label>
                  <input
                    type="text"
                    value={formData.unit_name}
                    onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })}
                    placeholder="e.g., miles, reps, books..."
                    className="form-input"
                  />
                </div>
              </div>
            ) : (
              <div>
                {mode === 'edit' && goalId ? (
                  <div>
                    <label className="form-label">
                      Steps
                    </label>
                    <ChecklistSection
                      parentType="goal"
                      parentId={goalId}
                      items={goal?.checklist_items || []}
                      color={categories?.find(c => c.id === formData.category_id)?.color || '#1D1D1F'}
                      editable={true}
                    />
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="fa-solid fa-info-circle text-lg mb-2" style={{ color: '#8E8E93' }}></i>
                    <p className="text-sm" style={{ color: '#8E8E93', fontFamily: "'Inter', sans-serif" }}>
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
        </form>
      </SlideOverPanel>

      <ListShowModal />
    </>
  );
};

export default GoalFormModal;
