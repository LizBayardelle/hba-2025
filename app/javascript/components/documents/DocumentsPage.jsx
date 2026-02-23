import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, tagsApi, categoriesApi } from '../../utils/api';
import useDocumentsStore from '../../stores/documentsStore';
import DocumentViewModal from './DocumentViewModal';
import DocumentFormModal from './DocumentFormModal';

// Get initial grouping from URL or user default
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

  // Update URL when groupBy changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (groupBy && groupBy !== 'type') {
      params.set('groupBy', groupBy);
    } else {
      params.delete('groupBy');
    }
    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [groupBy]);

  // Fetch documents
  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.fetchAll,
  });

  // Fetch all user tags for autocomplete
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.fetchAll,
  });

  // Fetch categories for grouping
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.fetchAll,
  });
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  // Toggle pin mutation
  const togglePinMutation = useMutation({
    mutationFn: documentsApi.togglePin,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(id);
    }
  };

  const getIconData = (contentType) => {
    switch (contentType) {
      case 'document':
        return { icon: 'fa-file-alt', color: '#6B8A99', label: 'Documents' };
      case 'youtube':
        return { icon: 'fa-brands fa-youtube', color: '#FB7185', label: 'YouTube' };
      case 'video':
        return { icon: 'fa-video', color: '#A78BFA', label: 'Videos' };
      case 'link':
        return { icon: 'fa-link', color: '#22D3EE', label: 'Links' };
      default:
        return { icon: 'fa-file', color: '#9CA3A8', label: 'Other' };
    }
  };

  // Content type definitions for grouping
  const contentTypes = [
    { type: 'document', icon: 'fa-file-alt', color: '#2C2C2E', label: 'Documents' },
    { type: 'youtube', icon: 'fa-brands fa-youtube', color: '#2C2C2E', label: 'YouTube' },
    { type: 'video', icon: 'fa-video', color: '#2C2C2E', label: 'Videos' },
    { type: 'link', icon: 'fa-link', color: '#2C2C2E', label: 'Links' },
  ];

  // Filter documents based on search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;

    const query = searchQuery.toLowerCase();
    return documents.filter(doc => {
      // Search in title
      if (doc.title?.toLowerCase().includes(query)) return true;
      // Search in tags
      if (doc.tags?.some(tag => tag.name.toLowerCase().includes(query))) return true;
      // Search in body/content (strip HTML for searching)
      if (doc.body) {
        const textContent = doc.body.replace(/<[^>]*>/g, '').toLowerCase();
        if (textContent.includes(query)) return true;
      }
      return false;
    });
  }, [documents, searchQuery]);

  // Helper to sort documents with pinned first
  const sortPinnedFirst = (docs) => {
    return [...docs].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0; // Preserve existing order for same pin status
    });
  };

  // Group documents based on groupBy setting
  const groupedDocuments = useMemo(() => {
    if (groupBy === 'none') {
      return [{ id: 'all', title: 'All Documents', documents: sortPinnedFirst(filteredDocuments), color: '#2C2C2E', icon: 'fa-file-alt', hideHeader: true }];
    }

    if (groupBy === 'type') {
      // Start with all content types
      const groups = {};

      contentTypes.forEach(ct => {
        groups[ct.type] = {
          id: ct.type,
          title: ct.label,
          color: ct.color,
          icon: ct.icon,
          documents: [],
        };
      });

      filteredDocuments.forEach(doc => {
        const type = doc.content_type || 'document';
        if (groups[type]) {
          groups[type].documents.push(doc);
        } else {
          // Fallback to "Other" if type not found
          if (!groups['other']) {
            groups['other'] = { id: 'other', title: 'Other', color: '#9CA3A8', icon: 'fa-file', documents: [] };
          }
          groups['other'].documents.push(doc);
        }
      });

      // Sort pinned first within each group
      return Object.values(groups).map(group => ({
        ...group,
        documents: sortPinnedFirst(group.documents),
      }));
    } else if (groupBy === 'tag') {
      // Group by tags
      const groups = {};

      allTags.forEach(tag => {
        groups[tag.id] = {
          id: tag.id,
          title: tag.name,
          color: '#2C2C2E',
          icon: 'fa-tag',
          documents: [],
        };
      });

      // Add "Untagged" group
      const untagged = { id: 'untagged', title: 'Untagged', color: '#9CA3A8', icon: 'fa-tag', documents: [] };

      filteredDocuments.forEach(doc => {
        if (doc.tags && doc.tags.length > 0) {
          doc.tags.forEach(tag => {
            if (groups[tag.id]) {
              // Avoid duplicates
              if (!groups[tag.id].documents.find(d => d.id === doc.id)) {
                groups[tag.id].documents.push(doc);
              }
            }
          });
        } else {
          untagged.documents.push(doc);
        }
      });

      const result = Object.values(groups).map(group => ({
        ...group,
        documents: sortPinnedFirst(group.documents),
      }));
      if (untagged.documents.length > 0) {
        result.push({ ...untagged, documents: sortPinnedFirst(untagged.documents) });
      }
      return result;
    } else if (groupBy === 'category') {
      // Group by category (direct association)
      const groups = {};

      categories.forEach(cat => {
        groups[cat.id] = {
          id: cat.id,
          title: cat.name,
          color: cat.color || '#9CA3A8',
          icon: cat.icon || 'fa-folder',
          documents: [],
        };
      });

      // Add "Uncategorized" group
      const uncategorized = { id: 'uncategorized', title: 'Uncategorized', color: '#9CA3A8', icon: 'fa-folder', documents: [] };

      filteredDocuments.forEach(doc => {
        if (doc.categories && doc.categories.length > 0) {
          // Document has direct category associations
          doc.categories.forEach(category => {
            if (groups[category.id]) {
              if (!groups[category.id].documents.find(d => d.id === doc.id)) {
                groups[category.id].documents.push(doc);
              }
            }
          });
        } else {
          // No categories - goes to uncategorized
          if (!uncategorized.documents.find(d => d.id === doc.id)) {
            uncategorized.documents.push(doc);
          }
        }
      });

      const result = Object.values(groups).map(group => ({
        ...group,
        documents: sortPinnedFirst(group.documents),
      }));
      result.push({ ...uncategorized, documents: sortPinnedFirst(uncategorized.documents) });
      return result;
    }

    return [{ title: 'All Documents', documents: sortPinnedFirst(filteredDocuments), color: '#9CA3A8', icon: 'fa-file-alt' }];
  }, [filteredDocuments, groupBy, allTags, habits, categories]);

  // Render a document card
  const renderDocumentCard = (content) => {
    const iconData = getIconData(content.content_type);
    const categoryColor = content.categories?.[0]?.color;
    return (
      <div key={content.id} className="flex items-start gap-3 min-w-0">
        <div
          onClick={() => openViewModal(content.id)}
          className="rounded-lg p-4 transition cursor-pointer flex-1 min-w-0 overflow-hidden relative"
          style={{
            background: '#FFFFFF',
            border: content.pinned ? '1px solid rgba(45, 45, 47, 0.3)' : '0.5px solid rgba(199, 199, 204, 0.3)',
            boxShadow: content.pinned
              ? '0 1px 3px rgba(45, 45, 47, 0.15), 0 0 0 0.5px rgba(45, 45, 47, 0.2)'
              : '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)'
          }}
        >
          {/* Top-right icons */}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            {content.files && content.files.length > 0 && (
              <span
                className="w-7 h-7 flex items-center justify-center"
                title={`${content.files.length} attachment${content.files.length === 1 ? '' : 's'}`}
              >
                <i className="fa-solid fa-paperclip text-sm" style={{ color: '#8E8E93' }}></i>
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePinMutation.mutate(content.id);
              }}
              className="w-7 h-7 flex items-center justify-center transition hover:scale-110 rounded-full hover:bg-gray-100"
              title={content.pinned ? 'Unpin document' : 'Pin document'}
            >
              <i
                className={`fa-solid fa-thumbtack text-sm transition ${content.pinned ? '' : 'opacity-30 hover:opacity-60'}`}
                style={{ color: content.pinned ? '#2D2D2F' : '#8E8E93' }}
              ></i>
            </button>
          </div>

          <div className="flex items-start gap-4 min-w-0 pr-8">
            {/* Content Info */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <h3
                className="text-lg truncate font-display"
                style={{ color: categoryColor || '#1D1D1F', fontWeight: 500 }}
              >
                {content.title}
              </h3>

              {/* Preview/Snippet */}
              <div className="text-sm truncate mt-1" style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
                {content.content_type === 'document' ? (
                  <span>{content.body?.replace(/<\/(div|p|h[1-6]|li|br)>/gi, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().substring(0, 100) || 'No content'}</span>
                ) : (
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-link text-xs"></i>
                    {content.metadata?.url || 'No URL'}
                  </span>
                )}
              </div>

              {/* Tags and Habit Badges */}
              {(content.tags?.length > 0 || content.habits?.length > 0) && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {/* Tags */}
                  {content.tags?.map((tag) => (
                    <a
                      key={tag.id}
                      href={`/tags?tag_id=${tag.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs px-2 py-1 rounded-lg hover:opacity-70 transition cursor-pointer flex items-center gap-1"
                      style={{
                        background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)',
                        color: 'white',
                        fontWeight: 600,
                        fontFamily: "'Inter', sans-serif"
                      }}
                    >
                      <i className="fa-solid fa-tag text-[10px]"></i>
                      {tag.name}
                    </a>
                  ))}

                  {/* Habits */}
                  {content.habits?.map((habit) => {
                    const habitWithCategory = habits?.find(h => h.id === habit.id);
                    const categoryColor = habitWithCategory?.category_color || '#8E8E93';
                    return (
                      <span
                        key={habit.id}
                        className="text-xs px-2 py-1 rounded-lg flex items-center gap-1"
                        style={{
                          backgroundColor: categoryColor,
                          color: 'white',
                          fontWeight: 600,
                          fontFamily: "'Inter', sans-serif"
                        }}
                      >
                        <i className="fa-solid fa-chart-line text-[10px]"></i>
                        {habit.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit button outside card */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            openEditModal(content.id);
          }}
          className="w-5 h-5 flex items-center justify-center transition hover:opacity-70 mt-0.5"
          title="Edit"
        >
          <i className="fa-solid fa-pen text-sm" style={{ color: '#8E8E93' }}></i>
        </button>
      </div>
    );
  };

  // Render a group with colored stripe header
  const renderGroup = (group, index) => {
    const groupColor = group.color || '#8E8E93';
    const groupIcon = group.icon || 'fa-file';

    return (
      <div key={group.id || group.title} className={`mb-6 ${index !== 0 && !group.hideHeader ? 'mt-8' : ''} ${group.hideHeader ? 'mt-4' : ''}`}>
        {/* Full-width colored stripe header */}
        {!group.hideHeader && (
          <div
            className="-mx-8 px-8 py-4 mb-4 flex items-center gap-3"
            style={{
              background: `linear-gradient(to bottom, color-mix(in srgb, ${groupColor} 85%, white) 0%, ${groupColor} 100%)`,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
          >
            <i className={`${groupIcon.includes('fa-brands') ? groupIcon : `fa-solid ${groupIcon}`} text-white text-lg`}></i>
            <h3 className="text-3xl flex-1 text-white font-display" style={{ fontWeight: 500 }}>
              {group.title} ({group.documents.length})
            </h3>
          </div>
        )}
        {group.documents.length > 0 ? (
          <div className="space-y-3">
            {group.documents.map(doc => renderDocumentCard(doc))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm italic" style={{ color: '#8E8E93', fontFamily: "'Inter', sans-serif" }}>
              No documents in this group
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Header Section */}
      <div style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-5xl font-display mb-2" style={{ color: '#1D1D1F' }}>
                Documents
              </h1>
            </div>

            <button
              onClick={openNewModal}
              className="w-12 h-12 rounded-xl text-white transition transform hover:scale-105 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
              title="New Document"
            >
              <i className="fa-solid fa-plus text-lg"></i>
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
            {/* Group By Filter */}
            <div>
              <span className="block text-xs uppercase tracking-wide mb-2" style={{ color: '#8E8E93', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                Group By
              </span>
              <div className="inline-flex rounded-lg overflow-hidden" style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}>
                {[
                  { value: 'none', label: 'None' },
                  { value: 'type', label: 'Type' },
                  { value: 'tag', label: 'Tag' },
                  { value: 'category', label: 'Category' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setGroupBy(value)}
                    className="px-4 py-2 text-sm transition"
                    style={{
                      background: groupBy === value ? 'linear-gradient(to bottom, #A8A8AD 0%, #8E8E93 100%)' : '#F5F5F7',
                      color: groupBy === value ? '#FFFFFF' : '#1D1D1F',
                      fontWeight: 500,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="flex-1">
              <span className="block text-xs uppercase tracking-wide mb-2" style={{ color: '#8E8E93', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                Search
              </span>
              <div className="relative">
                <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#8E8E93' }}></i>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, tags, or content..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none"
                  style={{
                    border: '1px solid rgba(199, 199, 204, 0.4)',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 400,
                    background: '#F9F9FB',
                    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.08)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-8 pb-8">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#2C2C2E' }}></div>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-12 text-center mt-6" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
            <i className="fa-solid fa-exclamation-circle text-6xl mb-4" style={{ color: '#DC2626' }}></i>
            <p style={{ color: '#DC2626', fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Error loading documents: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && documents.length === 0 && (
          <div className="rounded-xl p-12 text-center mt-6" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
            <i className="fa-solid fa-file-circle-plus text-6xl mb-4" style={{ color: '#E5E5E7' }}></i>
            <h3 className="text-xl mb-2" style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
              No Documents Yet
            </h3>
            <p className="mb-4" style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
              Add your first document to get started!
            </p>
            <button
              onClick={openNewModal}
              className="inline-block px-6 py-3 rounded-lg text-white transition transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)', fontWeight: 600, fontFamily: "'Inter', sans-serif", boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
            >
              <i className="fa-solid fa-plus mr-2"></i>
              Add First Document
            </button>
          </div>
        )}

        {!isLoading && !error && documents.length > 0 && (
          groupedDocuments.filter(g => g.documents.length > 0).map((group, index) => renderGroup(group, index))
        )}
      </div>

      {/* Modals */}
      <DocumentViewModal />
      <DocumentFormModal habits={habits} allTags={allTags} />
    </>
  );
};

export default DocumentsPage;
