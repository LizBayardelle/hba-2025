import React from 'react';
import { useQuery } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import { journalsApi } from '../../utils/api';
import useJournalStore from '../../stores/journalStore';

const JournalViewModal = () => {
  const { viewModal, closeViewModal, openEditModal } = useJournalStore();
  const { journalId, isOpen } = viewModal;

  // Fetch journal data
  const { data: journal, isLoading, error } = useQuery({
    queryKey: ['journal', journalId],
    queryFn: () => journalsApi.fetchOne(journalId),
    enabled: isOpen && !!journalId,
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2"
            style={{ borderColor: '#1D1D1F' }}
          ></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8" style={{ color: '#DC2626' }}>
          <i className="fa-solid fa-exclamation-circle text-4xl mb-4"></i>
          <p>Error loading journal: {error.message}</p>
        </div>
      );
    }

    if (!journal) return null;

    return (
      <>
        {/* Date */}
        <div className="mb-4 text-sm" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#8E8E93' }}>
          {formatDate(journal.created_at)}
        </div>

        {/* Tags */}
        {journal.tags && journal.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {journal.tags.map((tag) => (
              <a
                key={tag.id}
                href={`/tags?tag_id=${tag.id}`}
                className="text-xs px-3 py-1.5 rounded-full hover:opacity-70 transition cursor-pointer flex items-center gap-1"
                style={{
                  background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)',
                  color: '#FFFFFF',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                }}
              >
                <i className="fa-solid fa-tags text-[10px]"></i>
                {tag.name}
              </a>
            ))}
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-sm max-w-none trix-content"
          style={{ fontSize: '0.9375rem', lineHeight: '1.6' }}
          dangerouslySetInnerHTML={{ __html: journal.content || '' }}
        />
      </>
    );
  };

  const footer = (
    <>
      <button
        onClick={() => {
          closeViewModal();
          openEditModal(journalId);
        }}
        className="px-6 py-3 rounded-lg transition hover:bg-gray-100"
        style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F', border: '0.5px solid rgba(199, 199, 204, 0.3)', backgroundColor: 'white' }}
      >
        Edit
      </button>
      <button
        onClick={closeViewModal}
        className="px-6 py-3 rounded-lg transition hover:opacity-90"
        style={{
          background: 'linear-gradient(135deg, #A8A8AC 0%, #E5E5E7 45%, #FFFFFF 55%, #C7C7CC 70%, #8E8E93 100%)',
          border: '0.5px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
          color: '#1D1D1F',
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Close
      </button>
    </>
  );

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={closeViewModal}
      title="Journal Entry"
      footer={footer}
    >
      {renderContent()}
    </SlideOverPanel>
  );
};

export default JournalViewModal;
