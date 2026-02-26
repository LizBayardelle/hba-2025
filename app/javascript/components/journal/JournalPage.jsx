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

  // Fetch journals
  const { data: journals = [], isLoading, error } = useQuery({
    queryKey: ['journals', searchQuery],
    queryFn: () => journalsApi.fetchAll(searchQuery ? { search: searchQuery } : {}),
  });

  // Fetch all user tags for autocomplete
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.fetchAll,
  });

  // Group journals by date
  const groupedJournals = useMemo(() => {
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    journals.forEach(journal => {
      const journalDate = new Date(journal.created_at);
      const journalDay = new Date(journalDate.getFullYear(), journalDate.getMonth(), journalDate.getDate());

      if (journalDay.getTime() === today.getTime()) {
        groups.today.push(journal);
      } else if (journalDay.getTime() === yesterday.getTime()) {
        groups.yesterday.push(journal);
      } else if (journalDay.getTime() >= weekStart.getTime()) {
        groups.thisWeek.push(journal);
      } else {
        groups.earlier.push(journal);
      }
    });

    return groups;
  }, [journals]);

  const renderGroup = (title, journals, icon, isFirst = false) => {
    if (journals.length === 0) return null;

    return (
      <div key={title} className={`mb-6 ${!isFirst ? 'mt-8' : ''}`}>
        {/* Full-width colored stripe header */}
        <div
          className="-mx-8 px-8 py-4 mb-4 flex items-center gap-3 bar-default"
        >
          <i className={`fa-solid ${icon} text-white text-lg`}></i>
          <h3 className="text-3xl flex-1 text-white font-display" style={{ fontWeight: 500 }}>
            {title} ({journals.length})
          </h3>
          <button
            onClick={openNewModal}
            className="w-8 h-8 rounded-md flex items-center justify-center transition hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.95)' }}
            title="New entry"
          >
            <i className="fa-solid fa-plus" style={{ color: '#333' }}></i>
          </button>
        </div>
        <div className="space-y-4">
          {journals.map(journal => (
            <JournalCard key={journal.id} journal={journal} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Header Section */}
      <div className="shadow-deep" style={{ background: '#FFFFFF' }}>
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-5xl font-display mb-2" style={{ color: '#1D1D1F' }}>
                Journal
              </h1>
            </div>

            <button
              onClick={openNewModal}
              className="w-12 h-12 rounded-xl text-white transition transform hover:scale-105 flex items-center justify-center btn-onyx"
              title="New Entry"
            >
              <i className="fa-solid fa-plus text-lg" style={{ position: 'relative', zIndex: 2 }}></i>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#8E8E93' }}></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search journal entries..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none transition-shadow duration-200"
              style={{
                border: '1px solid #8E8E93',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
                background: '#FFFFFF',
                boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255, 255, 255, 0.8)',
                letterSpacing: '0.01em'
              }}
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-8 pb-8">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2"
              style={{ borderColor: '#2C2C2E' }}
            ></div>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-12 text-center" style={{ background: '#FFFFFF', boxShadow: '4px 0 24px rgba(0, 0, 0, 0.5)' }}>
            <i
              className="fa-solid fa-exclamation-circle text-6xl mb-4"
              style={{ color: '#DC2626' }}
            ></i>
            <p style={{ color: '#DC2626', fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Error loading journals: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && journals.length === 0 && (
          <div className="rounded-xl p-12 text-center mt-8" style={{ background: '#FFFFFF', boxShadow: '4px 0 24px rgba(0, 0, 0, 0.5)' }}>
            <i
              className="fa-solid fa-book-open text-6xl mb-4"
              style={{ color: '#E5E5E7' }}
            ></i>
            <p style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
              No journal entries yet. Click "New Entry" to get started!
            </p>
          </div>
        )}

        {!isLoading && !error && journals.length > 0 && (
          <div>
            {renderGroup('Today', groupedJournals.today, 'fa-sun', groupedJournals.today.length > 0)}
            {renderGroup('Yesterday', groupedJournals.yesterday, 'fa-clock-rotate-left', groupedJournals.today.length === 0 && groupedJournals.yesterday.length > 0)}
            {renderGroup('This Week', groupedJournals.thisWeek, 'fa-calendar-week', groupedJournals.today.length === 0 && groupedJournals.yesterday.length === 0 && groupedJournals.thisWeek.length > 0)}
            {renderGroup('Earlier', groupedJournals.earlier, 'fa-archive', groupedJournals.today.length === 0 && groupedJournals.yesterday.length === 0 && groupedJournals.thisWeek.length === 0)}
          </div>
        )}
      </div>

      {/* Modals */}
      <JournalViewModal />
      <JournalFormModal allTags={allTags} />
    </>
  );
};

export default JournalPage;
