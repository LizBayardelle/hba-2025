import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, tagsApi, categoriesApi } from '../../utils/api';
import useDocumentsStore from '../../stores/documentsStore';
import DocumentViewModal from './DocumentViewModal';
import DocumentFormModal from './DocumentFormModal';

const getInitialGrouping = () => {
  const params = new URLSearchParams(window.location.search);
  const urlGroupBy = params.get('groupBy');
  if (urlGroupBy) return urlGroupBy;
  const rootElement = document.getElementById('documents-react-root');
  return rootElement?.dataset?.defaultGrouping || 'type';
};

const DocumentsPage = ({ habits }) => {
  const [groupBy, setGroupBy] = useState(getInitialGrouping);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const { openViewModal, openNewModal, openEditModal } = useDocumentsStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (groupBy && groupBy !== 'type') params.set('groupBy', groupBy); else params.delete('groupBy');
    window.history.replaceState({}, '', params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname);
  }, [groupBy]);

  const { data: documents = [], isLoading, error } = useQuery({ queryKey: ['documents'], queryFn: documentsApi.fetchAll });
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.fetchAll });
  const { data: categoriesData } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.fetchAll });
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const deleteMutation = useMutation({ mutationFn: documentsApi.delete, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }) });
  const togglePinMutation = useMutation({ mutationFn: documentsApi.togglePin, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }) });

  const contentTypes = [
    { type: 'document', label: 'Documents' }, { type: 'youtube', label: 'YouTube' },
    { type: 'video', label: 'Videos' }, { type: 'link', label: 'Links' },
  ];

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter(doc => doc.title?.toLowerCase().includes(q) || doc.tags?.some(t => t.name.toLowerCase().includes(q)) || doc.body?.replace(/<[^>]*>/g, '').toLowerCase().includes(q));
  }, [documents, searchQuery]);

  const sortPinnedFirst = (docs) => [...docs].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const groupedDocuments = useMemo(() => {
    if (groupBy === 'none') return [{ id: 'all', title: 'All', documents: sortPinnedFirst(filteredDocuments), hideHeader: true }];

    if (groupBy === 'type') {
      const groups = {}; contentTypes.forEach(ct => { groups[ct.type] = { id: ct.type, title: ct.label, documents: [] }; });
      filteredDocuments.forEach(doc => { const t = doc.content_type || 'document'; if (groups[t]) groups[t].documents.push(doc); });
      return Object.values(groups).map(g => ({ ...g, documents: sortPinnedFirst(g.documents) }));
    } else if (groupBy === 'tag') {
      const groups = {}; allTags.forEach(tag => { groups[tag.id] = { id: tag.id, title: tag.name, documents: [] }; });
      const untagged = { id: 'untagged', title: 'Untagged', documents: [] };
      filteredDocuments.forEach(doc => { if (doc.tags?.length > 0) doc.tags.forEach(tag => { if (groups[tag.id] && !groups[tag.id].documents.find(d => d.id === doc.id)) groups[tag.id].documents.push(doc); }); else untagged.documents.push(doc); });
      const result = Object.values(groups).map(g => ({ ...g, documents: sortPinnedFirst(g.documents) }));
      if (untagged.documents.length > 0) result.push({ ...untagged, documents: sortPinnedFirst(untagged.documents) });
      return result;
    } else if (groupBy === 'category') {
      const groups = {}; categories.forEach(cat => { groups[cat.id] = { id: cat.id, title: cat.name, color: cat.color, documents: [] }; });
      const uncategorized = { id: 'uncategorized', title: 'Uncategorized', documents: [] };
      filteredDocuments.forEach(doc => { if (doc.categories?.length > 0) doc.categories.forEach(cat => { if (groups[cat.id] && !groups[cat.id].documents.find(d => d.id === doc.id)) groups[cat.id].documents.push(doc); }); else uncategorized.documents.push(doc); });
      const result = Object.values(groups).map(g => ({ ...g, documents: sortPinnedFirst(g.documents) }));
      result.push({ ...uncategorized, documents: sortPinnedFirst(uncategorized.documents) });
      return result;
    }
    return [{ title: 'All', documents: sortPinnedFirst(filteredDocuments), hideHeader: true }];
  }, [filteredDocuments, groupBy, allTags, categories]);

  const renderDocCard = (doc) => {
    const catColor = doc.categories?.[0]?.color;
    return (
      <div key={doc.id} onClick={() => openViewModal(doc.id)}
        className="flex items-center gap-2.5"
        style={{ padding: '10px 24px', transition: 'background 0.1s ease', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 450, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</span>
            {doc.pinned && <i className="fa-solid fa-thumbtack" style={{ fontSize: '0.55rem', color: catColor || 'var(--ink-faint)', transform: 'rotate(30deg)' }} />}
            {doc.files?.length > 0 && <i className="fa-solid fa-paperclip" style={{ fontSize: '0.6rem', color: 'var(--ink-faint)' }} title={`${doc.files.length} attachment${doc.files.length === 1 ? '' : 's'}`} />}
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.767rem', color: 'var(--ink-faint)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc.content_type === 'document'
              ? (doc.body?.replace(/<\/(div|p|h[1-6]|li|br)>/gi, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().substring(0, 80) || 'No content')
              : (doc.metadata?.url || 'No URL')}
          </p>
          {(doc.tags?.length > 0 || doc.categories?.length > 0) && (
            <div className="flex flex-wrap gap-1 mt-1">
              {doc.categories?.map(cat => <span key={cat.id} className="v2-badge" style={{ background: `${cat.color}15`, color: cat.color, fontSize: '0.6rem', padding: '1px 6px' }}>{cat.name}</span>)}
              {doc.tags?.map(tag => <span key={tag.id} className="v2-badge v2-badge-neutral" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{tag.name}</span>)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); togglePinMutation.mutate(doc.id); }} className="v2-btn-icon-sm" title={doc.pinned ? 'Unpin' : 'Pin'}>
            <i className="fa-solid fa-thumbtack" style={{ fontSize: '0.6rem', color: doc.pinned ? 'var(--ink)' : 'var(--ink-faint)', opacity: doc.pinned ? 1 : 0.4 }} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openEditModal(doc.id); }} className="v2-btn-icon-sm" title="Edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="sticky top-0 z-10" style={{ background: 'var(--bg)' }}>
        <div className="pl-14 pr-4 pt-6 pb-4 md:pl-8 md:pr-8 md:pt-8 md:pb-5">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="v2-h1">Documents</h1>
              <p className="v2-small" style={{ marginTop: 4, color: 'var(--ink-tertiary)' }}>{documents.length} documents</p>
            </div>
            <button onClick={openNewModal} className="v2-btn-sm v2-btn-primary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Document
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="v2-seg-control">
              {[{ value: 'none', label: 'All' }, { value: 'type', label: 'Type' }, { value: 'tag', label: 'Tag' }, { value: 'category', label: 'Category' }].map(({ value, label }) => (
                <button key={value} onClick={() => setGroupBy(value)} className={`v2-seg-btn ${groupBy === value ? 'active' : ''}`}>{label}</button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[160px] max-w-xs ml-auto">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search documents..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm focus:outline-none"
                style={{ border: '1px solid var(--border)', fontFamily: 'var(--font-body)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '0.833rem' }} />
            </div>
          </div>
        </div>
        <div style={{ height: 12, background: 'linear-gradient(to bottom, var(--bg), transparent)', pointerEvents: 'none' }} />
      </div>

      <div className="px-4 pb-16 md:px-8 space-y-4" style={{ maxWidth: 920, paddingTop: 8 }}>
        {isLoading && <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ink-faint)' }} /></div>}
        {error && <div className="v2-card text-center" style={{ padding: '48px 24px' }}><p className="v2-small" style={{ color: 'var(--overdue)' }}>Error: {error.message}</p></div>}

        {!isLoading && !error && documents.length === 0 && (
          <div className="v2-card text-center" style={{ padding: '48px 24px' }}>
            <p className="v2-body">No documents yet</p>
            <p className="v2-small" style={{ color: 'var(--ink-faint)', marginTop: 4 }}>Add your first document to get started.</p>
            <button onClick={openNewModal} className="v2-btn v2-btn-primary" style={{ marginTop: 16 }}>New Document</button>
          </div>
        )}

        {!isLoading && !error && documents.length > 0 && groupedDocuments.filter(g => g.documents.length > 0).map(group => {
          if (group.hideHeader) {
            return <div key={group.id || group.title} className="v2-card" style={{ padding: 0 }}>{group.documents.map(renderDocCard)}</div>;
          }
          return (
            <div key={group.id || group.title} className="v2-card" style={{ padding: 0 }}>
              <div className="v2-section-header" style={{ padding: '12px 18px 8px' }}>
                <div className="flex items-center gap-2">
                  {group.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: group.color, flexShrink: 0 }} />}
                  <span className="v2-section-title">{group.title}</span>
                  <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>{group.documents.length}</span>
                </div>
              </div>
              {group.documents.map(renderDocCard)}
            </div>
          );
        })}
      </div>

      <DocumentViewModal />
      <DocumentFormModal habits={habits} allTags={allTags} />
    </>
  );
};

export default DocumentsPage;
