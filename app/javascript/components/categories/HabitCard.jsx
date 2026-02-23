import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useCategoryStore from '../../stores/categoryStore';
import useHabitsStore from '../../stores/habitsStore';
import useDocumentsStore from '../../stores/documentsStore';
import useListsStore from '../../stores/listsStore';

const HabitCard = ({ habit, categoryColor, categoryDarkColor, viewMode, useHabitsPage = false, isOptional = false }) => {
  // Check if habit is due today (default to true for flexible mode or if not provided)
  const isDueToday = habit.is_due_today !== false;

  // Determine schedule mode (default to 'flexible')
  const scheduleMode = habit.schedule_mode || 'flexible';

  // Check if habit is scheduled (non-flexible)
  const isScheduled = scheduleMode !== 'flexible';

  // Compute schedule description with fallback
  const getScheduleDescription = () => {
    if (habit.schedule_description) return habit.schedule_description;
    // Fallback for flexible mode
    if (scheduleMode === 'flexible') {
      return `${habit.target_count}x/${habit.frequency_type}`;
    }
    return null;
  };
  const scheduleDescription = getScheduleDescription();

  // Show schedule badge for scheduled (non-flexible) habits
  const showScheduleBadge = isScheduled && scheduleDescription;

  const queryClient = useQueryClient();
  const categoryStore = useCategoryStore();
  const habitsStore = useHabitsStore();
  const { openViewModal, openNewModal } = useDocumentsStore();
  const { openShowModal: openListShowModal } = useListsStore();

  // Use the appropriate store based on context
  const openEditModal = useHabitsPage
    ? (habitId, categoryId) => habitsStore.openEditModal(habitId, categoryId)
    : (habitId, categoryId) => categoryStore.openEditHabitModal(habitId, categoryId);

  const [count, setCount] = useState(habit.today_count || 0);
  const [streak, setStreak] = useState(habit.current_streak || 0);
  const [health, setHealth] = useState(habit.health ?? 100);
  const [celebrateKey, setCelebrateKey] = useState(0);

  // Auto-clear celebration after animation finishes
  useEffect(() => {
    if (celebrateKey > 0) {
      const timer = setTimeout(() => setCelebrateKey(0), 600);
      return () => clearTimeout(timer);
    }
  }, [celebrateKey]);

  // Increment mutation
  const incrementMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/habits/${habit.id}/completions/increment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('[name=csrf-token]').content,
        },
      });
      if (!response.ok) throw new Error('Failed to increment');
      return response.json();
    },
    onMutate: () => {
      // Optimistic update + celebrate
      setCount((prev) => prev + 1);
      setCelebrateKey((k) => k + 1);
    },
    onSuccess: (data) => {
      setCount(data.count);
      setStreak(data.streak);
      if (data.health !== undefined) setHealth(data.health);
    },
    onError: () => {
      // Revert on error
      setCount(habit.today_count || 0);
    },
  });

  // Decrement mutation
  const decrementMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/habits/${habit.id}/completions/decrement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('[name=csrf-token]').content,
        },
      });
      if (!response.ok) throw new Error('Failed to decrement');
      return response.json();
    },
    onMutate: () => {
      // Optimistic update
      setCount((prev) => Math.max(0, prev - 1));
    },
    onSuccess: (data) => {
      setCount(data.count);
      setStreak(data.streak);
      if (data.health !== undefined) setHealth(data.health);
    },
    onError: () => {
      // Revert on error
      setCount(habit.today_count || 0);
    },
  });

  const handleToggle = () => {
    if (count > 0) {
      decrementMutation.mutate();
    } else {
      incrementMutation.mutate();
    }
  };

  return (
    <div className="flex items-start gap-3">
      <div
        className="rounded-lg p-4 border hover:shadow-lg transition flex-1"
        style={{
          backgroundColor: isOptional ? '#F0F0F2' : (!isDueToday ? '#FCFCFC' : 'white'),
          borderColor: isOptional ? '#E0E0E2' : '#E8EEF1',
          boxShadow: isOptional || !isDueToday ? '0 1px 2px rgba(0, 0, 0, 0.05)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
          opacity: isDueToday ? 1 : 0.6,
        }}
      >
        <div className="flex items-start gap-3">
          {/* Completion Indicator */}
          <div className="flex-shrink-0 relative" style={{ overflow: 'visible' }}>
          {habit.target_count === 1 ? (
            // Single toggle — no spinner, trust optimistic update
            <div
              key={`bounce-${celebrateKey}`}
              style={celebrateKey > 0 ? { animation: 'celebrate-bounce 0.5s ease-out' } : undefined}
            >
              <button
                onClick={handleToggle}
                disabled={incrementMutation.isPending || decrementMutation.isPending}
                className="w-10 h-10 rounded-lg border-2 flex items-center justify-center font-bold transition hover:scale-110"
                style={{
                  borderColor: isDueToday ? categoryColor : '#9CA3AF',
                  color: count > 0 ? 'white' : (isDueToday ? categoryColor : '#9CA3AF'),
                  backgroundColor: count > 0 ? (isDueToday ? categoryColor : '#9CA3AF') : 'transparent',
                }}
              >
                <i className={`fa-solid ${count > 0 ? 'fa-check' : 'fa-plus'}`}></i>
              </button>
            </div>
          ) : (
            // Counter with +/- buttons
            <div
              key={`bounce-${celebrateKey}`}
              style={celebrateKey > 0 ? { animation: 'celebrate-bounce 0.5s ease-out' } : undefined}
            >
              <div
                className="flex items-center rounded-lg border-2 overflow-hidden"
                style={{ borderColor: isDueToday ? categoryColor : '#9CA3AF' }}
              >
                <button
                  onClick={() => decrementMutation.mutate()}
                  disabled={decrementMutation.isPending || incrementMutation.isPending}
                  className="flex-1 h-10 px-[5px] flex items-center justify-center font-bold transition hover:bg-gray-50"
                  style={{ color: isDueToday ? categoryColor : '#9CA3AF' }}
                >
                  <i className="fa-solid fa-minus"></i>
                </button>
                <div
                  className="flex-[2] h-10 px-[10px] flex items-center justify-center font-bold"
                  style={{ color: isDueToday ? categoryColor : '#9CA3AF' }}
                >
                  {count}
                </div>
                <button
                  onClick={() => incrementMutation.mutate()}
                  disabled={incrementMutation.isPending || decrementMutation.isPending}
                  className="flex-1 h-10 px-[5px] flex items-center justify-center font-bold transition hover:bg-gray-50"
                  style={{ color: isDueToday ? categoryColor : '#9CA3AF' }}
                >
                  <i className="fa-solid fa-plus"></i>
                </button>
              </div>
            </div>
          )}

          {/* Celebration glow */}
          {celebrateKey > 0 && (
            <div
              key={`glow-${celebrateKey}`}
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{
                backgroundColor: categoryColor,
                animation: 'celebrate-glow 0.55s ease-out forwards',
              }}
            />
          )}
        </div>

        {/* Habit Name & Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold" style={{ color: categoryDarkColor }}>
              {habit.name}
            </div>

            {/* Schedule badge for non-flexible habits */}
            {showScheduleBadge && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'rgba(142, 142, 147, 0.15)',
                  color: '#8E8E93',
                  fontWeight: 500,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.65rem',
                }}
              >
                {scheduleDescription}
              </span>
            )}

            {/* Importance Level icon — hidden when grouped by priority */}
            {habit.importance_level && viewMode !== 'priority' && (
              <i
                className={`${habit.importance_level.icon} text-sm flex-shrink-0`}
                style={{ color: habit.importance_level.color }}
                title={habit.importance_level.name}
              ></i>
            )}
          </div>

          {/* Badges: Category, Document, Frequency, Time, Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {/* Category badge — hidden when grouped by category */}
            {habit.category_name && viewMode !== 'category' && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                style={{ backgroundColor: categoryColor, color: 'white' }}
              >
                <i className={`fa-solid ${habit.category_icon || 'fa-folder'} text-[10px]`}></i>
                {habit.category_name}
              </span>
            )}

            {/* Document badge */}
            {habit.habit_contents && habit.habit_contents.length > 0 && (
              <button
                onClick={() => openViewModal(habit.habit_contents[0].id)}
                className="text-xs px-2 py-0.5 rounded-full font-semibold hover:opacity-70 transition cursor-pointer flex items-center gap-1 max-w-xs min-w-0"
                style={{
                  backgroundColor: categoryColor,
                  color: 'white',
                }}
                title={habit.habit_contents[0].title}
              >
                <i className="fa-solid fa-file-alt text-[10px] flex-shrink-0"></i>
                <span className="truncate min-w-0 block">{habit.habit_contents[0].title}</span>
              </button>
            )}

            {/* Not due today indicator */}
            {!isDueToday && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                style={{
                  backgroundColor: '#9CA3AF',
                  color: 'white',
                }}
              >
                <i className="fa-solid fa-calendar-xmark text-[10px]"></i>
                Not due today
              </span>
            )}

            {/* Time block badge — hidden when grouped by time */}
            {viewMode !== 'time' && habit.time_block_name &&
              habit.time_block_name.toLowerCase() !== 'anytime' && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                  style={{
                    backgroundColor: habit.time_block_color,
                    color: 'white',
                  }}
                >
                  <i className={`${habit.time_block_icon} text-[10px]`}></i>
                  {habit.time_block_name}
                </span>
              )}

            {/* Tags */}
            {habit.tags && habit.tags.length > 0 && habit.tags.map((tag) => (
              <a
                key={tag.id}
                href={`/tags?tag_id=${tag.id}`}
                className="text-xs px-2 py-0.5 rounded-full font-semibold hover:opacity-70 transition cursor-pointer flex items-center gap-1"
                style={{
                  backgroundColor: '#1D1D1F',
                  color: 'white',
                }}
              >
                <i className="fa-solid fa-tags text-[10px]"></i>
                {tag.name}
              </a>
            ))}

            {/* Checklist badge (habit's own checklist) - display only */}
            {habit.checklist_items && habit.checklist_items.length > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                style={{
                  backgroundColor: categoryColor,
                  color: 'white',
                }}
                title="Habit checklist progress"
              >
                <i className="fa-solid fa-list-check text-[10px]"></i>
                {habit.checklist_items.filter(i => i.completed).length}/{habit.checklist_items.length}
              </span>
            )}

            {/* Attached list badges */}
            {habit.list_attachments && habit.list_attachments.map((attachment) => (
              <button
                key={attachment.list_id}
                onClick={() => openListShowModal(attachment.list_id)}
                className="text-xs px-2 py-0.5 rounded-full font-semibold hover:opacity-70 transition cursor-pointer flex items-center gap-1"
                style={{
                  backgroundColor: attachment.list_category?.color || categoryColor,
                  color: 'white',
                }}
                title={`Open ${attachment.list_name}`}
              >
                <i className={`fa-solid ${attachment.list_category?.icon || 'fa-list-check'} text-[10px]`}></i>
                {attachment.list_name} ({attachment.checklist_items?.filter(i => i.completed).length || 0}/{attachment.checklist_items?.length || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Streak & Health */}
        <div className="flex-shrink-0 w-20">
          <div className="flex flex-col items-center gap-1">
            {/* Streak */}
            {streak > 0 && (
              <div className="flex items-center gap-1">
                <i className="fa-solid fa-fire text-sm" style={{ color: categoryColor }}></i>
                <span className="text-lg font-bold display-font" style={{ color: categoryColor }}>
                  {streak}
                </span>
              </div>
            )}

            {/* Health bar */}
            <div className="w-full relative">
              <div
                className="w-full h-5 rounded-full overflow-hidden"
                style={{ backgroundColor: `${categoryColor}20` }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${health}%`,
                    backgroundColor: categoryColor,
                  }}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-[10px] font-bold leading-none text-white"
                  style={{ textShadow: '0 0 3px rgba(0,0,0,0.7), 0 0 1px rgba(0,0,0,0.9)' }}
                >
                  {health}%
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Actions (outside the white card) */}
      <button
        onClick={() => openEditModal(habit.id, habit.category_id)}
        className="w-5 h-5 flex items-center justify-center transition hover:opacity-70"
        title="Edit"
      >
        <i className="fa-solid fa-pen text-sm" style={{ color: '#9CA3A8' }}></i>
      </button>
    </div>
  );
};

export default HabitCard;
