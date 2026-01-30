import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, tagsApi, categoriesApi } from '../../utils/api';
import useDocumentsStore from '../../stores/documentsStore';
import DocumentViewModal from './DocumentViewModal';
import DocumentFormModal from './DocumentFormModal';

const DocumentsPage = ({ habits }) => {
  const [groupBy, setGroupBy] = useState('type');
  const queryClient = useQueryClient();
  const { openViewModal, openNewModal, openEditModal } = useDocumentsStore();

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
  const categories = categoriesData?.categories || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: documentsApi.delete,
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
    { type: 'document', icon: 'fa-file-alt', color: '#6B8A99', label: 'Documents' },
    { type: 'youtube', icon: 'fa-brands fa-youtube', color: '#FB7185', label: 'YouTube' },
    { type: 'video', icon: 'fa-video', color: '#A78BFA', label: 'Videos' },
    { type: 'link', icon: 'fa-link', color: '#22D3EE', label: 'Links' },
  ];

  // Group documents based on groupBy setting
  const groupedDocuments = useMemo(() => {
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

      documents.forEach(doc => {
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

      return Object.values(groups);
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

      documents.forEach(doc => {
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

      const result = Object.values(groups);
      if (untagged.documents.length > 0) {
        result.push(untagged);
      }
      return result;
    } else if (groupBy === 'category') {
      // Group by category (via linked habits)
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

      documents.forEach(doc => {
        if (doc.habits && doc.habits.length > 0) {
          // Get category from linked habits
          doc.habits.forEach(habit => {
            const habitWithCategory = habits?.find(h => h.id === habit.id);
            const categoryId = habitWithCategory?.category_id;
            if (categoryId && groups[categoryId]) {
              if (!groups[categoryId].documents.find(d => d.id === doc.id)) {
                groups[categoryId].documents.push(doc);
              }
            } else {
              if (!uncategorized.documents.find(d => d.id === doc.id)) {
                uncategorized.documents.push(doc);
              }
            }
          });
        } else {
          if (!uncategorized.documents.find(d => d.id === doc.id)) {
            uncategorized.documents.push(doc);
          }
        }
      });

      const result = Object.values(groups);
      result.push(uncategorized);
      return result;
    }

    return [{ title: 'All Documents', documents, color: '#9CA3A8', icon: 'fa-file-alt' }];
  }, [documents, groupBy, allTags, habits, categories]);

  // Render a document card
  const renderDocumentCard = (content) => {
    const iconData = getIconData(content.content_type);
    return (
      <div key={content.id} className="flex items-start gap-3 min-w-0">
        <div
          onClick={() => openViewModal(content.id)}
          className="rounded-lg p-4 transition cursor-pointer flex-1 min-w-0 overflow-hidden"
          style={{ background: '#FFFFFF', border: '0.5px solid rgba(199, 199, 204, 0.3)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}
        >
          <div className="flex items-start gap-4 min-w-0">
            {/* Content Info */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <h3
                className="text-lg truncate"
                style={{ color: '#1D1D1F', fontWeight: 700, fontFamily: "'Inter', sans-serif" }}
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
      <div key={group.id || group.title} className={`mb-6 ${index !== 0 ? 'mt-8' : ''}`}>
        {/* Full-width colored stripe header */}
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

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={openNewModal}
                className="px-6 py-3 rounded-lg text-white transition transform hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)', fontWeight: 600, fontFamily: "'Inter', sans-serif", boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
              >
                <i className="fa-solid fa-plus mr-2"></i>
                New Document
              </button>
            </div>
          </div>

          {/* Group By Filter */}
          <div>
            <span className="block text-xs uppercase tracking-wide mb-2" style={{ color: '#8E8E93', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
              Group By
            </span>
            <div className="inline-flex rounded-lg overflow-hidden" style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}>
              {[
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
          groupedDocuments.map((group, index) => renderGroup(group, index))
        )}
      </div>

      {/* Modals */}
      <DocumentViewModal />
      <DocumentFormModal habits={habits} allTags={allTags} />
    </>
  );
};

export default DocumentsPage;
