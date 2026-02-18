import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import useHabitsStore from '../../stores/habitsStore';
import HabitGroup from './HabitGroup';
import HabitEditModal from './HabitEditModal';
import HabitFormModal from '../categories/HabitFormModal';
import DocumentViewModal from '../documents/DocumentViewModal';
import DocumentFormModal from '../documents/DocumentFormModal';
import ListShowModal from '../lists/ListShowModal';
import { tagsApi } from '../../utils/api';
import { getColorVariants } from '../../utils/colorUtils';

const HabitsPage = () => {
  const { viewMode, selectedDate, setViewMode, goToPreviousDay, goToNextDay, goToToday, openNewModal } = useHabitsStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Update sidebar date when selectedDate changes
  useEffect(() => {
    const dateElement = document.getElementById('selected-date');
    if (dateElement) {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      dateElement.textContent = date.toLocaleDateString('en-US', options);
    }
  }, [selectedDate]);

  // Redirect to today if trying to view a future date
  useEffect(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (selectedDate > todayStr) {
      goToToday();
    }
  }, [selectedDate, goToToday]);

  // Check if selected date is today (use local date comparison)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isToday = selectedDate === todayStr;
  const isFuture = selectedDate > todayStr;

  // Fetch habits data
  const { data: habitsData, isLoading, error } = useQuery({
    queryKey: ['habits', selectedDate, viewMode],
    queryFn: async () => {
      const response = await fetch(`/habits.json?date=${selectedDate}&view=${viewMode}`);
      if (!response.ok) throw new Error('Failed to fetch habits');
      return response.json();
    },
  });

  // Fetch all user tags for DocumentFormModal
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.fetchAll,
  });

  // Calculate stats
  const stats = useMemo(() => {
    if (!habitsData) return { completed: 0, total: 0, percentage: 0 };

    const completed = habitsData.habits.filter(
      h => (h.today_count || 0) >= h.target_count
    ).length;
    const total = habitsData.habits.length;
    const percentage = total > 0 ? Math.round((completed * 100) / total) : 0;

    return { completed, total, percentage };
  }, [habitsData]);

  // Format date for display
  const formatDate = (dateStr) => {
    if (isToday) return 'Today';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
  };

  // Filter habits by search query
  const filteredHabits = useMemo(() => {
    if (!habitsData) return [];
    if (!searchQuery.trim()) return habitsData.habits;

    const query = searchQuery.toLowerCase();
    return habitsData.habits.filter(habit =>
      habit.name.toLowerCase().includes(query) ||
      habit.category_name?.toLowerCase().includes(query)
    );
  }, [habitsData, searchQuery]);

  // Group habits
  const groupedHabits = useMemo(() => {
    if (!habitsData) return [];

    if (viewMode === 'none') {
      return [{ id: 'all', title: 'All Habits', habits: filteredHabits, hideHeader: true }];
    }

    if (viewMode === 'category') {
      // Group by category
      const groups = {};
      filteredHabits.forEach(habit => {
        const catId = habit.category_id;
        if (!groups[catId]) {
          groups[catId] = {
            id: catId,
            title: habit.category_name,
            icon: habit.category_icon,
            color: habit.category_color,
            darkColor: getColorVariants(habit.category_color).dark,
            habits: [],
          };
        }
        groups[catId].habits.push(habit);
      });
      return Object.values(groups);
    } else if (viewMode === 'time') {
      // Group by time_block
      const groups = {};

      filteredHabits.forEach(habit => {
        const blockId = habit.time_block_id || 'anytime';

        if (!groups[blockId]) {
          groups[blockId] = {
            id: blockId,
            title: habit.time_block_name || 'Anytime',
            icon: habit.time_block_icon || 'fa-clock',
            color: habit.time_block_color || '#1D1D1F',
            darkColor: habit.time_block_color ? getColorVariants(habit.time_block_color).dark : '#1D1D1F',
            rank: habit.time_block_rank != null ? habit.time_block_rank : 999,
            habits: [],
          };
        }

        // Add category color info to habit for display
        const habitWithColor = {
          ...habit,
          category_color: habit.category_color,
          category_dark_color: getColorVariants(habit.category_color).dark,
        };
        groups[blockId].habits.push(habitWithColor);
      });

      // Sort groups by rank (anytime will have rank 999)
      return Object.values(groups).sort((a, b) => a.rank - b.rank);
    } else {
      // Group by priority (importance_level)
      const groups = {};
      filteredHabits.forEach(habit => {
        const levelId = habit.importance_level?.id || 'none';
        if (!groups[levelId]) {
          groups[levelId] = {
            id: levelId,
            title: habit.importance_level?.name || 'No Priority',
            icon: habit.importance_level?.icon || 'fa-circle',
            color: habit.importance_level?.color || '#9CA3A8',
            darkColor: '#1D1D1F',
            rank: habit.importance_level?.rank || 999,
            habits: [],
          };
        }

        const habitWithColor = {
          ...habit,
          category_color: habit.category_color,
          category_dark_color: getColorVariants(habit.category_color).dark,
        };
        groups[levelId].habits.push(habitWithColor);
      });

      // Sort groups by rank
      return Object.values(groups).sort((a, b) => a.rank - b.rank);
    }
  }, [habitsData, filteredHabits, viewMode]);

  return (
    <>
      {/* Header Section */}
      <div style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-5xl font-display mb-2" style={{ color: '#1D1D1F' }}>
                Habits
              </h1>
            </div>

            <button
              onClick={() => openNewModal({})}
              className="w-12 h-12 rounded-xl text-white transition transform hover:scale-105 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
              title="New Habit"
            >
              <i className="fa-solid fa-plus text-lg"></i>
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-4 items-center mb-4">
            {/* View Toggle */}
            <div>
              <span className="block text-xs uppercase tracking-wide mb-2" style={{ color: '#8E8E93', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                Group By
              </span>
              <div className="inline-flex rounded-lg overflow-hidden" style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}>
                {[
                  { value: 'none', label: 'None' },
                  { value: 'category', label: 'Category' },
                  { value: 'time', label: 'Time' },
                  { value: 'priority', label: 'Priority' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setViewMode(value)}
                    className="px-4 py-2 text-sm transition"
                    style={{
                      background: viewMode === value ? 'linear-gradient(to bottom, #A8A8AD 0%, #8E8E93 100%)' : '#F5F5F7',
                      color: viewMode === value ? '#FFFFFF' : '#1D1D1F',
                      fontWeight: 500,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={goToPreviousDay}
                className="w-10 h-10 rounded-lg flex items-center justify-center transition"
                style={{ background: 'linear-gradient(135deg, rgba(229, 229, 231, 0.3) 0%, rgba(199, 199, 204, 0.4) 50%, rgba(142, 142, 147, 0.3) 100%)', border: '0.5px solid rgba(199, 199, 204, 0.3)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)' }}
              >
                <i className="fa-solid fa-chevron-left text-sm" style={{ color: '#2C2C2E' }}></i>
              </button>
              <div className="px-2 text-sm" style={{ color: '#1D1D1F', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                {formatDate(selectedDate)}
              </div>
              <button
                onClick={goToNextDay}
                disabled={isToday || isFuture}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${isToday || isFuture ? 'opacity-30 pointer-events-none' : ''}`}
                style={{ background: 'linear-gradient(135deg, rgba(229, 229, 231, 0.3) 0%, rgba(199, 199, 204, 0.4) 50%, rgba(142, 142, 147, 0.3) 100%)', border: '0.5px solid rgba(199, 199, 204, 0.3)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)' }}
              >
                <i className="fa-solid fa-chevron-right text-sm" style={{ color: '#2C2C2E' }}></i>
              </button>
              {!isToday && (
                <button
                  onClick={goToToday}
                  className="ml-2 px-4 py-2 rounded-lg text-sm transition"
                  style={{ background: 'linear-gradient(135deg, rgba(229, 229, 231, 0.3) 0%, rgba(199, 199, 204, 0.4) 50%, rgba(142, 142, 147, 0.3) 100%)', border: '0.5px solid rgba(199, 199, 204, 0.3)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)', color: '#1D1D1F', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
                >
                  Today
                </button>
              )}
            </div>
          </div>

          {/* Search Row */}
          <div className="relative">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#8E8E93' }}></i>
            <input
              type="text"
              placeholder="Search habits..."
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

      {/* Content Area */}
      <div className="p-8 pt-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2"
              style={{ borderColor: '#2C2C2E' }}
            ></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-xl p-12 text-center" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
            <i className="fa-solid fa-exclamation-circle text-6xl mb-4" style={{ color: '#DC2626' }}></i>
            <p style={{ color: '#DC2626', fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Error loading habits: {error.message}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && (!habitsData || habitsData.habits.length === 0) && (
          <div className="rounded-xl p-12 text-center" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
            <i className="fa-solid fa-clipboard-list text-6xl mb-4" style={{ color: '#E5E5E7' }}></i>
            <h3 className="text-xl mb-2" style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
              No Habits Yet
            </h3>
            <p className="mb-4" style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
              Start building better habits by creating your first one!
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 rounded-lg text-white transition"
              style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)', fontWeight: 600, fontFamily: "'Inter', sans-serif", boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
            >
              Browse Categories
            </a>
          </div>
        )}

        {/* Habits List */}
        {!isLoading && !error && habitsData && habitsData.habits.length > 0 && (
          <div className="space-y-4">
            {groupedHabits.map((group, index) => (
              <HabitGroup
                key={group.id}
                groupId={group.id}
                title={group.title}
                icon={group.icon}
                color={group.color}
                darkColor={group.darkColor}
                habits={group.habits}
                viewMode={viewMode}
                selectedDate={selectedDate}
                isFirst={index === 0}
                hideHeader={group.hideHeader}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <HabitFormModal useHabitsPage={true} />
      <HabitEditModal />
      <DocumentViewModal />
      <DocumentFormModal habits={habitsData?.habits || []} allTags={allTags} />
      <ListShowModal />
    </>
  );
};

export default HabitsPage;
