import React from 'react';
import { useQuery } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
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
            style={{ borderColor: '#1d3e4c' }}
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
        <div className="mb-4 text-sm font-light" style={{ color: '#657b84' }}>
          {formatDate(journal.created_at)}
        </div>

        {/* Tags */}
        {journal.tags && journal.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {journal.tags.map((tag) => (
              <span
                key={tag.id}
                className="text-xs px-3 py-1.5 rounded-full font-semibold"
                style={{
                  backgroundColor: '#E8EEF1',
                  color: '#1d3e4c',
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <div
          className="prose max-w-none trix-content"
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
        className="px-6 py-2 rounded-lg font-semibold border-2 transition"
        style={{ color: '#1d3e4c', borderColor: '#E8EEF1' }}
      >
        Edit
      </button>
      <button
        onClick={closeViewModal}
        className="px-6 py-2 rounded-lg text-white font-semibold shadow-lg hover:shadow-xl transition"
        style={{ background: 'linear-gradient(135deg, #1d3e4c, #45606b)' }}
      >
        Close
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={closeViewModal}
      title="Journal Entry"
      footer={footer}
      maxWidth="max-w-4xl"
    >
      {renderContent()}
    </BaseModal>
  );
};

export default JournalViewModal;
