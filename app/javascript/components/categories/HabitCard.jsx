import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useCategoryStore from '../../stores/categoryStore';
import useHabitsStore from '../../stores/habitsStore';
import useDocumentsStore from '../../stores/documentsStore';
import useListsStore from '../../stores/listsStore';

const HabitCard = ({ habit, categoryColor, categoryDarkColor, viewMode, useHabitsPage = false, isOptional = false }) => {
  const isDueToday = habit.is_due_today !== false;
  const scheduleMode = habit.schedule_mode || 'flexible';
  const isScheduled = scheduleMode !== 'flexible';

  const getScheduleDescription = () => {
    if (habit.schedule_description) return habit.schedule_description;
    if (scheduleMode === 'flexible') return `${habit.target_count}x/${habit.frequency_type}`;
    return null;
  };
  const scheduleDescription = getScheduleDescription();
  const showScheduleBadge = isScheduled && scheduleDescription;

  const queryClient = useQueryClient();
  const categoryStore = useCategoryStore();
  const habitsStore = useHabitsStore();
  const { openViewModal, openNewModal } = useDocumentsStore();
  const { openShowModal: openListShowModal } = useListsStore();

  const openEditModal = useHabitsPage
    ? (habitId, categoryId) => habitsStore.openEditModal(habitId, categoryId)
    : (habitId, categoryId) => categoryStore.openEditHabitModal(habitId, categoryId);

  const [count, setCount] = useState(habit.today_count || 0);
  const [streak, setStreak] = useState(habit.current_streak || 0);
  const [health, setHealth] = useState(habit.health ?? 100);
  const [celebrateKey, setCelebrateKey] = useState(0);

  useEffect(() => {
    if (celebrateKey > 0) {
      const timer = setTimeout(() => setCelebrateKey(0), 600);
      return () => clearTimeout(timer);
    }
  }, [celebrateKey]);

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
      setCount((prev) => prev + 1);
      setCelebrateKey((k) => k + 1);
    },
    onSuccess: (data) => {
      setCount(data.count);
      setStreak(data.streak);
      if (data.health !== undefined) setHealth(data.health);
    },
    onError: () => setCount(habit.today_count || 0),
  });

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
    onMutate: () => setCount((prev) => Math.max(0, prev - 1)),
    onSuccess: (data) => {
      setCount(data.count);
      setStreak(data.streak);
      if (data.health !== undefined) setHealth(data.health);
    },
    onError: () => setCount(habit.today_count || 0),
  });

  const handleToggle = () => {
    if (count > 0) {
      decrementMutation.mutate();
    } else {
      incrementMutation.mutate();
    }
  };

  const isComplete = count >= habit.target_count;
  const isPending = incrementMutation.isPending || decrementMutation.isPending;

  return (
    <div
      className="habit-item flex items-center gap-2.5"
      style={{
        transition: 'background 0.1s ease',
        cursor: 'pointer',
        opacity: isDueToday ? 1 : 0.5,
        background: isOptional ? 'var(--hover-tint)' : 'transparent',
      }}
      onClick={() => openEditModal(habit.id, habit.category_id)}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0 relative" style={{ overflow: 'visible' }} onClick={(e) => e.stopPropagation()}>
        {habit.target_count === 1 ? (
          <button
            onClick={handleToggle}
            disabled={isPending}
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1.5px solid ${isComplete ? 'var(--ink)' : 'var(--border-hover)'}`,
              background: isComplete ? 'var(--ink)' : 'transparent',
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {isPending ? (
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.5rem', color: 'var(--ink-tertiary)' }} />
            ) : (
              <i className="fa-solid fa-check" style={{ fontSize: '0.55rem', color: 'var(--check-ink)', opacity: isComplete ? 1 : 0 }} />
            )}
          </button>
        ) : (
          /* Multi-target counter */
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => decrementMutation.mutate()}
              disabled={isPending}
              className="v2-btn-icon-sm"
              style={{ width: 18, height: 18, color: 'var(--ink-tertiary)' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.733rem',
                color: isComplete ? 'var(--ink)' : 'var(--ink-tertiary)',
                fontWeight: isComplete ? 600 : 400,
                minWidth: 28,
                textAlign: 'center',
              }}
            >
              {count}/{habit.target_count}
            </span>
            <button
              onClick={() => incrementMutation.mutate()}
              disabled={isPending}
              className="v2-btn-icon-sm"
              style={{ width: 18, height: 18, color: 'var(--ink-tertiary)' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        )}

        {/* Celebration glow */}
        {celebrateKey > 0 && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              backgroundColor: categoryColor,
              animation: 'celebrate-glow 0.55s ease-out forwards',
            }}
          />
        )}
      </div>

      {/* Category dot */}
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: categoryColor,
          flexShrink: 0,
        }}
      />

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              color: isComplete ? 'var(--ink-tertiary)' : 'var(--ink)',
              textDecoration: isComplete ? 'line-through' : 'none',
              textDecorationColor: 'var(--ink-faint)',
              transition: 'color 0.2s ease',
            }}
          >
            {habit.name}
          </span>

          {showScheduleBadge && (
            <span className="v2-badge v2-badge-neutral" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
              {scheduleDescription}
            </span>
          )}

          {!isDueToday && (
            <span className="v2-badge v2-badge-neutral" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
              Not due
            </span>
          )}

          {/* Importance level icon — hidden when grouped by priority */}
          {habit.importance_level && viewMode !== 'priority' && (
            <i
              className={`${habit.importance_level.icon} flex-shrink-0`}
              style={{ color: habit.importance_level.color, fontSize: '0.65rem' }}
              title={habit.importance_level.name}
            />
          )}
        </div>

        {/* Inline badges for contextual info */}
        <div className="flex flex-wrap items-center gap-1 mt-0.5">
          {/* Category badge — hidden when grouped by category */}
          {habit.category_name && viewMode !== 'category' && (
            <span className="v2-badge v2-badge-neutral" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
              {habit.category_name}
            </span>
          )}

          {/* Document */}
          {habit.habit_contents && habit.habit_contents.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); openViewModal(habit.habit_contents[0].id); }}
              style={{ color: 'var(--ink-faint)', fontSize: '0.7rem', background: 'none', border: 'none', cursor: 'pointer' }}
              title={habit.habit_contents[0].title}
            >
              <i className="fa-solid fa-file-alt" />
            </button>
          )}

          {/* Attached lists */}
          {habit.list_attachments && habit.list_attachments.map((attachment) => (
            <button
              key={attachment.list_id}
              onClick={(e) => { e.stopPropagation(); openListShowModal(attachment.list_id); }}
              style={{ color: 'var(--ink-faint)', fontSize: '0.7rem', background: 'none', border: 'none', cursor: 'pointer' }}
              title={attachment.list_name}
            >
              <i className="fa-solid fa-list-check" />
            </button>
          ))}

          {/* Tags */}
          {habit.tags && habit.tags.length > 0 && habit.tags.map((tag) => (
            <a
              key={tag.id}
              href={`/tags?tag_id=${tag.id}`}
              onClick={(e) => e.stopPropagation()}
              className="v2-badge v2-badge-neutral"
              style={{ fontSize: '0.6rem', padding: '1px 6px', textDecoration: 'none' }}
            >
              {tag.name}
            </a>
          ))}

          {/* Time block — hidden when grouped by time */}
          {viewMode !== 'time' && habit.time_block_name && habit.time_block_name.toLowerCase() !== 'anytime' && (
            <span className="v2-badge v2-badge-neutral" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
              {habit.time_block_name}
            </span>
          )}
        </div>
      </div>

      {/* Meta: streak + health */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {streak > 0 && (
          <div className="flex items-center gap-1" style={{ fontSize: '0.733rem', fontWeight: 500, color: categoryColor }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-1.5 0-5-1-7-5.5S3 8 3 8s3.5 2 6 .5S12 3 12 1c0 2 .5 5.5 3 7S21 8 21 8s-1 9-3 13.5S13.5 23 12 23z"/></svg>
            <span>{streak}</span>
          </div>
        )}

        <div className="flex items-center gap-1" style={{ fontSize: '0.6rem', color: health > 0 ? categoryColor : 'var(--ink-faint)' }}>
          <i className="fa-solid fa-heart-pulse" style={{ fontSize: '0.55rem' }} />
          <span>{health}%</span>
        </div>
      </div>
    </div>
  );
};

export default HabitCard;
