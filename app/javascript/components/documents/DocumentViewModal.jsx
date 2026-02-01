import React from 'react';
import { useQuery } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import { documentsApi } from '../../utils/api';
import useDocumentsStore from '../../stores/documentsStore';

const DocumentViewModal = () => {
  const { viewModal, closeViewModal } = useDocumentsStore();
  const { documentId, isOpen } = viewModal;

  // Fetch document data
  const { data: document, isLoading, error } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => documentsApi.fetchOne(documentId),
    enabled: isOpen && !!documentId,
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#1d3e4c' }}></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8" style={{ color: '#DC2626' }}>
          <i className="fa-solid fa-exclamation-circle text-4xl mb-4"></i>
          <p>Error loading document: {error.message}</p>
        </div>
      );
    }

    if (!document) return null;

    return (
      <>
        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {document.tags.map((tag) => (
              <a
                key={tag.id}
                href={`/tags?tag_id=${tag.id}`}
                className="text-xs px-3 py-1.5 rounded-full hover:opacity-70 transition cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)',
                  color: '#FFFFFF',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                }}
              >
                {tag.name}
              </a>
            ))}
          </div>
        )}

        {/* Content */}
        {renderContentByType(document)}
      </>
    );
  };

  const renderContentByType = (document) => {
    // Render based on content type
    switch (document.content_type) {
      case 'youtube':
        if (document.youtube_embed_url) {
          return (
            <div className="aspect-video w-full">
              <iframe
                width="100%"
                height="100%"
                src={document.youtube_embed_url}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-lg"
              ></iframe>
            </div>
          );
        }
        return <p className="text-center py-8" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#8E8E93' }}>Invalid YouTube URL</p>;

      case 'video':
      case 'link':
        return (
          <div className="text-center py-8">
            <a
              href={document.metadata?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition"
              style={{ background: 'linear-gradient(135deg, #A8A8AC 0%, #E5E5E7 45%, #FFFFFF 55%, #C7C7CC 70%, #8E8E93 100%)', border: '0.5px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3)', color: '#1D1D1F', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
            >
              <i className="fa-solid fa-external-link-alt"></i>
              Open Link
            </a>
          </div>
        );

      case 'document':
        return (
          <div
            className="prose prose-sm max-w-none trix-content"
            style={{ fontSize: '0.9375rem', lineHeight: '1.6' }}
            dangerouslySetInnerHTML={{ __html: document.body || '' }}
          />
        );

      default:
        return null;
    }
  };

  const footer = (
    <button
      onClick={closeViewModal}
      className="px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition hover:opacity-90"
      style={{ background: 'linear-gradient(135deg, #A8A8AC 0%, #E5E5E7 45%, #FFFFFF 55%, #C7C7CC 70%, #8E8E93 100%)', border: '0.5px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3)', color: '#1D1D1F', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
    >
      Close
    </button>
  );

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={closeViewModal}
      title={document?.title || 'Loading...'}
      footer={footer}
    >
      {renderContent()}
    </SlideOverPanel>
  );
};

export default DocumentViewModal;
