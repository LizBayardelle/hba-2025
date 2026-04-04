import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notesApi, categoriesApi, tagsApi } from '../../utils/api';
import useNotesStore from '../../stores/notesStore';
import NoteFormModal from './NoteFormModal';

const timeAgo = (ds) => {
  const s = Math.floor((new Date() - new Date(ds)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7); if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30); if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};

const NotesPage = () => {
  const { searchQuery, categoryFilter, tagFilter, setSearchQuery, setCategoryFilter, setTagFilter, openNewModal, openEditModal } = useNotesStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === 'true') { openNewModal(); window.history.replaceState({}, '', window.location.pathname); }
    const handleOpenNew = () => openNewModal();
    window.addEventListener('open-new-note', handleOpenNew);
    return () => window.removeEventListener('open-new-note', handleOpenNew);
  }, []);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', searchQuery, categoryFilter, tagFilter],
    queryFn: () => { const p = {}; if (searchQuery) p.search = searchQuery; if (categoryFilter) p.category_id = categoryFilter; if (tagFilter) p.tag_id = tagFilter; return notesApi.fetchAll(p); },
  });

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.fetchAll });
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.fetchAll });

  const activeCategory = categories.find(c => c.id === categoryFilter);
  const activeTag = allTags.find(t => t.id === tagFilter);

  const selectStyle = { padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.833rem', outline: 'none', maxWidth: 160 };

  return (
    <>
      {/* v2 Header */}
      <div className="sticky top-0 z-10" style={{ background: 'var(--bg)' }}>
        <div className="pl-14 pr-4 pt-6 pb-4 md:pl-8 md:pr-8 md:pt-8 md:pb-5">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="v2-h1">Notes</h1>
              {!isLoading && <p className="v2-small" style={{ marginTop: 4, color: 'var(--ink-tertiary)' }}>{notes.length} {notes.length === 1 ? 'note' : 'notes'}</p>}
            </div>
            <button onClick={openNewModal} className="v2-btn-sm v2-btn-primary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Note
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search notes..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm focus:outline-none"
                style={{ border: '1px solid var(--border)', fontFamily: 'var(--font-body)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '0.833rem' }} />
            </div>
            <select value={categoryFilter || ''} onChange={(e) => setCategoryFilter(e.target.value ? parseInt(e.target.value) : null)} style={selectStyle}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={tagFilter || ''} onChange={(e) => setTagFilter(e.target.value ? parseInt(e.target.value) : null)} style={selectStyle}>
              <option value="">All Tags</option>
              {allTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ height: 12, background: 'linear-gradient(to bottom, var(--bg), transparent)', pointerEvents: 'none' }} />
      </div>

      {/* Content */}
      <div className="px-4 pb-16 md:px-8" style={{ maxWidth: 1100, paddingTop: 8 }}>
        {/* Active filter pills */}
        {(categoryFilter || tagFilter) && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {activeCategory && (
              <button onClick={() => setCategoryFilter(null)} className="v2-badge" style={{ background: `${activeCategory.color}15`, color: activeCategory.color, padding: '3px 10px', cursor: 'pointer', border: 'none' }}>
                <i className={`fa-solid ${activeCategory.icon}`} style={{ fontSize: '0.6rem', marginRight: 4 }} />
                {activeCategory.name}
                <i className="fa-solid fa-xmark" style={{ fontSize: '0.55rem', marginLeft: 6 }} />
              </button>
            )}
            {activeTag && (
              <button onClick={() => setTagFilter(null)} className="v2-badge v2-badge-neutral" style={{ padding: '3px 10px', cursor: 'pointer', border: 'none' }}>
                {activeTag.name}
                <i className="fa-solid fa-xmark" style={{ fontSize: '0.55rem', marginLeft: 6 }} />
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ink-faint)' }} />
          </div>
        ) : notes.length === 0 ? (
          <div className="v2-card text-center" style={{ padding: '48px 24px' }}>
            <p className="v2-body">{searchQuery || categoryFilter || tagFilter ? 'No notes match your filters' : 'No notes yet'}</p>
            {!searchQuery && !categoryFilter && !tagFilter && (
              <p className="v2-small" style={{ color: 'var(--ink-faint)', marginTop: 4 }}>Jot down ideas, phone numbers, or quick thoughts.</p>
            )}
          </div>
        ) : (
          <>
            {(() => {
              const pinned = notes.filter(n => n.pinned);
              const unpinned = notes.filter(n => !n.pinned);

              const renderNoteCard = (note) => (
                <button key={note.id} onClick={() => openEditModal(note.id)} className="v2-card text-left transition-all duration-150 hover:shadow-sm"
                  style={{ padding: '16px 18px', cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>{timeAgo(note.updated_at || note.created_at)}</span>
                    {note.pinned && <i className="fa-solid fa-thumbtack" style={{ fontSize: '0.6rem', color: note.category?.color || 'var(--ink-faint)', transform: 'rotate(30deg)' }} />}
                  </div>
                  {note.title && <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '0.933rem', fontWeight: 500, color: 'var(--ink)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</h3>}
                  {note.body && <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.833rem', color: 'var(--ink-tertiary)', lineHeight: 1.5, whiteSpace: 'pre-line', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{note.body}</p>}
                  {(note.category || (note.tags && note.tags.length > 0)) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {note.category && <span className="v2-badge" style={{ background: `${note.category.color}15`, color: note.category.color, fontSize: '0.6rem', padding: '1px 6px' }}>{note.category.name}</span>}
                      {note.tags?.map(tag => <span key={tag.id} className="v2-badge v2-badge-neutral" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{tag.name}</span>)}
                    </div>
                  )}
                </button>
              );

              return (
                <>
                  {pinned.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div className="v2-section-label" style={{ padding: '0 2px 8px' }}>
                        <i className="fa-solid fa-thumbtack" style={{ fontSize: '0.6rem', marginRight: 4 }} />
                        Pinned
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {pinned.map(renderNoteCard)}
                      </div>
                    </div>
                  )}
                  {unpinned.length > 0 && (
                    <div>
                      {pinned.length > 0 && <div className="v2-section-label" style={{ padding: '0 2px 8px' }}>All Notes</div>}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {unpinned.map(renderNoteCard)}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>

      <NoteFormModal allTags={allTags} categories={categories} />
    </>
  );
};

export default NotesPage;
