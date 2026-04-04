import React from 'react';
import HabitCard from '../categories/HabitCard';
import useHabitsStore from '../../stores/habitsStore';

const HabitGroup = ({ groupId, title, icon, color, darkColor, habits, viewMode, selectedDate, isFirst = false, hideHeader = false }) => {
  const { openNewModal } = useHabitsStore();

  // Sort habits: due habits first, then non-due; within each group: non-optional first, then optional
  const sortedHabits = [...habits].sort((a, b) => {
    const aIsDue = a.is_due_today !== false;
    const bIsDue = b.is_due_today !== false;
    if (aIsDue && !bIsDue) return -1;
    if (!aIsDue && bIsDue) return 1;

    const aIsOptional = a.importance_level?.name === 'Optional';
    const bIsOptional = b.importance_level?.name === 'Optional';
    if (aIsOptional && !bIsOptional) return 1;
    if (!aIsOptional && bIsOptional) return -1;
    return 0;
  });

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

  const habitCards = sortedHabits.map((habit) => (
    <HabitCard
      key={habit.id}
      habit={{
        ...habit,
        today_count: habit.today_count || 0,
        current_streak: habit.current_streak || 0,
      }}
      categoryColor={viewMode === 'category' ? color : habit.category_color}
      categoryDarkColor={viewMode === 'category' ? darkColor : habit.category_dark_color}
      viewMode={viewMode}
      useHabitsPage={true}
      isOptional={habit.importance_level?.name === 'Optional'}
    />
  ));

  // No grouping — flat list in a card
  if (hideHeader) {
    return (
      <div className="v2-card" style={{ padding: 0 }}>
        {habitCards}
      </div>
    );
  }

  // Grouped — v2 card with section label header
  return (
    <div className="v2-card" style={{ padding: 0 }}>
      {/* Group header */}
      <div className="v2-section-header" style={{ padding: '12px 18px 8px' }}>
        <div className="flex items-center gap-2">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
            }}
          />
          <span className="v2-section-title">{title}</span>
          <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>
            {habits.length}
          </span>
        </div>
        <button
          onClick={handleNewHabit}
          className="v2-btn-icon-sm"
          title="New habit"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>

      {/* Habits */}
      {habitCards}
    </div>
  );
};

export default HabitGroup;
