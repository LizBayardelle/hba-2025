import React, { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { goalsApi, categoriesApi, tagsApi, documentsApi } from '../../utils/api';
import useGoalsStore from '../../stores/goalsStore';
import GoalItem from './GoalItem';
import GoalFormModal from './GoalFormModal';
import GoalViewModal from './GoalViewModal';
import DocumentViewModal from '../documents/DocumentViewModal';
import DocumentFormModal from '../documents/DocumentFormModal';
import ListShowModal from '../lists/ListShowModal';

const GoalsPage = () => {
  const {
    statusFilter,
    groupBy,
    searchQuery,
    setStatusFilter,
    setGroupBy,
    setSearchQuery,
    openNewModal,
  } = useGoalsStore();

  // Initialize from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlStatus = params.get('status');
    const urlGroupBy = params.get('groupBy');
    const urlSearch = params.get('search');

    if (urlStatus) setStatusFilter(urlStatus);
    if (urlGroupBy) setGroupBy(urlGroupBy);
    if (urlSearch) setSearchQuery(urlSearch);
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'active') params.set('status', statusFilter);
    if (groupBy && groupBy !== 'none') params.set('groupBy', groupBy);
    if (searchQuery) params.set('search', searchQuery);

    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [statusFilter, groupBy, searchQuery]);

  // Fetch goals
  const { data: goals = [], isLoading, error } = useQuery({
    queryKey: ['goals', statusFilter, searchQuery],
    queryFn: () => {
      const params = { status: statusFilter };
      if (searchQuery) params.search = searchQuery;
      return goalsApi.fetchAll(params);
    },
  });

  // Fetch all categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.fetchAll(),
  });

  // Fetch all user tags for autocomplete
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.fetchAll,
  });

  // Fetch all documents
  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.fetchAll,
  });

  // Group goals based on groupBy setting
  const groupedGoals = useMemo(() => {
    if (groupBy === 'none') {
      return [{ title: 'All Goals', goals, hideHeader: true }];
    }

    if (groupBy === 'category') {
      const groups = {};
      const uncategorized = { title: 'Uncategorized', goals: [], color: '#9CA3A8', icon: 'fa-inbox', id: null };

      goals.forEach(goal => {
        if (goal.category) {
          const catId = goal.category.id;
          if (!groups[catId]) {
            groups[catId] = {
              id: catId,
              title: goal.category.name,
              color: goal.category.color,
              icon: goal.category.icon,
              goals: [],
            };
          }
          groups[catId].goals.push(goal);
        } else {
          uncategorized.goals.push(goal);
        }
      });

      const result = Object.values(groups);
      if (uncategorized.goals.length > 0) {
        result.push(uncategorized);
      }
      return result;
    } else if (groupBy === 'type') {
      const metallicGrey = '#8E8E93';
      const groups = {
        counted: { title: 'Counted', goals: [], color: '#7C3AED', icon: 'fa-hashtag' },
        named_steps: { title: 'Named Steps', goals: [], color: '#0891B2', icon: 'fa-list-ol' },
      };

      goals.forEach(goal => {
        if (groups[goal.goal_type]) {
          groups[goal.goal_type].goals.push(goal);
        }
      });

      return Object.values(groups).filter(g => g.goals.length > 0);
    } else if (groupBy === 'importance') {
      const groups = {};
      const noImportance = { title: 'No Importance', goals: [], color: '#9CA3A8', icon: 'fa-circle', id: null };

      goals.forEach(goal => {
        if (goal.importance_level) {
          const levelId = goal.importance_level.id;
          if (!groups[levelId]) {
            groups[levelId] = {
              id: levelId,
              title: goal.importance_level.name,
              color: goal.importance_level.color,
              icon: goal.importance_level.icon || 'fa-circle',
              goals: [],
            };
          }
          groups[levelId].goals.push(goal);
        } else {
          noImportance.goals.push(goal);
        }
      });

      const result = Object.values(groups).sort((a, b) => (a.rank || 0) - (b.rank || 0));
      if (noImportance.goals.length > 0) {
        result.push(noImportance);
      }
      return result;
    }

    return [{ title: 'All Goals', goals }];
  }, [goals, groupBy]);

  // Handle new goal button click based on group type
  const handleNewGoalForGroup = (group) => {
    if (groupBy === 'category' && group.id) {
      openNewModal({ categoryId: group.id });
    } else if (groupBy === 'importance' && group.id) {
      openNewModal({ importanceLevelId: group.id });
    } else {
      openNewModal({});
    }
  };

  const renderGroup = (group, index) => {
    const groupColor = group.color || '#8E8E93';
    const groupIcon = group.icon || 'fa-list';

    return (
      <div key={group.title} className={`mb-6 ${index !== 0 ? 'mt-8' : (group.hideHeader ? 'mt-6' : '')}`}>
        {/* Full-width colored stripe header */}
        {!group.hideHeader && (
          <div
            className="-mx-8 px-8 py-4 mb-4 flex items-center gap-3"
            style={{
              background: `linear-gradient(to bottom, color-mix(in srgb, ${groupColor} 85%, white) 0%, ${groupColor} 100%)`,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
          >
            <i className={`fa-solid ${groupIcon} text-white text-lg`}></i>
            <h3 className="text-3xl flex-1 text-white font-display" style={{ fontWeight: 500 }}>
              {group.title} ({group.goals.length})
            </h3>
            <button
              onClick={() => handleNewGoalForGroup(group)}
              className="w-8 h-8 rounded-md flex items-center justify-center transition btn-glass"
              title="New goal"
            >
              <i className="fa-solid fa-plus text-white"></i>
            </button>
          </div>
        )}
        <div className="space-y-2">
          {group.goals.map(goal => (
            <GoalItem key={goal.id} goal={goal} />
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
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-5xl font-display mb-2" style={{ color: '#1D1D1F' }}>
                Goals
              </h1>
            </div>

            <button
              onClick={() => openNewModal({})}
              className="w-12 h-12 rounded-xl text-white transition transform hover:scale-105 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
              title="New Goal"
            >
              <i className="fa-solid fa-plus text-lg"></i>
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-6 mb-4">
            {/* Group By */}
            <div>
              <span className="block text-xs uppercase tracking-wide mb-2" style={{ color: '#8E8E93', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                Group By
              </span>
              <div className="inline-flex rounded-lg overflow-hidden" style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}>
                {[
                  { value: 'none', label: 'None' },
                  { value: 'category', label: 'Category' },
                  { value: 'type', label: 'Type' },
                  { value: 'importance', label: 'Importance' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setGroupBy(value)}
                    className="px-4 py-2 text-sm transition"
                    style={{
                      background: groupBy === value ? 'linear-gradient(to bottom, #A8A8AD 0%, #8E8E93 100%)' : '#F5F5F7',
                      color: groupBy === value ? '#FFFFFF' : '#1D1D1F',
                      fontWeight: 500,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Only Checkbox - far right */}
            <label className="flex items-center gap-2 cursor-pointer select-none ml-auto">
              <input
                type="checkbox"
                checked={statusFilter === 'active'}
                onChange={(e) => setStatusFilter(e.target.checked ? 'active' : 'all')}
                className="w-4 h-4 rounded cursor-pointer"
                style={{ accentColor: '#8E8E93' }}
              />
              <span style={{ color: '#8E8E93', fontWeight: 400, fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem' }}>
                Active only
              </span>
            </label>
          </div>

          {/* Search Row */}
          <div className="relative">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#8E8E93' }}></i>
            <input
              type="text"
              placeholder="Search goals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none"
              style={{
                border: '1px solid rgba(199, 199, 204, 0.4)',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
                background: '#F9F9FB',
                boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.08)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="px-8 pb-8">
        {isLoading && (
          <div className="text-center py-12">
            <i className="fa-solid fa-spinner fa-spin text-4xl" style={{ color: '#2C2C2E' }}></i>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p style={{ color: '#DC2626', fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Error loading goals: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && goals.length === 0 && (
          <div className="text-center py-12">
            <i className="fa-solid fa-bullseye text-6xl mb-4" style={{ color: '#E5E5E7' }}></i>
            <p className="text-lg mb-2" style={{ color: '#1D1D1F', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
              No goals yet
            </p>
            <p className="text-sm" style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
              Create your first goal to get started
            </p>
          </div>
        )}

        {!isLoading && !error && goals.length > 0 && groupedGoals.map((group, index) => renderGroup(group, index))}
      </div>

      {/* Modals */}
      <GoalFormModal allTags={allTags} categories={categories} documents={documents} />
      <GoalViewModal />
      <DocumentViewModal />
      <DocumentFormModal />
      <ListShowModal />
    </>
  );
};

export default GoalsPage;
