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

  // Filter and sort tags
  const filteredTags = useMemo(() => {
    const sorted = [...tags].sort((a, b) => a.name.localeCompare(b.name));
    if (!searchQuery.trim()) return sorted;
    const query = searchQuery.toLowerCase();
    return sorted.filter(tag => tag.name.toLowerCase().includes(query));
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
    if (window.confirm(`Delete "${tag.name}"? This removes the tag from all items.`)) {
      deleteMutation.mutate(tag.id);
    }
  };

  const handleEdit = (tag, e) => {
    e.stopPropagation();
    openEditModal(tag.id, tag.name);
  };

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 shadow-deep" style={{ background: '#FFFFFF' }}>
        <div className="px-8 pt-8 pb-5">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-5xl font-display" style={{ color: '#1D1D1F' }}>Tags</h1>
            {tags.length > 0 && (
              <span
                className="text-sm px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: '#F5F5F7', color: '#8E8E93', fontWeight: 600 }}
              >
                {tags.length}
              </span>
            )}
          </div>

          {/* Search */}
          {tags.length > 0 && (
            <div className="relative">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#8E8E93' }}></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tags..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none transition-shadow duration-200"
                style={{
                  border: '1px solid #8E8E93',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  background: '#FFFFFF',
                  boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.8)',
                  letterSpacing: '0.01em',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          )}
        </div>

        {/* Tag chips */}
        {!isLoading && !error && filteredTags.length > 0 && (
          <div className="px-8 pb-5 flex flex-wrap gap-2 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {filteredTags.map(tag => {
              const isSelected = selectedTagId === tag.id;
              return (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTagId(tag.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${isSelected ? '' : 'hover:bg-gray-100'}`}
                  style={isSelected
                    ? { background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)' }
                    : { backgroundColor: '#F5F5F7' }
                  }
                >
                  <i
                    className="fa-solid fa-tag text-[10px]"
                    style={{ color: isSelected ? 'rgba(255,255,255,0.6)' : '#C7C7CC' }}
                  ></i>
                  <span style={{
                    color: isSelected ? 'white' : '#1D1D1F',
                    fontWeight: isSelected ? 600 : 400,
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {tag.name}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(142, 142, 147, 0.15)',
                      color: isSelected ? 'rgba(255,255,255,0.8)' : '#8E8E93',
                      fontWeight: 600,
                    }}
                  >
                    {tag.total_count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search no results */}
        {!isLoading && !error && tags.length > 0 && filteredTags.length === 0 && searchQuery && (
          <div className="px-8 pb-5">
            <p className="text-sm" style={{ color: '#8E8E93' }}>
              No tags match "{searchQuery}"
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#2C2C2E' }}></div>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-12 text-center shadow-deep" style={{ background: '#FFFFFF' }}>
            <i className="fa-solid fa-exclamation-circle text-6xl mb-4" style={{ color: '#DC2626' }}></i>
            <p style={{ color: '#DC2626', fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>
              Error loading tags: {error.message}
            </p>
          </div>
        )}

        {!isLoading && !error && tags.length === 0 && (
          <div className="rounded-xl p-12 text-center shadow-deep" style={{ background: '#FFFFFF' }}>
            <i className="fa-solid fa-tags text-6xl mb-4 block" style={{ color: '#E5E5E7' }}></i>
            <h3 className="text-xl mb-2" style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
              No Tags Yet
            </h3>
            <p style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
              Tags will appear here as you add them to journals, habits, documents, and tasks.
            </p>
          </div>
        )}

        {!isLoading && !error && tags.length > 0 && selectedTagId && (
          <TagDetail
            tagId={selectedTagId}
            onEdit={handleEdit}
            onDelete={handleDelete}
            deletePending={deleteMutation.isPending}
          />
        )}

        {!isLoading && !error && tags.length > 0 && !selectedTagId && (
          <div className="rounded-xl p-12 text-center shadow-deep" style={{ background: '#FFFFFF' }}>
            <i className="fa-solid fa-hand-pointer text-5xl mb-4 block" style={{ color: '#E5E5E7' }}></i>
            <h3 className="text-lg mb-1" style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
              Select a Tag
            </h3>
            <p className="text-sm" style={{ color: '#8E8E93', fontWeight: 300, fontFamily: "'Inter', sans-serif" }}>
              Choose a tag above to see everything associated with it
            </p>
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
