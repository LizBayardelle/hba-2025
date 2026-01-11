import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsApi } from '../../utils/api';
import useTagsStore from '../../stores/tagsStore';
import TagDetail from './TagDetail';
import TagEditModal from './TagEditModal';
import JournalViewModal from '../journal/JournalViewModal';
import DocumentViewModal from '../documents/DocumentViewModal';
import TaskViewModal from '../tasks/TaskViewModal';
import HabitViewModal from '../habits/HabitViewModal';

const TagsPage = () => {
  const { selectedTagId, setSelectedTagId, openEditModal, clearSelectedTag } = useTagsStore();
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (tagId) => tagsApi.delete(tagId),
    onSuccess: (_, deletedTagId) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      // Clear selection if deleted tag was selected
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
      <div className="bg-white shadow-md">
        <div className="p-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center shadow-md"
                  style={{ background: 'linear-gradient(135deg, #1d3e4c, #45606b)' }}
                >
                  <i className="fa-solid fa-tags text-white text-2xl"></i>
                </div>
                <div>
                  <h1 className="text-3xl font-bold display-font" style={{ color: '#1d3e4c' }}>
                    Tags
                  </h1>
                  <p className="text-sm font-light" style={{ color: '#657b84' }}>
                    Browse your tags and tagged items
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Tags List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#1d3e4c' }}>
                All Tags ({tags.length})
              </h2>

              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div
                    className="animate-spin rounded-full h-8 w-8 border-b-2"
                    style={{ borderColor: '#1d3e4c' }}
                  ></div>
                </div>
              )}

              {error && (
                <div className="text-center py-8" style={{ color: '#DC2626' }}>
                  <i className="fa-solid fa-exclamation-circle text-3xl mb-2"></i>
                  <p className="text-sm">Error loading tags: {error.message}</p>
                </div>
              )}

              {!isLoading && !error && tags.length === 0 && (
                <div className="text-center py-8">
                  <i
                    className="fa-solid fa-tags text-5xl mb-3"
                    style={{ color: '#1d3e4c40' }}
                  ></i>
                  <p className="text-sm font-light" style={{ color: '#657b84' }}>
                    No tags yet. Tags will appear here as you add them to journals, habits, documents, and tasks.
                  </p>
                </div>
              )}

              {!isLoading && !error && tags.length > 0 && (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => setSelectedTagId(tag.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition ${
                        selectedTagId === tag.id
                          ? 'font-semibold shadow-md'
                          : 'font-light hover:bg-gray-50'
                      }`}
                      style={{
                        backgroundColor: selectedTagId === tag.id ? '#E8EEF1' : 'transparent',
                        color: selectedTagId === tag.id ? '#1d3e4c' : '#657b84',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{tag.name}</span>
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: selectedTagId === tag.id ? '#1d3e4c' : '#E8EEF1',
                            color: selectedTagId === tag.id ? 'white' : '#657b84',
                          }}
                        >
                          {tag.total_count}
                        </span>
                      </div>
                      {tag.total_count > 0 && (
                        <div className="flex gap-3 mt-1 text-xs" style={{ color: '#657b84' }}>
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

          {/* Right Column - Tag Detail */}
          <div className="lg:col-span-2">
            {selectedTagId ? (
              <TagDetail
                tagId={selectedTagId}
                onEdit={handleEdit}
                onDelete={handleDelete}
                deletePending={deleteMutation.isPending}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <i
                  className="fa-solid fa-hand-pointer text-6xl mb-4"
                  style={{ color: '#1d3e4c40' }}
                ></i>
                <p className="text-lg font-light" style={{ color: '#657b84' }}>
                  Select a tag to view all associated items
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <TagEditModal />
      <JournalViewModal />
      <DocumentViewModal />
      <TaskViewModal />
      <HabitViewModal />
    </>
  );
};

export default TagsPage;
