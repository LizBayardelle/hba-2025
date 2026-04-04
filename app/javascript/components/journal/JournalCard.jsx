import React from 'react';
import useJournalStore from '../../stores/journalStore';

const JournalCard = ({ journal }) => {
  const { openViewModal, openEditModal } = useJournalStore();

  const formatDate = (ds) => new Date(ds).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

  const getWordCount = (html) => {
    if (!html) return 0;
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return (temp.textContent || '').trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  const getSnippet = (html, max = 150) => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const text = (temp.textContent || '').replace(/\s+/g, ' ').trim();
    return text.length <= max ? text : text.substring(0, max).trim() + '...';
  };

  const words = getWordCount(journal.content);

  return (
    <div
      className="flex items-center gap-2.5"
      style={{ padding: '10px 24px', transition: 'background 0.1s ease', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
      onClick={() => openViewModal(journal.id)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 450, color: 'var(--ink)' }}>
            {words === 1 ? '1 word' : `${words} words`}
          </span>
          {journal.private && (
            <i className="fa-solid fa-lock" style={{ fontSize: '0.6rem', color: 'var(--ink-faint)' }} title="Private" />
          )}
          <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>{formatDate(journal.created_at)}</span>
        </div>

        {!journal.private && journal.content && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.833rem', color: 'var(--ink-tertiary)', marginTop: 2, lineHeight: 1.5 }}>
            {getSnippet(journal.content)}
          </p>
        )}

        {journal.tags && journal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {journal.tags.map(tag => (
              <a key={tag.id} href={`/tags?tag_id=${tag.id}`} onClick={(e) => e.stopPropagation()}
                className="v2-badge v2-badge-neutral" style={{ fontSize: '0.6rem', padding: '1px 6px', textDecoration: 'none' }}>
                {tag.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalCard;
