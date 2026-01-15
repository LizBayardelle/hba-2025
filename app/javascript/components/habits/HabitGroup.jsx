import React, { useState } from 'react';
import HabitCard from '../categories/HabitCard';

const HabitGroup = ({ title, icon, color, darkColor, habits, viewMode, selectedDate }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [completedCount, setCompletedCount] = useState(
    habits.filter(h => (h.today_count || 0) >= h.target_count).length
  );

  const handleCompletionChange = (delta) => {
    setCompletedCount(prev => prev + delta);
  };

  return (
    <div className="mb-8">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-2 py-3 mb-2 flex items-center gap-3 hover:opacity-70 transition text-left"
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
          style={{ backgroundColor: color }}
        >
          <i className={`fa-solid ${icon} text-white`}></i>
        </div>
        <h2 className="text-2xl font-bold display-font flex-1" style={{ color: color }}>
          {title}
        </h2>
        <div className="flex-shrink-0">
          <i
            className="fa-solid fa-chevron-down transition-transform duration-200"
            style={{
              color: color,
              transform: !isExpanded ? 'rotate(-90deg)' : 'rotate(0deg)'
            }}
          ></i>
        </div>
      </button>

      {/* Habits List */}
      {isExpanded && (
        <div className="space-y-3">
          {habits.map((habit) => (
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HabitGroup;
