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

  return (
    <div className="flex items-center gap-3">
      <div
        onClick={() => openViewModal(journal.id)}
        className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition cursor-pointer flex-1"
        style={{ borderLeft: '4px solid #1d3e4c' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
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
                    className="text-xs px-2 py-1 rounded-full font-semibold hover:opacity-70 transition cursor-pointer flex items-center gap-1"
                    style={{
                      backgroundColor: '#E8EEF1',
                      color: '#1d3e4c',
                    }}
                  >
                    <i className="fa-solid fa-tags text-[10px]"></i>
                    {tag.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions (outside card, stacked on right) */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => openEditModal(journal.id)}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition"
          title="Edit"
        >
          <i className="fa-solid fa-edit" style={{ color: '#1d3e4c' }}></i>
        </button>
      </div>
    </div>
  );
};

export default JournalCard;
