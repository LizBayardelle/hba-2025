import React from 'react';
import useJournalStore from '../../stores/journalStore';

const JournalCard = ({ journal }) => {
  const { openViewModal, openEditModal } = useJournalStore();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getWordCount = (htmlContent) => {
    if (!htmlContent) return 0;
    // Strip HTML tags and count words
    const text = htmlContent.replace(/<[^>]*>/g, ' ').trim();
    const words = text.split(/\s+/).filter(word => word.length > 0);
    return words.length;
  };

  const formatWordCount = (count) => {
    return count === 1 ? '1 Word' : `${count} Words`;
  };

  return (
    <div className="flex items-center gap-3">
      <div
        onClick={() => openViewModal(journal.id)}
        className="bg-white rounded-lg p-4 border shadow-md hover:shadow-lg transition cursor-pointer flex-1"
        style={{ borderColor: '#E8EEF1' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold display-font mb-1" style={{ color: '#1d3e4c' }}>
              {formatWordCount(getWordCount(journal.content))}
            </h3>
            <div className="text-sm font-light mb-2" style={{ color: '#657b84' }}>
              {formatDate(journal.created_at)}
            </div>
            {journal.tags && journal.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {journal.tags.map((tag) => (
                  <a
                    key={tag.id}
                    href={`/tags?tag_id=${tag.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs px-2 py-1 rounded-lg font-medium hover:opacity-70 transition cursor-pointer flex items-center gap-1"
                    style={{
                      backgroundColor: '#E8EEF1',
                      color: '#1d3e4c',
                    }}
                  >
                    <i className="fa-solid fa-tag text-[10px]"></i>
                    {tag.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit button outside card */}
      <button
        onClick={() => openEditModal(journal.id)}
        className="w-5 h-5 flex items-center justify-center transition hover:opacity-70"
        title="Edit"
      >
        <i className="fa-solid fa-pen text-sm" style={{ color: '#9CA3A8' }}></i>
      </button>
    </div>
  );
};

export default JournalCard;
