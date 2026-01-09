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
      <div className="bg-white shadow-md">
        <div className="p-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center shadow-md"
                  style={{ background: 'linear-gradient(135deg, #1d3e4c, #45606b)' }}
                >
                  <i className="fa-solid fa-file-alt text-white text-2xl"></i>
                </div>
                <div>
                  <h1 className="text-3xl font-bold display-font" style={{ color: '#1d3e4c' }}>
                    Documents
                  </h1>
                  <p className="text-sm font-light" style={{ color: '#657b84' }}>
                    Manage all your habit resources
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <button
                onClick={openNewModal}
                className="px-4 py-2 rounded-lg text-white font-semibold shadow-md hover:shadow-lg transition transform hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #1d3e4c, #45606b)' }}
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#1d3e4c' }}></div>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <i className="fa-solid fa-exclamation-circle text-6xl mb-4" style={{ color: '#DC2626' }}></i>
            <p style={{ color: '#DC2626' }}>Error loading documents: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && documents.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <i className="fa-solid fa-file-circle-plus text-6xl mb-4" style={{ color: '#6B8A9940' }}></i>
            <p className="text-gray-500 font-light">No documents yet. Click "Add Document" to get started!</p>
          </div>
        )}

        {!isLoading && !error && documents.length > 0 && (
          <div className="space-y-4">
            {documents.map((content) => {
              const iconData = getIconData(content.content_type);
              return (
                <div key={content.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Content Info */}
                      <div className="flex-1 min-w-0">
                        <h3
                          onClick={() => openViewModal(content.id)}
                          className="text-lg font-bold display-font cursor-pointer hover:opacity-70 transition"
                          style={{ color: '#1d3e4c' }}
                        >
                          {content.title}
                        </h3>

                        {/* Preview/Snippet */}
                        <div className="text-sm font-light truncate mt-1" style={{ color: '#657b84' }}>
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
                              <span
                                key={tag.id}
                                className="text-xs px-2 py-1 rounded-full font-semibold"
                                style={{
                                  backgroundColor: '#E8EEF1',
                                  color: '#1d3e4c',
                                }}
                              >
                                {tag.name}
                              </span>
                            ))}

                            {/* Habits */}
                            {content.habits?.map((habit) => {
                              // Get category color from the habits prop
                              const habitWithCategory = habits.find(h => h.id === habit.id);
                              const categoryColor = habitWithCategory?.category_color || '#6B8A99';
                              return (
                                <span
                                  key={habit.id}
                                  className="text-xs px-2 py-1 rounded-full font-semibold"
                                  style={{
                                    backgroundColor: `${categoryColor}20`,
                                    color: categoryColor,
                                  }}
                                >
                                  {habit.name}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(content.id)}
                          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition"
                          title="Edit"
                        >
                          <i className="fa-solid fa-edit" style={{ color: '#657b84' }}></i>
                        </button>
                        <button
                          onClick={() => handleDelete(content.id)}
                          className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition"
                          title="Delete"
                          disabled={deleteMutation.isPending}
                        >
                          <i className="fa-solid fa-trash" style={{ color: '#DC2626' }}></i>
                        </button>
                      </div>
                    </div>
                  </div>
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
