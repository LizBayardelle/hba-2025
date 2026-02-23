import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import { documentsApi } from '../../utils/api';
import useDocumentsStore from '../../stores/documentsStore';

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (contentType) => {
  if (contentType?.startsWith('image/')) return 'fa-image';
  if (contentType === 'application/pdf') return 'fa-file-pdf';
  if (contentType?.includes('spreadsheet') || contentType?.includes('excel') || contentType?.includes('csv')) return 'fa-file-excel';
  if (contentType?.includes('presentation') || contentType?.includes('powerpoint')) return 'fa-file-powerpoint';
  if (contentType?.includes('word') || contentType?.includes('document')) return 'fa-file-word';
  return 'fa-file';
};

const isPreviewable = (contentType) =>
  contentType?.startsWith('image/') || contentType === 'application/pdf';

const AttachmentRow = ({ file }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewHeight, setPreviewHeight] = useState(0);
  const previewRef = useRef(null);
  const previewable = isPreviewable(file.content_type);

  const measureHeight = useCallback(() => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const bottomPadding = 24;
    const available = window.innerHeight - rect.top - bottomPadding;
    setPreviewHeight(Math.max(available, 200));
  }, []);

  useEffect(() => {
    if (!showPreview) return;
    // Measure after render
    requestAnimationFrame(measureHeight);
    window.addEventListener('resize', measureHeight);
    return () => window.removeEventListener('resize', measureHeight);
  }, [showPreview, measureHeight]);

  return (
    <div>
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
        style={{ backgroundColor: 'rgba(142, 142, 147, 0.08)', border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
      >
        <i className={`fa-solid ${getFileIcon(file.content_type)} text-base`} style={{ color: '#8E8E93' }}></i>
        <div className="min-w-0 flex-1">
          <span className="text-sm block truncate" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, color: '#1D1D1F' }}>
            {file.filename}
          </span>
          <span className="text-xs" style={{ color: '#8E8E93' }}>
            {formatFileSize(file.byte_size)}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {previewable && (
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition"
              title={showPreview ? 'Hide preview' : 'Show preview'}
            >
              <i className={`fa-solid ${showPreview ? 'fa-eye-slash' : 'fa-eye'} text-sm`} style={{ color: '#8E8E93' }}></i>
            </button>
          )}
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition"
            title="Download"
          >
            <i className="fa-solid fa-download text-sm" style={{ color: '#8E8E93' }}></i>
          </a>
        </div>
      </div>

      {/* Inline preview - fills remaining viewport */}
      {showPreview && (
        <div
          ref={previewRef}
          className="mt-2 mb-1 rounded-lg overflow-hidden"
          style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', height: previewHeight ? `${previewHeight}px` : 'auto' }}
        >
          {file.content_type?.startsWith('image/') ? (
            <img
              src={file.url}
              alt={file.filename}
              className="w-full h-full rounded-lg"
              style={{ objectFit: 'contain', backgroundColor: 'rgba(142, 142, 147, 0.04)' }}
            />
          ) : file.content_type === 'application/pdf' ? (
            <iframe
              src={file.url}
              title={file.filename}
              className="w-full h-full rounded-lg"
              style={{ border: 'none' }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
};

const DocumentViewModal = () => {
  const { viewModal, closeViewModal, openEditModal } = useDocumentsStore();
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#1D1D1F' }}></div>
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
                className="text-xs px-3 py-1.5 rounded-[10px] hover:opacity-70 transition cursor-pointer liquid-surface-subtle flex items-center gap-1"
                style={{
                  '--surface-color': '#2C2C2E',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                }}
              >
                <i className="fa-solid fa-tag text-[10px]"></i>
                {tag.name}
              </a>
            ))}
          </div>
        )}

        {/* Content */}
        {renderContentByType(document)}

        {/* File Attachments */}
        {document.files && document.files.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold mb-3" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
              <i className="fa-solid fa-paperclip mr-2" style={{ color: '#8E8E93' }}></i>
              Attachments ({document.files.length})
            </h3>
            <div className="space-y-2">
              {document.files.map((file) => (
                <AttachmentRow key={file.id} file={file} />
              ))}
            </div>
          </div>
        )}
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
              className="btn-liquid inline-flex items-center gap-2"
            >
              <i className="fa-solid fa-external-link-alt"></i>
              Open Link
            </a>
          </div>
        );

      case 'document':
        const categoryColor = document.categories?.[0]?.color;
        return (
          <div
            className="prose prose-sm max-w-none trix-content"
            style={{ fontSize: '0.9375rem', lineHeight: '1.6', ...(categoryColor && { '--heading-color': categoryColor }) }}
            dangerouslySetInnerHTML={{ __html: document.body || '' }}
          />
        );

      default:
        return null;
    }
  };

  const handleEdit = () => {
    closeViewModal();
    openEditModal(documentId);
  };

  const headerActions = document ? (
    <button
      type="button"
      onClick={handleEdit}
      className="w-8 h-8 rounded-lg transition hover:bg-gray-100 flex items-center justify-center"
      title="Edit document"
    >
      <i className="fa-solid fa-pencil text-sm" style={{ color: '#8E8E93' }}></i>
    </button>
  ) : null;

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={closeViewModal}
      title={document?.title || 'Loading...'}
      headerActions={headerActions}
    >
      {renderContent()}
    </SlideOverPanel>
  );
};

export default DocumentViewModal;
