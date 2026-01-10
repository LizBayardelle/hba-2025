import React, { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import useHabitsStore from '../../stores/habitsStore';
import HabitGroup from './HabitGroup';
import DocumentViewModal from '../documents/DocumentViewModal';

const HabitsPage = () => {
  const { viewMode, selectedDate, setViewMode, goToPreviousDay, goToNextDay, goToToday } = useHabitsStore();

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
    } else {
      // Group by time of day
      const timeGroups = {
        morning: { title: 'Morning', icon: 'fa-sun', habits: [] },
        afternoon: { title: 'Afternoon', icon: 'fa-cloud-sun', habits: [] },
        evening: { title: 'Evening', icon: 'fa-moon', habits: [] },
        anytime: { title: 'Anytime', icon: 'fa-clock', habits: [] },
      };

      habitsData.habits.forEach(habit => {
        const time = (habit.time_of_day || 'anytime').toLowerCase();
        const group = ['morning', 'afternoon', 'evening'].includes(time) ? time : 'anytime';

        // Add category color info to habit for display
        const habitWithColor = {
          ...habit,
          category_color: habit.category_color,
          category_dark_color: colorMap[habit.category_color]?.dark || '#1d3e4c',
        };
        timeGroups[group].habits.push(habitWithColor);
      });

      return Object.entries(timeGroups)
        .filter(([_, group]) => group.habits.length > 0)
        .map(([key, group]) => ({
          id: key,
          title: group.title,
          icon: group.icon,
          color: '#1d3e4c',
          darkColor: '#1d3e4c',
          habits: group.habits,
        }));
    }
  }, [habitsData, viewMode, colorMap]);

  return (
    <>
      {/* Header Section */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="p-8 pb-6">
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-4xl font-bold display-font mb-1" style={{ color: '#1d3e4c' }}>
              Dashboard
            </h1>
            <p className="text-sm font-light" style={{ color: '#657b84' }}>
              Check off your daily habits
            </p>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-6">
            {/* Today Completed */}
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold display-font mb-0.5 sm:mb-1" style={{ color: '#1d3e4c' }}>
                {stats.completed}/{stats.total}
              </div>
              <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide" style={{ color: '#657b84' }}>
                Today
              </div>
            </div>

            {/* Today Percentage */}
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold display-font mb-0.5 sm:mb-1" style={{ color: '#1d3e4c' }}>
                {stats.percentage}%
              </div>
              <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide" style={{ color: '#657b84' }}>
                Complete
              </div>
            </div>
          </div>
        </div>

        {/* Controls Bar - Now inside header for sticky behavior */}
        <div className="px-8 py-3 border-t flex gap-2 items-center justify-between" style={{ borderColor: '#E8EEF1' }}>
          {/* Date Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousDay}
              className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center transition"
            >
              <i className="fa-solid fa-chevron-left text-sm" style={{ color: '#1d3e4c' }}></i>
            </button>
            <div className="px-2 py-1 text-sm font-semibold whitespace-nowrap" style={{ color: '#1d3e4c' }}>
              {formatDate(selectedDate)}
            </div>
            <button
              onClick={goToNextDay}
              disabled={isToday || isFuture}
              className={`w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center transition ${isToday || isFuture ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <i className="fa-solid fa-chevron-right text-sm" style={{ color: '#1d3e4c' }}></i>
            </button>
            {!isToday && (
              <button
                onClick={goToToday}
                className="ml-1 px-2 py-1 text-xs font-semibold rounded-lg hover:bg-white transition whitespace-nowrap"
                style={{ color: '#1d3e4c' }}
              >
                Today
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex gap-1 bg-white p-0.5 rounded-lg shadow-sm">
            <button
              onClick={() => setViewMode('category')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${viewMode === 'category' ? 'shadow-sm' : 'hover:bg-gray-100'}`}
              style={
                viewMode === 'category'
                  ? { backgroundColor: '#E8EEF1', color: '#1d3e4c' }
                  : { color: '#1d3e4c' }
              }
            >
              <i className="fa-solid fa-folder mr-1"></i>
              <span className="hidden sm:inline">Category</span>
              <span className="sm:hidden">Cat</span>
            </button>
            <button
              onClick={() => setViewMode('time')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${viewMode === 'time' ? 'shadow-sm' : 'hover:bg-gray-100'}`}
              style={
                viewMode === 'time'
                  ? { backgroundColor: '#E8EEF1', color: '#1d3e4c' }
                  : { color: '#1d3e4c' }
              }
            >
              <i className="fa-solid fa-clock mr-1"></i>
              <span className="hidden sm:inline">Time</span>
              <span className="sm:hidden">Time</span>
            </button>
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
              style={{ borderColor: '#1d3e4c' }}
            ></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <i className="fa-solid fa-exclamation-circle text-6xl mb-4" style={{ color: '#DC2626' }}></i>
            <p style={{ color: '#DC2626' }}>Error loading habits: {error.message}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && (!habitsData || habitsData.habits.length === 0) && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <i className="fa-solid fa-clipboard-list text-6xl mb-4" style={{ color: '#E8EEF1' }}></i>
            <h3 className="text-xl font-bold display-font mb-2" style={{ color: '#1d3e4c' }}>
              No Habits Yet
            </h3>
            <p className="text-gray-500 font-light mb-4">
              Start building better habits by creating your first one!
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 rounded-lg text-white font-semibold shadow-lg hover:shadow-xl transition"
              style={{ background: 'linear-gradient(135deg, #1d3e4c, #45606b)' }}
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
      <DocumentViewModal />
    </>
  );
};

export default HabitsPage;
