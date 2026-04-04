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
    const available = window.innerHeight - rect.top - 24;
    setPreviewHeight(Math.max(available, 200));
  }, []);

  useEffect(() => {
    if (!showPreview) return;
    requestAnimationFrame(measureHeight);
    window.addEventListener('resize', measureHeight);
    return () => window.removeEventListener('resize', measureHeight);
  }, [showPreview, measureHeight]);

  return (
    <div>
      <div
        className="flex items-center gap-3"
        style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--hover-tint)', border: '1px solid var(--border)' }}
      >
        <i className={`fa-solid ${getFileIcon(file.content_type)}`} style={{ color: 'var(--ink-tertiary)', fontSize: '0.9rem' }} />
        <div className="min-w-0 flex-1">
          <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '0.867rem', fontWeight: 500, color: 'var(--ink)' }} className="truncate">
            {file.filename}
          </span>
          <span className="v2-caption">{formatFileSize(file.byte_size)}</span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {previewable && (
            <button onClick={() => setShowPreview(!showPreview)} className="v2-btn-icon-sm" title={showPreview ? 'Hide preview' : 'Show preview'}>
              <i className={`fa-solid ${showPreview ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '0.7rem' }} />
            </button>
          )}
          <a href={file.url} target="_blank" rel="noopener noreferrer" className="v2-btn-icon-sm" title="Download">
            <i className="fa-solid fa-download" style={{ fontSize: '0.7rem' }} />
          </a>
        </div>
      </div>

      {showPreview && (
        <div
          ref={previewRef}
          className="mt-2 mb-1 rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--border)', height: previewHeight ? `${previewHeight}px` : 'auto' }}
        >
          {file.content_type?.startsWith('image/') ? (
            <img src={file.url} alt={file.filename} className="w-full h-full rounded-lg" style={{ objectFit: 'contain', backgroundColor: 'var(--hover-tint)' }} />
          ) : file.content_type === 'application/pdf' ? (
            <iframe src={file.url} title={file.filename} className="w-full h-full rounded-lg" style={{ border: 'none' }} />
          ) : null}
        </div>
      )}
    </div>
  );
};

const DocumentViewModal = () => {
  const { viewModal, closeViewModal, openEditModal } = useDocumentsStore();
  const { documentId, isOpen } = viewModal;

  const { data: document, isLoading, error } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => documentsApi.fetchOne(documentId),
    enabled: isOpen && !!documentId,
  });

  const renderContentByType = (document) => {
    switch (document.content_type) {
      case 'youtube':
        if (document.youtube_embed_url) {
          return (
            <div className="aspect-video w-full">
              <iframe width="100%" height="100%" src={document.youtube_embed_url} frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen className="rounded-lg" />
            </div>
          );
        }
        return <p className="v2-small" style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-faint)' }}>Invalid YouTube URL</p>;

      case 'video':
      case 'link':
        return (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <a href={document.metadata?.url} target="_blank" rel="noopener noreferrer" className="v2-btn v2-btn-primary">
              <i className="fa-solid fa-external-link-alt" style={{ fontSize: '0.75rem' }} /> Open Link
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

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ink-faint)' }} />
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--overdue)' }}>
          <p className="v2-small">Error loading document: {error.message}</p>
        </div>
      );
    }

    if (!document) return null;

    return (
      <>
        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 20 }}>
            {document.tags.map((tag) => (
              <a
                key={tag.id}
                href={`/tags?tag_id=${tag.id}`}
                className="v2-badge v2-badge-neutral"
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px' }}
              >
                <i className="fa-solid fa-tag" style={{ fontSize: '0.55rem' }} />
                {tag.name}
              </a>
            ))}
          </div>
        )}

        {/* Content */}
        {renderContentByType(document)}

        {/* File Attachments */}
        {document.files && document.files.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h3 className="v2-section-label" style={{ marginBottom: 10 }}>
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

  const handleEdit = () => { closeViewModal(); openEditModal(documentId); };

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={closeViewModal}
      title={document?.title || 'Loading...'}
      headerActions={document ? (
        <button onClick={handleEdit} className="v2-btn-icon" title="Edit document">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-tertiary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
        </button>
      ) : null}
    >
      {renderContent()}
    </SlideOverPanel>
  );
};

export default DocumentViewModal;
