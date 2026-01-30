import React from 'react';
import HabitCard from '../categories/HabitCard';
import useHabitsStore from '../../stores/habitsStore';

const HabitGroup = ({ groupId, title, icon, color, darkColor, habits, viewMode, selectedDate, isFirst = false }) => {
  const { openNewModal } = useHabitsStore();

  // Sort habits: due habits first, then non-due; within each group: non-optional first, then optional
  const sortedHabits = [...habits].sort((a, b) => {
    // First sort by due status
    const aIsDue = a.is_due_today !== false;
    const bIsDue = b.is_due_today !== false;

    if (aIsDue && !bIsDue) return -1;
    if (!aIsDue && bIsDue) return 1;

    // Then sort by optional status
    const aIsOptional = a.importance_level?.name === 'Optional';
    const bIsOptional = b.importance_level?.name === 'Optional';

    if (aIsOptional && !bIsOptional) return 1;
    if (!aIsOptional && bIsOptional) return -1;
    return 0;
  });

  // Handle new habit button click based on view mode
  const handleNewHabit = () => {
    if (viewMode === 'category' && groupId && typeof groupId === 'number') {
      openNewModal({ categoryId: groupId });
    } else if (viewMode === 'time' && groupId && typeof groupId === 'number') {
      openNewModal({ timeBlockId: groupId });
    } else if (viewMode === 'priority' && groupId && typeof groupId === 'number') {
      openNewModal({ importanceLevelId: groupId });
    } else {
      openNewModal({});
    }
  };

  return (
    <div className={`mb-6 ${!isFirst ? 'mt-8' : '-mt-6'}`}>
      {/* Full-width colored stripe header - breaks out of parent padding */}
      <div
        className="-mx-8 px-8 py-4 mb-4 flex items-center gap-3"
        style={{
          background: `linear-gradient(to bottom, color-mix(in srgb, ${color} 85%, white) 0%, ${color} 100%)`,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
      >
        <i className={`fa-solid ${icon} text-white text-lg`}></i>
        <h2 className="text-3xl flex-1 text-white font-display" style={{ fontWeight: 500 }}>
          {title}
        </h2>
        <button
          onClick={handleNewHabit}
          className="w-8 h-8 rounded-md flex items-center justify-center transition btn-glass"
          title={`New habit`}
        >
          <i className="fa-solid fa-plus text-white"></i>
        </button>
      </div>

      {/* Habits List */}
      <div className="space-y-3">
        {sortedHabits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={{
              ...habit,
              today_count: habit.today_count || 0,
              current_streak: habit.current_streak || 0,
            }}
            categoryColor={viewMode === 'category' ? color : habit.category_color}
            categoryDarkColor={viewMode === 'category' ? darkColor : habit.category_dark_color}
            useHabitsPage={true}
            isOptional={habit.importance_level?.name === 'Optional'}
          />
        ))}
      </div>
    </div>
  );
};

export default HabitGroup;
