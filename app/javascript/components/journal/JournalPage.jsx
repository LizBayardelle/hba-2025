import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { journalsApi, tagsApi } from '../../utils/api';
import useJournalStore from '../../stores/journalStore';
import JournalCard from './JournalCard';
import JournalFormModal from './JournalFormModal';
import JournalViewModal from './JournalViewModal';

const JournalPage = () => {
  const { openNewModal } = useJournalStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: journals = [], isLoading, error } = useQuery({
    queryKey: ['journals', searchQuery],
    queryFn: () => journalsApi.fetchAll(searchQuery ? { search: searchQuery } : {}),
  });

  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.fetchAll });

  const groupedJournals = useMemo(() => {
    const groups = { today: [], yesterday: [], thisWeek: [], earlier: [] };
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - 7);

    journals.forEach(j => {
      const d = new Date(j.created_at); const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (day.getTime() === today.getTime()) groups.today.push(j);
      else if (day.getTime() === yesterday.getTime()) groups.yesterday.push(j);
      else if (day.getTime() >= weekStart.getTime()) groups.thisWeek.push(j);
      else groups.earlier.push(j);
    });
    return groups;
  }, [journals]);

  const renderGroup = (title, entries) => {
    if (entries.length === 0) return null;
    return (
      <div key={title} className="v2-card" style={{ padding: 0, marginBottom: 16 }}>
        <div className="v2-section-header" style={{ padding: '12px 18px 8px' }}>
          <div className="flex items-center gap-2">
            <span className="v2-section-title">{title}</span>
            <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>{entries.length}</span>
          </div>
          <button onClick={openNewModal} className="v2-btn-icon-sm" title="New entry">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
        {entries.map(j => <JournalCard key={j.id} journal={j} />)}
      </div>
    );
  };

  return (
    <>
      {/* v2 Header */}
      <div className="sticky top-0 z-10" style={{ background: 'var(--bg)' }}>
        <div className="pl-14 pr-4 pt-6 pb-4 md:pl-8 md:pr-8 md:pt-8 md:pb-5">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="v2-h1">Journal</h1>
              <p className="v2-small" style={{ marginTop: 4, color: 'var(--ink-tertiary)' }}>
                {journals.length > 0 ? `${journals.length} entries` : 'No entries yet'}
              </p>
            </div>
            <button onClick={openNewModal} className="v2-btn-sm v2-btn-primary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Entry
            </button>
          </div>

          <div className="relative mt-4 max-w-xs">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search entries..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm focus:outline-none"
              style={{ border: '1px solid var(--border)', fontFamily: 'var(--font-body)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '0.833rem' }} />
          </div>
        </div>
        <div style={{ height: 12, background: 'linear-gradient(to bottom, var(--bg), transparent)', pointerEvents: 'none' }} />
      </div>

      {/* Content */}
      <div className="px-4 pb-16 md:px-8" style={{ maxWidth: 920, paddingTop: 8 }}>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ink-faint)' }} />
          </div>
        )}
        {error && <div className="v2-card text-center" style={{ padding: '48px 24px' }}><p className="v2-small" style={{ color: 'var(--overdue)' }}>Error: {error.message}</p></div>}
        {!isLoading && !error && journals.length === 0 && (
          <div className="v2-card text-center" style={{ padding: '48px 24px' }}>
            <p className="v2-body">No journal entries yet</p>
            <p className="v2-small" style={{ color: 'var(--ink-faint)', marginTop: 4 }}>Start writing to capture your thoughts.</p>
            <button onClick={openNewModal} className="v2-btn v2-btn-primary" style={{ marginTop: 16 }}>New Entry</button>
          </div>
        )}
        {!isLoading && !error && journals.length > 0 && (
          <>
            {renderGroup('Today', groupedJournals.today)}
            {renderGroup('Yesterday', groupedJournals.yesterday)}
            {renderGroup('This Week', groupedJournals.thisWeek)}
            {renderGroup('Earlier', groupedJournals.earlier)}
          </>
        )}
      </div>

      <JournalViewModal />
      <JournalFormModal allTags={allTags} />
    </>
  );
};

export default JournalPage;
