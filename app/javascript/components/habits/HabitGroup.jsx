import React, { useState } from 'react';
import HabitItem from './HabitItem';

const HabitGroup = ({ title, icon, color, darkColor, habits, viewMode, selectedDate }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [completedCount, setCompletedCount] = useState(
    habits.filter(h => (h.today_count || 0) >= h.target_count).length
  );

  const handleCompletionChange = (delta) => {
    setCompletedCount(prev => prev + delta);
  };

  return (
    <div
      className="bg-white rounded-xl shadow-lg overflow-hidden border"
      style={{ borderColor: color }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full p-4 flex items-center gap-3 hover:opacity-90 transition text-left ${isExpanded ? 'border-b' : ''}`}
        style={{ backgroundColor: `${color}20`, borderColor: color }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
          style={{ backgroundColor: color }}
        >
          <i className={`fa-solid ${icon} text-white`}></i>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold display-font" style={{ color: darkColor }}>
            {title}
          </h2>
          <p className="text-xs font-light" style={{ color: darkColor }}>
            {completedCount}/{habits.length} completed
          </p>
        </div>
        <div className="flex-shrink-0">
          <i
            className={`fa-solid fa-chevron-down transition-transform duration-200 ${!isExpanded ? '-rotate-90' : ''}`}
            style={{ color: darkColor }}
          ></i>
        </div>
      </button>

      {/* Habits List */}
      {isExpanded && (
        <div>
          {habits.map((habit, index) => (
            <HabitItem
              key={habit.id}
              habit={habit}
              categoryColor={viewMode === 'category' ? color : habit.category_color}
              categoryDarkColor={viewMode === 'category' ? darkColor : habit.category_dark_color}
              isFirst={index === 0}
              onCompletionChange={handleCompletionChange}
              selectedDate={selectedDate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HabitGroup;
