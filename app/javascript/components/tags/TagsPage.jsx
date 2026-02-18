import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsApi } from '../../utils/api';
import useTagsStore from '../../stores/tagsStore';
import TagDetail from './TagDetail';
import TagEditModal from './TagEditModal';
import JournalViewModal from '../journal/JournalViewModal';
import DocumentViewModal from '../documents/DocumentViewModal';
import DocumentFormModal from '../documents/DocumentFormModal';
import TaskViewModal from '../tasks/TaskViewModal';
import HabitViewModal from '../habits/HabitViewModal';

const TagsPage = () => {
  const { selectedTagId, setSelectedTagId, openEditModal, clearSelectedTag } = useTagsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Check URL params for tag_id on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tagIdFromUrl = urlParams.get('tag_id');
    if (tagIdFromUrl) {
      setSelectedTagId(parseInt(tagIdFromUrl, 10));
    }
  }, [setSelectedTagId]);

  // Update URL when selected tag changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedTagId) {
      params.set('tag_id', selectedTagId);
    } else {
      params.delete('tag_id');
    }
    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [selectedTagId]);

  // Fetch all tags
  const { data: tags = [], isLoading, error } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.fetchAll,
  });

  // Filter tags based on search
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    const query = searchQuery.toLowerCase();
    return tags.filter(tag => tag.name.toLowerCase().includes(query));
  }, [tags, searchQuery]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (tagId) => tagsApi.delete(tagId),
    onSuccess: (_, deletedTagId) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      if (selectedTagId === deletedTagId) {
        clearSelectedTag();
      }
    },
  });

  const handleDelete = (tag, e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the tag "${tag.name}"? This will remove it from all associated items.`)) {
      deleteMutation.mutate(tag.id);
    }
  };

  const handleEdit = (tag, e) => {
    e.stopPropagation();
    openEditModal(tag.id, tag.name);
  };

  return (
    <>
      {/* Header Section */}
      <div style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-5xl font-display mb-2" style={{ color: '#1D1D1F' }}>
                Tags
              </h1>
            </div>
          </div>

          {/* Search Filter */}
          {tags.length > 0 && (
            <div className="mb-4 lg:mb-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tags..."
                className="w-full max-w-md px-4 py-2 rounded-lg text-sm"
                style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', color: '#1D1D1F', fontWeight: 400, fontFamily: "'Inter', sans-serif", background: '#FFFFFF' }}
              />
            </div>
          )}

          {/* Mobile: Horizontal scrollable tags */}
          {!isLoading && !error && tags.length > 0 && (
            <div className="lg:hidden mt-4 -mx-8 px-8">
              <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTagId(tag.id)}
                    className="flex-shrink-0 px-4 py-2 rounded-lg text-sm transition whitespace-nowrap"
                    style={selectedTagId === tag.id ? {
                      background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                    } : {
                      background: '#F5F5F7',
                      color: '#1D1D1F',
                      fontWeight: 500,
                      fontFamily: "'Inter', sans-serif"
                    }}
                  >
                    {tag.name}
                    <span
                      className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: selectedTagId === tag.id ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                        color: selectedTagId === tag.id ? 'white' : '#8E8E93',
                      }}
                    >
                      {tag.total_count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="px-8 pb-8 pt-6">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#2C2C2E' }}></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl p-12 text-center mt-6" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
            <i className="fa-solid fa-exclamation-circle text-6xl mb-4" style={{ color: '#DC2626' }}></i>
            <p style={{ color: '#DC2626', fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Error loading tags: {error.message}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && tags.length === 0 && (
          <div className="rounded-xl p-12 text-center mt-6" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
            <i className="fa-solid fa-tags text-6xl mb-4" style={{ color: '#E5E5E7' }}></i>
            <h3 className="text-xl mb-2" style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
              No Tags Yet
            </h3>
            <p style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
              Tags will appear here as you add them to journals, habits, documents, and tasks.
            </p>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && !error && tags.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Desktop: Left Column - Tags List */}
            <div className="hidden lg:block lg:col-span-1">
              {/* Tags List Header Bar */}
              <div
                className="px-6 py-4 rounded-t-lg flex items-center gap-3"
                style={{
                  background: 'linear-gradient(to bottom, color-mix(in srgb, #8E8E93 85%, white) 0%, #8E8E93 100%)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}
              >
                <i className="fa-solid fa-tags text-white text-lg"></i>
                <h3 className="text-2xl flex-1 text-white font-display" style={{ fontWeight: 500 }}>
                  All Tags ({filteredTags.length})
                </h3>
              </div>

              <div className="rounded-b-lg p-4" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
                {filteredTags.length === 0 && searchQuery && (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: '#8E8E93', fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>
                      No tags match "{searchQuery}"
                    </p>
                  </div>
                )}

                {filteredTags.length > 0 && (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => setSelectedTagId(tag.id)}
                        className="w-full text-left px-4 py-3 rounded-lg transition text-sm"
                        style={selectedTagId === tag.id ? {
                          background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)',
                          color: '#FFFFFF',
                          fontWeight: 600,
                          fontFamily: "'Inter', sans-serif",
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                        } : {
                          background: 'transparent',
                          color: '#1D1D1F',
                          fontWeight: 400,
                          fontFamily: "'Inter', sans-serif"
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{tag.name}</span>
                          <span
                            className="text-xs px-2 py-1 rounded-full"
                            style={{
                              backgroundColor: selectedTagId === tag.id ? 'rgba(255,255,255,0.2)' : '#F5F5F7',
                              color: selectedTagId === tag.id ? 'white' : '#8E8E93',
                              fontWeight: 600,
                            }}
                          >
                            {tag.total_count}
                          </span>
                        </div>
                        {tag.total_count > 0 && (
                          <div className="flex gap-3 mt-1 text-xs" style={{ color: selectedTagId === tag.id ? 'rgba(255,255,255,0.7)' : '#8E8E93' }}>
                            {tag.journals_count > 0 && (
                              <span>
                                <i className="fa-solid fa-book mr-1"></i>
                                {tag.journals_count}
                              </span>
                            )}
                            {tag.habits_count > 0 && (
                              <span>
                                <i className="fa-solid fa-chart-line mr-1"></i>
                                {tag.habits_count}
                              </span>
                            )}
                            {tag.documents_count > 0 && (
                              <span>
                                <i className="fa-solid fa-file-alt mr-1"></i>
                                {tag.documents_count}
                              </span>
                            )}
                            {tag.tasks_count > 0 && (
                              <span>
                                <i className="fa-solid fa-check mr-1"></i>
                                {tag.tasks_count}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (or full width on mobile) - Tag Detail */}
            <div className="lg:col-span-2">
              {selectedTagId ? (
                <TagDetail
                  tagId={selectedTagId}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  deletePending={deleteMutation.isPending}
                />
              ) : (
                <div className="rounded-xl p-12 text-center" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
                  <i
                    className="fa-solid fa-hand-pointer text-6xl mb-4"
                    style={{ color: '#E5E5E7' }}
                  ></i>
                  <h3 className="text-xl mb-2" style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
                    Select a Tag
                  </h3>
                  <p style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
                    Choose a tag to view all associated items
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <TagEditModal />
      <JournalViewModal />
      <DocumentViewModal />
      <DocumentFormModal />
      <TaskViewModal />
      <HabitViewModal />
    </>
  );
};

export default TagsPage;
