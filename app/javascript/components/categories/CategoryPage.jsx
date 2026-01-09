import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useCategoryStore from '../../stores/categoryStore';
import HabitCard from './HabitCard';
import HabitFormModal from './HabitFormModal';
import CategoryEditModal from './CategoryEditModal';
import DocumentViewModal from '../documents/DocumentViewModal';
import DocumentFormModal from '../documents/DocumentFormModal';
import { tagsApi } from '../../utils/api';

const CategoryPage = ({ categoryId, initialSort = 'priority' }) => {
  const [sortBy, setSortBy] = useState(initialSort);
  const { openNewHabitModal, openCategoryEditModal } = useCategoryStore();

  // Fetch category data
  const { data: categoryData, isLoading, error } = useQuery({
    queryKey: ['category', categoryId, sortBy],
    queryFn: async () => {
      const response = await fetch(`/categories/${categoryId}.json?sort=${sortBy}`);
      if (!response.ok) throw new Error('Failed to fetch category');
      return response.json();
    },
  });

  // Fetch all user tags for autocomplete
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.fetchAll,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: '#1d3e4c' }}
        ></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <i
            className="fa-solid fa-exclamation-circle text-6xl mb-4"
            style={{ color: '#DC2626' }}
          ></i>
          <p style={{ color: '#DC2626' }}>Error loading category: {error.message}</p>
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

  return (
    <>
      {/* Header Section */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="p-8 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center shadow-lg"
                style={{ backgroundColor: categoryColor }}
              >
                <i className={`fa-solid ${category.icon} text-white text-xl`}></i>
              </div>
              <div>
                <h1
                  className="text-4xl font-bold display-font mb-1"
                  style={{ color: categoryColor }}
                >
                  {category.name}
                </h1>
                <p className="text-sm font-light" style={{ color: '#657b84' }}>
                  {category.description || 'Track Your Habits'}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <button
                onClick={() => openNewHabitModal(categoryId)}
                className="px-4 py-2 rounded-lg text-white font-semibold shadow-md hover:shadow-lg transition transform hover:scale-[1.02]"
                style={{ backgroundColor: categoryColor }}
              >
                <i className="fa-solid fa-plus mr-2"></i>Add Habit
              </button>
              <button
                onClick={() => openCategoryEditModal(categoryId)}
                className="text-sm font-light hover:opacity-70 transition"
                style={{ color: categoryColor }}
              >
                <i className="fa-solid fa-pen-to-square mr-2"></i>Edit Category
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-8 pt-6">
        {/* Habits Section Header with Sort */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold display-font" style={{ color: colors.dark }}>
            Habits
          </h2>

          {/* Sort Toggle */}
          <div className="flex gap-1 bg-white p-0.5 rounded-lg shadow-sm">
            <button
              onClick={() => setSortBy('priority')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                sortBy === 'priority' ? 'shadow-sm' : 'hover:bg-gray-100'
              }`}
              style={
                sortBy === 'priority'
                  ? { backgroundColor: colors.light, color: colors.dark }
                  : { color: colors.dark }
              }
            >
              <i className="fa-solid fa-star mr-1"></i>Priority
            </button>
            <button
              onClick={() => setSortBy('time')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                sortBy === 'time' ? 'shadow-sm' : 'hover:bg-gray-100'
              }`}
              style={
                sortBy === 'time'
                  ? { backgroundColor: colors.light, color: colors.dark }
                  : { color: colors.dark }
              }
            >
              <i className="fa-solid fa-clock mr-1"></i>Time
            </button>
          </div>
        </div>

        {/* Habits Grid */}
        {habits && habits.length > 0 ? (
          <div className="grid gap-4">
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                categoryColor={categoryColor}
                categoryDarkColor={colors.dark}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <i
              className="fa-solid fa-check-circle text-6xl mb-4"
              style={{ color: `${categoryColor}40` }}
            ></i>
            <p className="text-gray-500 font-light">
              No habits yet. Click "Add Habit" to get started!
            </p>
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
