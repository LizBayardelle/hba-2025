import React from 'react';
import { useQuery } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import { categoriesApi } from '../../utils/api';
import useHabitsStore from '../../stores/habitsStore';
import HabitItem from './HabitItem';

const HabitViewModal = () => {
  const { viewModal, closeViewModal, selectedDate } = useHabitsStore();
  const { habitId, isOpen } = viewModal;

  // Fetch all categories to find the habit with full data
  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.fetchAll(),
    enabled: isOpen && !!habitId,
  });

  // Find the habit and its category
  const habitData = React.useMemo(() => {
    if (!categories.length || !habitId) return null;

    for (const category of categories) {
      const habit = category.habits?.find(h => h.id === habitId);
      if (habit) {
        return {
          habit,
          category,
        };
      }
    }
    return null;
  }, [categories, habitId]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#1D1D1F' }}></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8" style={{ color: '#DC2626' }}>
          <i className="fa-solid fa-exclamation-circle text-4xl mb-4"></i>
          <p>Error loading habit: {error.message}</p>
        </div>
      );
    }

    if (!habitData) {
      return (
        <div className="text-center py-8" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#8E8E93' }}>
          <i className="fa-solid fa-exclamation-circle text-4xl mb-4"></i>
          <p>Habit not found</p>
        </div>
      );
    }

    const { habit, category } = habitData;

    return (
      <>
        {/* Habit Card */}
        <div
          className="rounded-lg border-2 overflow-hidden"
          style={{
            borderColor: category.color,
            backgroundColor: `${category.color}10`,
          }}
        >
          <HabitItem
            habit={habit}
            categoryColor={category.color}
            categoryDarkColor={category.dark_color || '#1D1D1F'}
            isFirst={true}
            selectedDate={selectedDate}
          />
        </div>

        {/* Link to Category Page */}
        <div className="mt-6 pt-6 border-t" style={{ borderColor: 'rgba(199, 199, 204, 0.3)' }}>
          <a
            href={`/categories/${category.id}`}
            className="btn-liquid inline-flex items-center gap-2"
          >
            <i className="fa-solid fa-arrow-right"></i>
            View in Category
          </a>
        </div>
      </>
    );
  };

  const footer = (
    <>
      <button
        onClick={closeViewModal}
        className="btn-liquid"
      >
        Close
      </button>
    </>
  );

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={closeViewModal}
      title={habitData?.habit.name || 'Habit'}
      footer={footer}
    >
      {renderContent()}
    </SlideOverPanel>
  );
};

export default HabitViewModal;
