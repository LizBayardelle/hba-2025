import React from 'react';
import { useQuery } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import { journalsApi } from '../../utils/api';
import useJournalStore from '../../stores/journalStore';

const JournalViewModal = () => {
  const { viewModal, closeViewModal, openEditModal } = useJournalStore();
  const { journalId, isOpen } = viewModal;

  const { data: journal, isLoading, error } = useQuery({
    queryKey: ['journal', journalId],
    queryFn: () => journalsApi.fetchOne(journalId),
    enabled: isOpen && !!journalId,
  });

  const formatDate = (ds) => new Date(ds).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

  const renderContent = () => {
    if (isLoading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ink-faint)' }} /></div>;
    if (error) return <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--overdue)' }}><p className="v2-small">Error: {error.message}</p></div>;
    if (!journal) return null;

    return (
      <>
        <p className="v2-caption" style={{ color: 'var(--ink-faint)', marginBottom: 16 }}>{formatDate(journal.created_at)}</p>

        {journal.tags && journal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 20 }}>
            {journal.tags.map(tag => (
              <a key={tag.id} href={`/tags?tag_id=${tag.id}`} className="v2-badge v2-badge-neutral"
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px' }}>
                <i className="fa-solid fa-tag" style={{ fontSize: '0.55rem' }} />{tag.name}
              </a>
            ))}
          </div>
        )}

        <div className="prose prose-sm max-w-none trix-content" style={{ fontSize: '0.9375rem', lineHeight: '1.6' }}
          dangerouslySetInnerHTML={{ __html: journal.content || '' }} />
      </>
    );
  };

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={closeViewModal}
      title="Journal Entry"
      footer={
        <>
          <button onClick={() => { closeViewModal(); openEditModal(journalId); }} className="v2-btn v2-btn-secondary">Edit</button>
          <button onClick={closeViewModal} className="v2-btn v2-btn-primary">Close</button>
        </>
      }
    >
      {renderContent()}
    </SlideOverPanel>
  );
};

export default JournalViewModal;
