import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, tagsApi } from '../../utils/api';
import useDocumentsStore from '../../stores/documentsStore';
import DocumentViewModal from './DocumentViewModal';
import DocumentFormModal from './DocumentFormModal';

const DocumentsPage = ({ habits }) => {
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
        return { icon: 'fa-file-alt', color: '#6B8A99' };
      case 'youtube':
        return { icon: 'fa-brands fa-youtube', color: '#FB7185' };
      case 'video':
        return { icon: 'fa-video', color: '#A78BFA' };
      case 'link':
        return { icon: 'fa-link', color: '#22D3EE' };
      default:
        return { icon: 'fa-file', color: '#9CA3A8' };
    }
  };

  return (
    <>
      {/* Header Section */}
      <div style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
        <div className="p-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #E5E5E7 0%, #C7C7CC 50%, #8E8E93 100%)', border: '0.5px solid rgba(199, 199, 204, 0.3)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.3)' }}
                >
                  <i className="fa-solid fa-file-alt text-2xl" style={{ color: '#1D1D1F', filter: 'drop-shadow(0 0.5px 0 rgba(255, 255, 255, 0.5))' }}></i>
                </div>
                <div>
                  <h1 className="text-3xl" style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif", fontWeight: 800 }}>
                    Documents
                  </h1>
                  <p className="text-sm" style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
                    Manage all your habit resources
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <button
                onClick={openNewModal}
                className="px-4 py-2 rounded-lg text-white transition transform hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)', fontWeight: 600, fontFamily: "'Inter', sans-serif", boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
              >
                <i className="fa-solid fa-plus mr-2"></i>Add Document
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-8 pt-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#2C2C2E' }}></div>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-12 text-center" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
            <i className="fa-solid fa-exclamation-circle text-6xl mb-4" style={{ color: '#DC2626' }}></i>
            <p style={{ color: '#DC2626', fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Error loading documents: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && documents.length === 0 && (
          <div className="rounded-xl p-12 text-center" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
            <i className="fa-solid fa-file-circle-plus text-6xl mb-4" style={{ color: '#E5E5E7' }}></i>
            <p style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>No documents yet. Click "Add Document" to get started!</p>
          </div>
        )}

        {!isLoading && !error && documents.length > 0 && (
          <div className="space-y-3">
            {documents.map((content) => {
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
                            // Replace block elements with spaces, strip HTML tags, replace newlines with spaces
                            <span>{content.body?.replace(/<\/(div|p|h[1-6]|li|br)>/gi, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().substring(0, 100) || 'No content'}</span>
                          ) : (
                            // Show URL for non-document types
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
                              // Get category color from the habits prop
                              const habitWithCategory = habits.find(h => h.id === habit.id);
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
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <DocumentViewModal />
      <DocumentFormModal habits={habits} allTags={allTags} />
    </>
  );
};

export default DocumentsPage;
