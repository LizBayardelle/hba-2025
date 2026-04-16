import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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

  // Tracking paused state (initialized from data attribute)
  const [trackingPaused, setTrackingPaused] = useState(() => {
    const root = document.getElementById('habits-root');
    return root?.dataset.trackingPaused === 'true';
  });

  const toggleTrackingPaused = useCallback(async () => {
    const newPaused = !trackingPaused;
    setTrackingPaused(newPaused);
    try {
      const response = await fetch('/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': document.querySelector('[name=csrf-token]').content,
        },
        body: JSON.stringify({ user: { tracking_paused: newPaused } }),
      });
      if (!response.ok) throw new Error('Failed to update');
    } catch (e) {
      setTrackingPaused(!newPaused);
    }
  }, [trackingPaused]);

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

  // Check if selected date is today
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isToday = selectedDate === todayStr;
  const isFuture = selectedDate > todayStr;

  // Format display date
  const displayDate = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }, [selectedDate]);

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
        const habitWithColor = {
          ...habit,
          category_color: habit.category_color,
          category_dark_color: getColorVariants(habit.category_color).dark,
        };
        groups[blockId].habits.push(habitWithColor);
      });
      return Object.values(groups).sort((a, b) => a.rank - b.rank);
    } else {
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
      return Object.values(groups).sort((a, b) => a.rank - b.rank);
    }
  }, [habitsData, filteredHabits, viewMode]);

  return (
    <>
      {/* v2 Header */}
      <div className="sticky top-0 z-10" style={{ background: 'var(--bg)' }}>
        <div className="pl-14 pr-4 pt-6 pb-4 md:pl-8 md:pr-8 md:pt-8 md:pb-5">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="v2-h1">{isToday ? displayDate : displayDate}</h1>
              <p className="v2-small" style={{ marginTop: 4, color: 'var(--ink-tertiary)' }}>
                {stats.total > 0
                  ? `${stats.completed} of ${stats.total} habits done · ${stats.percentage}%`
                  : 'No habits today'
                }
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={goToPreviousDay} className="v2-btn-icon" title="Previous day">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              {isToday ? (
                <span className="v2-caption" style={{ padding: '4px 10px' }}>Today</span>
              ) : (
                <button onClick={goToToday} className="v2-btn-sm v2-btn-ghost">Today</button>
              )}
              <button
                onClick={goToNextDay}
                disabled={isToday || isFuture}
                className="v2-btn-icon"
                style={{ opacity: isToday || isFuture ? 0.3 : 1, pointerEvents: isToday || isFuture ? 'none' : 'auto' }}
                title="Next day"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div
              className="flex items-center gap-2.5 rounded-lg"
              style={{
                padding: '6px 12px',
                background: trackingPaused ? 'var(--surface)' : 'transparent',
                border: `1px solid ${trackingPaused ? 'var(--border)' : 'transparent'}`,
                transition: 'all 0.2s ease',
              }}
            >
              <button
                onClick={toggleTrackingPaused}
                className={`v2-toggle ${trackingPaused ? 'active' : ''}`}
                role="switch"
                aria-checked={trackingPaused}
              />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-tertiary)' }}>
                {trackingPaused ? 'Off day. Tracking paused.' : 'Off day'}
              </span>
            </div>
            <div className="v2-seg-control">
              {[
                { value: 'none', label: 'All' },
                { value: 'category', label: 'Category' },
                { value: 'time', label: 'Time' },
                { value: 'priority', label: 'Priority' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setViewMode(value)}
                  className={`v2-seg-btn ${viewMode === value ? 'active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                placeholder="Search habits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm focus:outline-none"
                style={{
                  border: '1px solid var(--border)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 400,
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  fontSize: '0.833rem',
                }}
              />
            </div>

            <button
              onClick={() => openNewModal({})}
              className="v2-btn-sm v2-btn-primary ml-auto"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Habit
            </button>
          </div>
        </div>
        {/* Soft fade */}
        <div style={{ height: 12, background: 'linear-gradient(to bottom, var(--bg), transparent)', pointerEvents: 'none' }} />
      </div>

      {/* Content Area */}
      <div className="px-4 pb-16 md:px-8" style={{ maxWidth: 920, paddingTop: 8 }}>
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ink-faint)' }} />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="v2-card v2-card-padded text-center" style={{ padding: '48px 24px' }}>
            <p className="v2-small" style={{ color: 'var(--overdue)' }}>Error loading habits: {error.message}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && (!habitsData || habitsData.habits.length === 0) && (
          <div className="v2-card text-center" style={{ padding: '48px 24px' }}>
            <p className="v2-body" style={{ color: 'var(--ink)' }}>No habits yet</p>
            <p className="v2-small" style={{ color: 'var(--ink-faint)', marginTop: 4 }}>
              Create your first habit to start tracking.
            </p>
            <button
              onClick={() => openNewModal({})}
              className="v2-btn v2-btn-primary"
              style={{ marginTop: 16 }}
            >
              New Habit
            </button>
          </div>
        )}

        {/* Habits List */}
        {!isLoading && !error && habitsData && habitsData.habits.length > 0 && (
          <div className="space-y-4">
            {groupedHabits.map((group) => (
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
