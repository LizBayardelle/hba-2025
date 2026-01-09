import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { journalsApi } from '../../utils/api';
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

  // Get all unique tags for autocomplete
  const allTags = useMemo(() => {
    const tagMap = new Map();
    journals.forEach(journal => {
      journal.tags?.forEach(tag => {
        if (!tagMap.has(tag.id)) {
          tagMap.set(tag.id, tag);
        }
      });
    });
    return Array.from(tagMap.values());
  }, [journals]);

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
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#1d3e4c' }}>
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
      <div className="bg-white shadow-md">
        <div className="p-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center shadow-md"
                  style={{ background: 'linear-gradient(135deg, #1d3e4c, #45606b)' }}
                >
                  <i className="fa-solid fa-book text-white text-2xl"></i>
                </div>
                <div>
                  <h1 className="text-3xl font-bold display-font" style={{ color: '#1d3e4c' }}>
                    Journal
                  </h1>
                  <p className="text-sm font-light" style={{ color: '#657b84' }}>
                    Your personal journal entries
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <button
                onClick={openNewModal}
                className="px-4 py-2 rounded-lg text-white font-semibold shadow-md hover:shadow-lg transition transform hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #1d3e4c, #45606b)' }}
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
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
              style={{ borderColor: '#E8EEF1' }}
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
              style={{ borderColor: '#1d3e4c' }}
            ></div>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <i
              className="fa-solid fa-exclamation-circle text-6xl mb-4"
              style={{ color: '#DC2626' }}
            ></i>
            <p style={{ color: '#DC2626' }}>Error loading journals: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && journals.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <i
              className="fa-solid fa-book-open text-6xl mb-4"
              style={{ color: '#1d3e4c40' }}
            ></i>
            <p className="text-gray-500 font-light">
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
