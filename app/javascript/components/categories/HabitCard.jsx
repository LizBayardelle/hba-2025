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

  const importanceSymbol = {
    critical: '!!',
    important: '!',
    optional: '?',
  }[habit.importance];

  return (
    <div className="flex items-center gap-3">
      <div
        className="bg-white rounded-xl shadow-md px-6 py-4 hover:shadow-lg transition flex-1"
        style={{ borderLeft: `4px solid ${categoryColor}` }}
      >
        <div className="flex items-start gap-3">
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

            {/* Importance badge */}
            {importanceSymbol && (
              <div
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: categoryColor, color: 'white' }}
              >
                {importanceSymbol}
              </div>
            )}
          </div>

          {/* Frequency and time info */}
          <div className="text-xs font-light flex items-center gap-2" style={{ color: '#657b84' }}>
            {/* Document icon */}
            {habit.habit_contents && habit.habit_contents.length > 0 && (
              <>
                <button
                  onClick={() => openViewModal(habit.habit_contents[0].id)}
                  className="text-sm hover:opacity-70 transition flex-shrink-0"
                  style={{ color: categoryColor }}
                  title="View attached content"
                >
                  <i className="fa-solid fa-file-alt"></i>
                </button>
                <span>•</span>
              </>
            )}
            <span>
              {habit.target_count} {habit.target_count === 1 ? 'time' : 'times'}
            </span>
            {habit.time_of_day &&
              !['anytime', 'any'].includes(habit.time_of_day.toLowerCase()) && (
                <>
                  <span>•</span>
                  <span>
                    {habit.time_of_day.toLowerCase() === 'night'
                      ? 'Night'
                      : habit.time_of_day.toUpperCase()}
                  </span>
                </>
              )}
          </div>

          {/* Tags */}
          {habit.tags && habit.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {habit.tags.map((tag) => (
                <a
                  key={tag.id}
                  href={`/tags?tag_id=${tag.id}`}
                  className="text-xs px-2 py-1 rounded-full font-semibold hover:opacity-70 transition cursor-pointer flex items-center gap-1"
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
          )}
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
      </div>

      {/* Actions (outside card, stacked on right) */}
      <div className="flex flex-col gap-2">
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
