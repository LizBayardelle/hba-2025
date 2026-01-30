import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import useCategoryStore from '../../stores/categoryStore';
import HabitCard from './HabitCard';
import HabitFormModal from './HabitFormModal';
import CategoryEditModal from './CategoryEditModal';
import DocumentViewModal from '../documents/DocumentViewModal';
import DocumentFormModal from '../documents/DocumentFormModal';
import { tagsApi } from '../../utils/api';

const CategoryPage = ({ categoryId, initialSort = 'priority' }) => {
  const [groupBy, setGroupBy] = useState(initialSort);
  const { openNewHabitModal, openCategoryEditModal } = useCategoryStore();

  // Fetch category data
  const { data: categoryData, isLoading, error } = useQuery({
    queryKey: ['category', categoryId, groupBy],
    queryFn: async () => {
      const response = await fetch(`/categories/${categoryId}.json?sort=${groupBy}`);
      if (!response.ok) throw new Error('Failed to fetch category');
      return response.json();
    },
  });

  // Fetch all user tags for autocomplete
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.fetchAll,
  });

  // Fetch importance levels
  const { data: importanceLevels = [] } = useQuery({
    queryKey: ['importanceLevels'],
    queryFn: async () => {
      const response = await fetch('/settings/importance_levels');
      if (!response.ok) throw new Error('Failed to fetch importance levels');
      return response.json();
    },
  });

  // Fetch time blocks
  const { data: timeBlocks = [] } = useQuery({
    queryKey: ['timeBlocks'],
    queryFn: async () => {
      const response = await fetch('/settings/time_blocks');
      if (!response.ok) throw new Error('Failed to fetch time blocks');
      return response.json();
    },
  });

  // Color mapping for light/dark variants
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

  // Group habits based on groupBy setting
  const groupedHabits = useMemo(() => {
    const habits = categoryData?.habits || [];

    if (groupBy === 'priority') {
      // Start with all importance levels
      const groups = {};

      importanceLevels.forEach(level => {
        groups[level.id] = {
          id: level.id,
          title: level.name,
          color: level.color,
          icon: level.icon || 'fa-circle',
          rank: level.rank || 0,
          habits: [],
        };
      });

      // Add "No Priority" group
      const noImportance = { id: 'none', title: 'No Priority', habits: [], color: '#9CA3A8', icon: 'fa-circle', rank: 999 };

      habits.forEach(habit => {
        if (habit.importance_level) {
          const levelId = habit.importance_level.id;
          if (groups[levelId]) {
            groups[levelId].habits.push(habit);
          }
        } else {
          noImportance.habits.push(habit);
        }
      });

      const result = Object.values(groups).sort((a, b) => a.rank - b.rank);
      // Always show "No Priority" if there are habits without priority
      if (noImportance.habits.length > 0) {
        result.push(noImportance);
      }
      return result;
    } else if (groupBy === 'time') {
      // Start with all time blocks
      const groups = {};

      timeBlocks.forEach(block => {
        groups[block.id] = {
          id: block.id,
          title: block.name,
          color: block.color || '#9CA3A8',
          icon: block.icon || 'fa-clock',
          rank: block.rank != null ? block.rank : 999,
          habits: [],
        };
      });

      // Add "Anytime" group
      const anytime = { id: 'anytime', title: 'Anytime', habits: [], color: '#9CA3A8', icon: 'fa-clock', rank: 999 };

      habits.forEach(habit => {
        if (habit.time_block_id) {
          const blockId = habit.time_block_id;
          if (groups[blockId]) {
            groups[blockId].habits.push(habit);
          }
        } else {
          anytime.habits.push(habit);
        }
      });

      const result = Object.values(groups).sort((a, b) => a.rank - b.rank);
      // Always show "Anytime" if there are habits without time block
      if (anytime.habits.length > 0) {
        result.push(anytime);
      }
      return result;
    }

    return [{ title: 'All Habits', habits, color: '#9CA3A8', icon: 'fa-list' }];
  }, [categoryData, groupBy, importanceLevels, timeBlocks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: '#2C2C2E' }}
        ></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-xl p-12 text-center" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
          <i className="fa-solid fa-exclamation-circle text-6xl mb-4" style={{ color: '#DC2626' }}></i>
          <p style={{ color: '#DC2626', fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Error loading category: {error.message}</p>
        </div>
      </div>
    );
  }

  const { category, habits } = categoryData;
  const categoryColor = category.color;
  const colors = colorMap[categoryColor] || { light: '#E8EEF1', dark: '#1d3e4c' };

  // Format habits for DocumentFormModal (needs category_name)
  const formattedHabits = habits?.map(habit => ({
    ...habit,
    category_name: category.name,
    category_color: category.color,
  })) || [];

  // Render a group with colored stripe header
  const renderGroup = (group, index) => {
    const groupColor = group.color || '#8E8E93';
    const groupIcon = group.icon || 'fa-list';

    return (
      <div key={group.title} className={`mb-6 ${index !== 0 ? 'mt-8' : ''}`}>
        {/* Full-width colored stripe header */}
        <div
          className="-mx-8 px-8 py-4 mb-4 flex items-center gap-3"
          style={{
            background: `linear-gradient(to bottom, color-mix(in srgb, ${groupColor} 85%, white) 0%, ${groupColor} 100%)`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
        >
          <i className={`fa-solid ${groupIcon} text-white text-lg`}></i>
          <h3 className="text-3xl flex-1 text-white font-display" style={{ fontWeight: 500 }}>
            {group.title} ({group.habits.length})
          </h3>
        </div>
        {group.habits.length > 0 ? (
          <div className="space-y-3">
            {group.habits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                categoryColor={categoryColor}
                categoryDarkColor={colors.dark}
              />
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm italic" style={{ color: '#8E8E93', fontFamily: "'Inter', sans-serif" }}>
              No habits in this group
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Header Section */}
      <div style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: categoryColor, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)' }}
              >
                <i className={`fa-solid ${category.icon} text-white text-2xl`}></i>
              </div>
              <div>
                <h1 className="text-5xl font-display mb-1" style={{ color: categoryColor }}>
                  {category.name}
                </h1>
                {category.description && (
                  <p className="text-sm" style={{ color: '#8E8E93', fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>
                    {category.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => openNewHabitModal(categoryId)}
                className="px-6 py-3 rounded-lg text-white transition transform hover:scale-105"
                style={{
                  backgroundColor: categoryColor,
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
              >
                <i className="fa-solid fa-plus mr-2"></i>
                New Habit
              </button>
              <button
                onClick={() => openCategoryEditModal(categoryId)}
                className="text-xs tracking-wide hover:opacity-70 transition"
                style={{
                  color: categoryColor,
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Edit Category
              </button>
            </div>
          </div>

          {/* Group By Filter */}
          <div>
            <span className="block text-xs uppercase tracking-wide mb-2" style={{ color: '#8E8E93', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
              Group By
            </span>
            <div className="inline-flex rounded-lg overflow-hidden" style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}>
              {[
                { value: 'priority', label: 'Priority' },
                { value: 'time', label: 'Time' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setGroupBy(value)}
                  className="px-4 py-2 text-sm transition"
                  style={{
                    background: groupBy === value ? categoryColor : '#F5F5F7',
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
        </div>
      </div>

      {/* Content Area */}
      <div className="px-8 pb-8">
        {/* Habits Groups */}
        {habits && habits.length > 0 ? (
          groupedHabits.map((group, index) => renderGroup(group, index))
        ) : (
          <div className="rounded-xl p-12 text-center mt-6" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
            <i
              className="fa-solid fa-clipboard-list text-6xl mb-4"
              style={{ color: '#E5E5E7' }}
            ></i>
            <h3 className="text-xl mb-2" style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
              No Habits Yet
            </h3>
            <p className="mb-4" style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
              Start tracking your {category.name.toLowerCase()} habits!
            </p>
            <button
              onClick={() => openNewHabitModal(categoryId)}
              className="inline-block px-6 py-3 rounded-lg text-white transition transform hover:scale-105"
              style={{ backgroundColor: categoryColor, fontWeight: 600, fontFamily: "'Inter', sans-serif", boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
            >
              <i className="fa-solid fa-plus mr-2"></i>
              Add First Habit
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <HabitFormModal categoryColor={categoryColor} />
      <CategoryEditModal />
      <DocumentViewModal />
      <DocumentFormModal habits={formattedHabits} allTags={allTags} />
    </>
  );
};

export default CategoryPage;
