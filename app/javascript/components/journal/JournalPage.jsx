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

  const renderGroup = (title, journals) => {
    if (journals.length === 0) return null;

    return (
      <div key={title} className="mb-8">
        <h3 className="text-lg mb-4" style={{ color: '#1D1D1F', fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
          {title}
        </h3>
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
      <div style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
        <div className="p-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #E5E5E7 0%, #C7C7CC 50%, #8E8E93 100%)', border: '0.5px solid rgba(199, 199, 204, 0.3)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.3)' }}
                >
                  <i className="fa-solid fa-book text-2xl" style={{ color: '#1D1D1F', filter: 'drop-shadow(0 0.5px 0 rgba(255, 255, 255, 0.5))' }}></i>
                </div>
                <div>
                  <h1 className="text-3xl" style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif", fontWeight: 800 }}>
                    Journal
                  </h1>
                  <p className="text-sm" style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
                    Your personal journal entries
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <button
                onClick={openNewModal}
                className="px-4 py-2 rounded-lg text-white transition transform hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)', fontWeight: 600, fontFamily: "'Inter', sans-serif", boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
              >
                <i className="fa-solid fa-plus mr-2"></i>New Entry
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search journal entries..."
              className="w-full px-4 py-3 rounded-lg focus:outline-none transition"
              style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', color: '#1D1D1F', fontWeight: 400, fontFamily: "'Inter', sans-serif", background: '#FFFFFF' }}
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-8 pt-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2"
              style={{ borderColor: '#2C2C2E' }}
            ></div>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-12 text-center" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
            <i
              className="fa-solid fa-exclamation-circle text-6xl mb-4"
              style={{ color: '#DC2626' }}
            ></i>
            <p style={{ color: '#DC2626', fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Error loading journals: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && journals.length === 0 && (
          <div className="rounded-xl p-12 text-center" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
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
            {renderGroup('Today', groupedJournals.today)}
            {renderGroup('Yesterday', groupedJournals.yesterday)}
            {renderGroup('This Week', groupedJournals.thisWeek)}
            {renderGroup('Earlier', groupedJournals.earlier)}
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
