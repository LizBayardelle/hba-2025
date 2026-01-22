import React, { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import useHabitsStore from '../../stores/habitsStore';
import HabitGroup from './HabitGroup';
import HabitEditModal from './HabitEditModal';
import HabitFormModal from '../categories/HabitFormModal';
import DocumentViewModal from '../documents/DocumentViewModal';
import DocumentFormModal from '../documents/DocumentFormModal';
import { tagsApi } from '../../utils/api';

const HabitsPage = () => {
  const { viewMode, selectedDate, setViewMode, goToPreviousDay, goToNextDay, goToToday, openNewModal } = useHabitsStore();

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

  // Color mapping
  const colorMap = {
    '#6B8A99': { light: '#E8EEF1', dark: '#1d3e4c' },
    '#9C8B7E': { light: '#E8E0D5', dark: '#5C4F45' },
    '#F8796D': { light: '#FFD4CE', dark: '#B8352A' },
    '#FFA07A': { light: '#FFE4D6', dark: '#D66A3E' },
    '#E5C730': { light: '#FEF7C3', dark: '#B89F0A' },
    '#A8A356': { light: '#E8EBCD', dark: '#7A7637' },
    '#7CB342': { light: '#D7EDCB', dark: '#4A6B27' },
    '#6EE7B7': { light: '#D1FAF0', dark: '#2C9D73' },
    '#22D3EE': { light: '#CFFAFE', dark: '#0E7490' },
    '#6366F1': { light: '#E0E7FF', dark: '#3730A3' },
    '#A78BFA': { light: '#EDE9FE', dark: '#6B21A8' },
    '#E879F9': { light: '#FAE8FF', dark: '#A21CAF' },
    '#FB7185': { light: '#FFE4E6', dark: '#BE123C' },
    '#9CA3A8': { light: '#E8E8E8', dark: '#4A5057' },
  };

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

  // Group habits
  const groupedHabits = useMemo(() => {
    if (!habitsData) return [];

    if (viewMode === 'category') {
      // Group by category
      const groups = {};
      habitsData.habits.forEach(habit => {
        const catId = habit.category_id;
        if (!groups[catId]) {
          groups[catId] = {
            id: catId,
            title: habit.category_name,
            icon: habit.category_icon,
            color: habit.category_color,
            darkColor: colorMap[habit.category_color]?.dark || '#1d3e4c',
            habits: [],
          };
        }
        groups[catId].habits.push(habit);
      });
      return Object.values(groups);
    } else if (viewMode === 'time') {
      // Group by time_block
      const groups = {};

      habitsData.habits.forEach(habit => {
        const blockId = habit.time_block_id || 'anytime';

        if (!groups[blockId]) {
          groups[blockId] = {
            id: blockId,
            title: habit.time_block_name || 'Anytime',
            icon: habit.time_block_icon || 'fa-clock',
            color: habit.time_block_color || '#1d3e4c',
            darkColor: colorMap[habit.time_block_color]?.dark || '#1d3e4c',
            rank: habit.time_block_rank != null ? habit.time_block_rank : 999,
            habits: [],
          };
        }

        // Add category color info to habit for display
        const habitWithColor = {
          ...habit,
          category_color: habit.category_color,
          category_dark_color: colorMap[habit.category_color]?.dark || '#1d3e4c',
        };
        groups[blockId].habits.push(habitWithColor);
      });

      // Sort groups by rank (anytime will have rank 999)
      return Object.values(groups).sort((a, b) => a.rank - b.rank);
    } else {
      // Group by priority (importance_level)
      const groups = {};
      habitsData.habits.forEach(habit => {
        const levelId = habit.importance_level?.id || 'none';
        if (!groups[levelId]) {
          groups[levelId] = {
            id: levelId,
            title: habit.importance_level?.name || 'No Priority',
            icon: habit.importance_level?.icon || 'fa-circle',
            color: habit.importance_level?.color || '#9CA3A8',
            darkColor: '#1d3e4c',
            rank: habit.importance_level?.rank || 999,
            habits: [],
          };
        }

        const habitWithColor = {
          ...habit,
          category_color: habit.category_color,
          category_dark_color: colorMap[habit.category_color]?.dark || '#1d3e4c',
        };
        groups[levelId].habits.push(habitWithColor);
      });

      // Sort groups by rank
      return Object.values(groups).sort((a, b) => a.rank - b.rank);
    }
  }, [habitsData, viewMode, colorMap]);

  return (
    <>
      {/* Header Section */}
      <div style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #E5E5E7 0%, #C7C7CC 50%, #8E8E93 100%)', border: '0.5px solid rgba(199, 199, 204, 0.3)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.3)' }}
                >
                  <i className="fa-solid fa-chart-line text-2xl" style={{ color: '#1D1D1F', filter: 'drop-shadow(0 0.5px 0 rgba(255, 255, 255, 0.5))' }}></i>
                </div>
                <div>
                  <h1 className="text-3xl" style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif", fontWeight: 800 }}>
                    Habits
                  </h1>
                  <p className="text-sm" style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
                    {stats.completed}/{stats.total} completed ({stats.percentage}%)
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={openNewModal}
              className="px-6 py-3 rounded-lg text-white transition transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)', fontWeight: 600, fontFamily: "'Inter', sans-serif", boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
            >
              <i className="fa-solid fa-plus mr-2"></i>
              New Habit
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* View Toggle */}
            <div className="flex gap-2">
              {[
                { value: 'category', label: 'Category', icon: 'fa-folder' },
                { value: 'time', label: 'Time', icon: 'fa-clock' },
                { value: 'priority', label: 'Priority', icon: 'fa-star' },
              ].map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setViewMode(value)}
                  className="px-4 py-2 rounded-lg text-sm transition"
                  style={viewMode === value ? {
                    background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)',
                    color: 'white',
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                  } : {
                    color: '#8E8E93',
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  <i className={`fa-solid ${icon} mr-2`}></i>
                  {label}
                </button>
              ))}
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
            {groupedHabits.map((group) => (
              <HabitGroup
                key={group.id}
                title={group.title}
                icon={group.icon}
                color={group.color}
                darkColor={group.darkColor}
                habits={group.habits}
                viewMode={viewMode}
                selectedDate={selectedDate}
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
    </>
  );
};

export default HabitsPage;
