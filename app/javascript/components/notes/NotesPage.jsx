import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notesApi, categoriesApi, tagsApi } from '../../utils/api';
import useNotesStore from '../../stores/notesStore';
import NoteFormModal from './NoteFormModal';

const timeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

// Sticky note background colors (warm pastel tones)
const STICKY_COLORS = [
  '#FFF9C4', // yellow
  '#FFECB3', // amber
  '#FFE0B2', // orange
  '#F0F4C3', // lime
  '#DCEDC8', // light green
  '#B3E5FC', // light blue
  '#E1BEE7', // lavender
  '#F8BBD0', // pink
  '#D7CCC8', // warm grey
  '#CFD8DC', // blue grey
];

const getStickyColor = (noteId) => {
  return STICKY_COLORS[noteId % STICKY_COLORS.length];
};

const NotesPage = () => {
  const {
    searchQuery,
    categoryFilter,
    tagFilter,
    setSearchQuery,
    setCategoryFilter,
    setTagFilter,
    openNewModal,
    openEditModal,
  } = useNotesStore();

  // Open new modal if ?new=true in URL (for sidebar quick-create)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === 'true') {
      openNewModal();
      window.history.replaceState({}, '', window.location.pathname);
    }

    const handleOpenNew = () => openNewModal();
    window.addEventListener('open-new-note', handleOpenNew);
    return () => window.removeEventListener('open-new-note', handleOpenNew);
  }, []);

  // Fetch notes
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', searchQuery, categoryFilter, tagFilter],
    queryFn: () => {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (categoryFilter) params.category_id = categoryFilter;
      if (tagFilter) params.tag_id = tagFilter;
      return notesApi.fetchAll(params);
    },
  });

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.fetchAll,
  });

  // Fetch tags for filter and modal
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.fetchAll,
  });

  const activeCategory = categories.find(c => c.id === categoryFilter);
  const activeTag = allTags.find(t => t.id === tagFilter);

  return (
    <>
      {/* White Header Section */}
      <div className="sticky top-0 z-10 shadow-deep" style={{ background: '#FFFFFF' }}>
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1
                className="text-5xl font-display"
                style={{ color: '#1D1D1F' }}
              >
                Notes
              </h1>
              {!isLoading && (
                <p className="text-sm mt-1" style={{ color: '#8E8E93', fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                </p>
              )}
            </div>
            <button
              onClick={openNewModal}
              className="w-12 h-12 rounded-xl text-white transition transform hover:scale-105 flex items-center justify-center btn-onyx"
              title="New Note"
            >
              <i className="fa-solid fa-plus text-lg"></i>
            </button>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <i
                className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: '#8E8E93', fontSize: '0.85rem', pointerEvents: 'none' }}
              ></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none transition-shadow duration-200"
                style={{
                  border: '1px solid #8E8E93',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  background: '#FFFFFF',
                  boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.8)',
                  letterSpacing: '0.01em',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Category filter */}
            <select
              value={categoryFilter || ''}
              onChange={(e) => setCategoryFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="py-2.5 px-3 rounded-lg text-sm focus:outline-none"
              style={{
                maxWidth: '180px',
                fontSize: '0.9rem',
                border: '1px solid #8E8E93',
                fontFamily: "'Inter', sans-serif",
                background: '#FFFFFF',
                boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.8)',
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            {/* Tag filter */}
            <select
              value={tagFilter || ''}
              onChange={(e) => setTagFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="py-2.5 px-3 rounded-lg text-sm focus:outline-none"
              style={{
                maxWidth: '160px',
                fontSize: '0.9rem',
                border: '1px solid #8E8E93',
                fontFamily: "'Inter', sans-serif",
                background: '#FFFFFF',
                boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.8)',
              }}
            >
              <option value="">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-8 pb-8 pt-6">
        {/* Active filter pills */}
        {(categoryFilter || tagFilter) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeCategory && (
              <button
                onClick={() => setCategoryFilter(null)}
                className="text-xs px-3 py-1.5 rounded-full flex items-center gap-2 transition hover:opacity-80"
                style={{
                  backgroundColor: activeCategory.color + '18',
                  color: activeCategory.color,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  border: `1px solid ${activeCategory.color}40`,
                }}
              >
                <i className={`fa-solid ${activeCategory.icon}`} style={{ fontSize: '0.65rem' }}></i>
                {activeCategory.name}
                <i className="fa-solid fa-xmark" style={{ fontSize: '0.6rem' }}></i>
              </button>
            )}
            {activeTag && (
              <button
                onClick={() => setTagFilter(null)}
                className="text-xs px-3 py-1.5 rounded-full flex items-center gap-2 transition hover:opacity-80"
                style={{
                  backgroundColor: 'rgba(44, 44, 46, 0.08)',
                  color: '#2C2C2E',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  border: '1px solid rgba(44, 44, 46, 0.2)',
                }}
              >
                {activeTag.name}
                <i className="fa-solid fa-xmark" style={{ fontSize: '0.6rem' }}></i>
              </button>
            )}
          </div>
        )}

        {/* Notes Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <i className="fa-solid fa-spinner fa-spin text-2xl" style={{ color: '#8E8E93' }}></i>
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-xl p-12 text-center shadow-deep" style={{ background: '#FFFFFF' }}>
            <i className="fa-solid fa-note-sticky text-5xl mb-4" style={{ color: '#C7C7CC' }}></i>
            <p className="text-lg mb-2" style={{ color: '#8E8E93', fontFamily: "'Inter', sans-serif" }}>
              {searchQuery || categoryFilter || tagFilter ? 'No notes match your filters' : 'No notes yet'}
            </p>
            {!searchQuery && !categoryFilter && !tagFilter && (
              <p className="text-sm" style={{ color: '#C7C7CC', fontFamily: "'Inter', sans-serif" }}>
                Jot down ideas, phone numbers, or quick thoughts.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} onClick={() => openEditModal(note.id)} />
            ))}
          </div>
        )}
      </div>

      <NoteFormModal allTags={allTags} categories={categories} />
    </>
  );
};

const NoteCard = ({ note, onClick }) => {
  const categoryColor = note.category?.color || '#8E8E93';

  return (
    <button
      onClick={onClick}
      className="text-left w-full rounded-xl p-5 pb-7 transition-all duration-200 hover:-translate-y-0.5 relative shadow-deep"
      style={{
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Pin + time row */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs"
          style={{ color: '#8E8E93', fontFamily: "'Inter', sans-serif" }}
        >
          {timeAgo(note.updated_at || note.created_at)}
        </span>
        {note.pinned && (
          <i
            className="fa-solid fa-thumbtack text-xs"
            style={{ color: categoryColor, transform: 'rotate(30deg)' }}
          ></i>
        )}
      </div>

      {/* Title */}
      {note.title && (
        <h3
          className="font-display text-lg mb-1 line-clamp-1 pr-4"
          style={{ color: '#1D1D1F', fontWeight: 500 }}
        >
          {note.title}
        </h3>
      )}

      {/* Body preview */}
      {note.body && (
        <p
          className="text-sm line-clamp-4 mb-3"
          style={{
            color: '#4A4A4E',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 300,
            lineHeight: 1.5,
          }}
        >
          {note.body}
        </p>
      )}

      {/* Category badge + Tags */}
      {(note.category || (note.tags && note.tags.length > 0)) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {note.category && (
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: categoryColor, color: 'white' }}
            >
              <i className={`fa-solid ${note.category.icon} text-[10px]`}></i>
              {note.category.name}
            </span>
          )}
          {note.tags?.map((tag) => (
            <span
              key={tag.id}
              className="text-xs px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.06)',
                color: '#6B6B6F',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Edit button — bottom right, theme colored */}
      <div
        className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
        style={{ backgroundColor: categoryColor }}
      >
        <i className="fa-solid fa-pencil" style={{ color: 'white', fontSize: '0.55rem' }}></i>
      </div>
    </button>
  );
};

export default NotesPage;
