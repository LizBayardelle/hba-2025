import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useCategoryStore from '../../stores/categoryStore';
import useDocumentsStore from '../../stores/documentsStore';

const HabitCard = ({ habit, categoryColor, categoryDarkColor }) => {
  const queryClient = useQueryClient();
  const { openEditHabitModal } = useCategoryStore();
  const { openViewModal, openNewModal } = useDocumentsStore();

  const [count, setCount] = useState(habit.today_count || 0);
  const [streak, setStreak] = useState(habit.current_streak || 0);

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
      // Optimistic update
      setCount((prev) => prev + 1);
    },
    onSuccess: (data) => {
      setCount(data.count);
      setStreak(data.streak);
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
    <div
      className="px-6 py-4 transition flex items-center gap-3"
    >
      <div className="flex items-start gap-3 flex-1">
        {/* Completion Indicator */}
        <div className="flex-shrink-0">
          {habit.target_count === 1 ? (
            // Single toggle button
            <button
              onClick={handleToggle}
              disabled={incrementMutation.isPending || decrementMutation.isPending}
              className="w-10 h-10 rounded-lg border-2 flex items-center justify-center font-bold transition hover:scale-110"
              style={{
                borderColor: categoryColor,
                color: count > 0 ? 'white' : categoryColor,
                backgroundColor: count > 0 ? categoryColor : 'transparent',
              }}
            >
              <i className={`fa-solid ${count > 0 ? 'fa-check' : 'fa-plus'}`}></i>
            </button>
          ) : (
            // Counter with +/- buttons
            <div
              className="flex items-center rounded-lg border-2 overflow-hidden"
              style={{ borderColor: categoryColor }}
            >
              <button
                onClick={() => decrementMutation.mutate()}
                disabled={decrementMutation.isPending}
                className="flex-1 h-10 px-[5px] flex items-center justify-center font-bold transition hover:bg-gray-50"
                style={{ color: categoryColor }}
              >
                <i className="fa-solid fa-minus"></i>
              </button>
              <div
                className="flex-[2] h-10 px-[10px] flex items-center justify-center font-bold"
                style={{ color: categoryColor }}
              >
                {count}
              </div>
              <button
                onClick={() => incrementMutation.mutate()}
                disabled={incrementMutation.isPending}
                className="flex-1 h-10 px-[5px] flex items-center justify-center font-bold transition hover:bg-gray-50"
                style={{ color: categoryColor }}
              >
                <i className="fa-solid fa-plus"></i>
              </button>
            </div>
          )}
        </div>

        {/* Habit Name & Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold" style={{ color: categoryDarkColor }}>
              {habit.name}
            </div>

            {/* Importance Level badge */}
            {habit.importance_level && (
              <div
                className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center"
                style={{ backgroundColor: habit.importance_level.color }}
                title={habit.importance_level.name}
              >
                <i className={`${habit.importance_level.icon} text-white text-xs`}></i>
              </div>
            )}
          </div>

          {/* Badges: Document, Frequency, Time, Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {/* Document badge */}
            {habit.habit_contents && habit.habit_contents.length > 0 && (
              <button
                onClick={() => openViewModal(habit.habit_contents[0].id)}
                className="text-xs px-2 py-0.5 rounded-full font-semibold hover:opacity-70 transition cursor-pointer flex items-center gap-1"
                style={{
                  backgroundColor: `${categoryColor}15`,
                  color: categoryColor,
                }}
                title="View attached content"
              >
                <i className="fa-solid fa-file-alt text-[10px]"></i>
                {habit.habit_contents[0].title}
              </button>
            )}

            {/* Frequency badge - skip if 1x/day (default) */}
            {!(habit.target_count === 1 && habit.frequency_type === 'day') && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                style={{
                  backgroundColor: `${categoryColor}15`,
                  color: categoryColor,
                }}
              >
                {habit.target_count}x/{habit.frequency_type}
              </span>
            )}

            {/* Time of day badge */}
            {habit.time_of_day &&
              !['anytime', 'any'].includes(habit.time_of_day.toLowerCase()) && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                  style={{
                    backgroundColor: `${categoryColor}15`,
                    color: categoryColor,
                  }}
                >
                  {habit.time_of_day.toLowerCase() === 'night'
                    ? 'Night'
                    : habit.time_of_day.toUpperCase()}
                </span>
              )}

            {/* Tags */}
            {habit.tags && habit.tags.length > 0 && habit.tags.map((tag) => (
              <a
                key={tag.id}
                href={`/tags?tag_id=${tag.id}`}
                className="text-xs px-2 py-0.5 rounded-full font-semibold hover:opacity-70 transition cursor-pointer flex items-center gap-1"
                style={{
                  backgroundColor: '#E8EEF1',
                  color: '#1d3e4c',
                }}
              >
                <i className="fa-solid fa-tags text-[10px]"></i>
                {tag.name}
              </a>
            ))}
          </div>
        </div>

        {/* Streak Badge */}
        {streak > 0 && (
          <div className="flex-shrink-0">
            <div className="flex flex-col items-center">
              <div
                className="text-2xl font-bold display-font"
                style={{ color: categoryColor }}
              >
                {streak}
              </div>
              <div className="text-xs text-gray-500 font-semibold">day streak</div>
            </div>
          </div>
        )}
      </div>

      {/* Actions (inline on the right) */}
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={openNewModal}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition"
          title="Add content"
        >
          <i className="fa-solid fa-plus-circle" style={{ color: categoryColor }}></i>
        </button>
        <button
          onClick={() => openEditHabitModal(habit.id, habit.category_id)}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition"
          title="Edit"
        >
          <i className="fa-solid fa-edit" style={{ color: categoryColor }}></i>
        </button>
      </div>
    </div>
  );
};

export default HabitCard;
