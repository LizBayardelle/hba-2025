import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import useDocumentsStore from '../../stores/documentsStore';
import useHabitsStore from '../../stores/habitsStore';

const HabitItem = ({ habit, categoryColor, categoryDarkColor, isFirst, onCompletionChange, selectedDate }) => {
  const { openViewModal } = useDocumentsStore();
  const { openEditModal } = useHabitsStore();

  const [count, setCount] = useState(habit.today_count || 0);
  const [streak, setStreak] = useState(habit.current_streak || 0);

  // Update local state when habit data changes (e.g., when navigating to different dates)
  useEffect(() => {
    setCount(habit.today_count || 0);
    setStreak(habit.current_streak || 0);
  }, [habit.today_count, habit.current_streak]);

  // Increment mutation
  const incrementMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/habits/${habit.id}/completions/increment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('[name=csrf-token]').content,
        },
        body: JSON.stringify({ date: selectedDate }),
      });
      if (!response.ok) throw new Error('Failed to increment');
      return response.json();
    },
    onMutate: () => {
      const wasComplete = count >= habit.target_count;
      const newCount = count + 1;
      setCount(newCount);
      const isComplete = newCount >= habit.target_count;
      if (wasComplete !== isComplete && onCompletionChange) {
        onCompletionChange(isComplete ? 1 : -1);
      }
    },
    onSuccess: (data) => {
      setCount(data.count);
      setStreak(data.streak);
    },
    onError: () => {
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
        body: JSON.stringify({ date: selectedDate }),
      });
      if (!response.ok) throw new Error('Failed to decrement');
      return response.json();
    },
    onMutate: () => {
      const wasComplete = count >= habit.target_count;
      const newCount = Math.max(0, count - 1);
      setCount(newCount);
      const isComplete = newCount >= habit.target_count;
      if (wasComplete !== isComplete && onCompletionChange) {
        onCompletionChange(isComplete ? 1 : -1);
      }
    },
    onSuccess: (data) => {
      setCount(data.count);
      setStreak(data.streak);
    },
    onError: () => {
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

  const handleEdit = (e) => {
    e.stopPropagation();
    openEditModal(habit.id, habit.category_id);
  };

  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex-1 p-4 transition ${!isFirst ? 'border-t' : ''}`}
        style={!isFirst ? { borderColor: categoryColor } : {}}
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
              {incrementMutation.isPending || decrementMutation.isPending ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className={`fa-solid ${count > 0 ? 'fa-check' : 'fa-plus'}`}></i>
              )}
            </button>
          ) : (
            // Counter with +/- buttons
            <div
              className="flex items-center rounded-lg border-2 overflow-hidden"
              style={{ borderColor: categoryColor }}
            >
              <button
                onClick={() => decrementMutation.mutate()}
                disabled={decrementMutation.isPending || incrementMutation.isPending}
                className="flex-1 h-10 px-[5px] flex items-center justify-center font-bold transition hover:bg-gray-50"
                style={{ color: categoryColor }}
              >
                {decrementMutation.isPending ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-minus"></i>
                )}
              </button>
              <div
                className="flex-[2] h-10 px-[10px] flex items-center justify-center font-bold"
                style={{ color: categoryColor }}
              >
                {incrementMutation.isPending || decrementMutation.isPending ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  count
                )}
              </div>
              <button
                onClick={() => incrementMutation.mutate()}
                disabled={incrementMutation.isPending || decrementMutation.isPending}
                className="flex-1 h-10 px-[5px] flex items-center justify-center font-bold transition hover:bg-gray-50"
                style={{ color: categoryColor }}
              >
                {incrementMutation.isPending ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-plus"></i>
                )}
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
            {habit.documents && habit.documents.length > 0 && (
              <button
                onClick={() => openViewModal(habit.documents[0].id)}
                className="text-xs px-2 py-0.5 rounded-full font-semibold hover:opacity-70 transition cursor-pointer flex items-center gap-1"
                style={{
                  backgroundColor: `${categoryColor}15`,
                  color: categoryColor,
                }}
                title="View attached content"
              >
                <i className="fa-solid fa-file-alt text-[10px]"></i>
                {habit.documents[0].title}
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

            {/* Time block badge */}
            {habit.time_block_name &&
              habit.time_block_name.toLowerCase() !== 'anytime' && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                  style={{
                    backgroundColor: `${habit.time_block_color}20`,
                    color: habit.time_block_color,
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
              {/* Show semi-transparent if not completed, full opacity if completed */}
              <div
                className={`text-2xl font-bold display-font transition-opacity ${
                  count >= habit.target_count ? 'opacity-100' : 'opacity-30'
                }`}
                style={{ color: categoryColor }}
              >
                {streak}
              </div>
              <div
                className={`text-xs font-semibold transition-opacity ${
                  count >= habit.target_count ? 'opacity-100' : 'opacity-40'
                }`}
                style={{ color: '#657b84' }}
              >
                day streak
              </div>
            </div>
          </div>
        )}

        </div>
      </div>

      {/* Edit button outside card on right */}
      <button
        onClick={handleEdit}
        className="w-5 h-5 flex items-center justify-center transition hover:opacity-70 mt-4"
        title="Edit"
      >
        <i className="fa-solid fa-pen text-sm" style={{ color: '#9CA3A8' }}></i>
      </button>
    </div>
  );
};

export default HabitItem;
