import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '../../utils/api';
import useGoalsStore from '../../stores/goalsStore';
import useListsStore from '../../stores/listsStore';
import ProgressThermometer from './ProgressThermometer';

const GoalItem = ({ goal }) => {
  const queryClient = useQueryClient();
  const { openViewModal, openEditModal } = useGoalsStore();
  const { openShowModal: openListShowModal } = useListsStore();
  const [particles, setParticles] = useState([]);
  const [pulseKey, setPulseKey] = useState(0);

  const incrementMutation = useMutation({
    mutationFn: () => goalsApi.increment(goal.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
    },
  });

  const handleClick = () => {
    openViewModal(goal.id);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    openEditModal(goal.id);
  };

  const handleIncrement = useCallback((e) => {
    e.stopPropagation();
    if (incrementMutation.isPending) return;

    // Spawn floating +1 particles
    const id = Date.now();
    const newParticles = [
      { id, x: -8 + Math.random() * 16, delay: 0 },
      { id: id + 1, x: -12 + Math.random() * 24, delay: 80 },
      { id: id + 2, x: -6 + Math.random() * 12, delay: 160 },
    ];
    setParticles(prev => [...prev, ...newParticles]);
    setPulseKey(k => k + 1);

    // Clean up particles after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 900);

    incrementMutation.mutate();
  }, [incrementMutation]);

  const themeColor = '#1d3e4c';
  const categoryColor = goal.category?.color || themeColor;

  const getCountLabel = () => {
    if (goal.goal_type === 'counted') {
      return `${goal.current_count}/${goal.target_count}${goal.unit_name ? ' ' + goal.unit_name : ''}`;
    } else {
      const total = goal.checklist_items?.length || 0;
      const completed = goal.checklist_items?.filter(i => i.completed).length || 0;
      return `${completed}/${total} steps`;
    }
  };

  // Inject keyframe animation styles once
  useEffect(() => {
    if (document.getElementById('goal-increment-styles')) return;
    const style = document.createElement('style');
    style.id = 'goal-increment-styles';
    style.textContent = `
      @keyframes goalParticleFloat {
        0% { opacity: 1; transform: translateY(0) scale(1); }
        50% { opacity: 0.9; transform: translateY(-28px) scale(1.15); }
        100% { opacity: 0; transform: translateY(-52px) scale(0.7); }
      }
      @keyframes goalBtnPulse {
        0% { transform: scale(1); }
        30% { transform: scale(1.18); }
        60% { transform: scale(0.95); }
        100% { transform: scale(1); }
      }
      @keyframes goalRingBurst {
        0% { transform: scale(0.6); opacity: 0.7; }
        100% { transform: scale(2.2); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-xl border shadow-md hover:shadow-lg transition-shadow cursor-pointer flex overflow-hidden"
      style={{
        borderColor: '#E8EEF1',
        opacity: goal.completed ? 0.65 : 1,
        minHeight: 140,
      }}
    >
      {/* Left 1/3 — Thermometer panel */}
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: '28%',
          minWidth: 90,
          maxWidth: 130,
          background: `linear-gradient(180deg, ${categoryColor}12 0%, ${categoryColor}25 100%)`,
          borderRight: `3px solid ${categoryColor}30`,
        }}
      >
        <ProgressThermometer
          progress={goal.progress}
          color={categoryColor}
          size="card"
        />
      </div>

      {/* Right 2/3 — Details */}
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        {/* Top: name + edit */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4
            className={`text-xl font-display leading-tight ${goal.completed ? 'line-through' : ''}`}
            style={{ color: categoryColor }}
          >
            {goal.name}
          </h4>
          <button
            onClick={handleEdit}
            className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-md transition hover:bg-gray-100"
            title="Edit"
          >
            <i className="fa-solid fa-pen text-xs" style={{ color: '#9CA3A8' }}></i>
          </button>
        </div>

        {/* Middle: badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {/* Goal Type */}
          <div
            className="px-2 py-0.5 rounded-md text-xs font-medium"
            style={{ backgroundColor: themeColor, color: 'white' }}
          >
            {goal.goal_type === 'counted' && !goal.unit_name && <i className="fa-solid fa-hashtag mr-1"></i>}
            {goal.goal_type !== 'counted' && <i className="fa-solid fa-list-ol mr-1"></i>}
            {goal.goal_type === 'counted' ? (goal.unit_name ? `# of ${goal.unit_name}` : 'Counted') : 'Steps'}
          </div>

          {/* Category */}
          {goal.category && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
              style={{ backgroundColor: themeColor, color: 'white' }}
            >
              <i className={`fa-solid ${goal.category.icon} text-[10px]`}></i>
              <span>{goal.category.name}</span>
            </div>
          )}

          {/* Importance Level */}
          {goal.importance_level && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
              style={{ backgroundColor: themeColor, color: 'white' }}
            >
              <i className={`${goal.importance_level.icon} text-[10px]`}></i>
              <span>{goal.importance_level.name}</span>
            </div>
          )}

          {/* Time Block */}
          {goal.time_block && goal.time_block.name.toLowerCase() !== 'anytime' && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
              style={{ backgroundColor: themeColor, color: 'white' }}
            >
              <i className={`${goal.time_block.icon} text-[10px]`}></i>
              <span>{goal.time_block.name}</span>
            </div>
          )}

          {/* Tags */}
          {goal.tags?.map(tag => (
            <div
              key={tag.id}
              className="px-2 py-0.5 rounded-md text-xs font-medium"
              style={{ backgroundColor: themeColor, color: 'white' }}
            >
              <i className="fa-solid fa-tag mr-1 text-[10px]"></i>
              {tag.name}
            </div>
          ))}

          {/* Attached lists */}
          {goal.list_attachments?.map((attachment) => (
            <button
              key={attachment.list_id}
              onClick={(e) => {
                e.stopPropagation();
                openListShowModal(attachment.list_id);
              }}
              className="px-2 py-0.5 rounded-md text-xs font-medium hover:opacity-70 transition flex items-center gap-1"
              style={{ backgroundColor: themeColor, color: 'white' }}
              title={`Open ${attachment.list_name}`}
            >
              <i className="fa-solid fa-list-check text-[10px]"></i>
              {attachment.list_name}
            </button>
          ))}
        </div>

        {/* Bottom: increment button with count underneath, or completed badge */}
        <div className="flex items-end justify-between">
          <div />

          {/* +1 Button — category-colored, prominent, with animations */}
          {goal.goal_type === 'counted' && !goal.completed && (
            <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                {/* Floating +1 particles */}
                {particles.map((p) => (
                  <div
                    key={p.id}
                    className="absolute pointer-events-none select-none"
                    style={{
                      bottom: '100%',
                      left: `calc(50% + ${p.x}px)`,
                      transform: 'translateX(-50%)',
                      animation: 'goalParticleFloat 0.8s ease-out forwards',
                      animationDelay: `${p.delay}ms`,
                      opacity: 0,
                      fontWeight: 800,
                      fontSize: '0.875rem',
                      color: categoryColor,
                      textShadow: `0 1px 4px ${categoryColor}66`,
                      zIndex: 10,
                    }}
                  >
                    +1
                  </div>
                ))}

                {/* Ring burst on click */}
                {pulseKey > 0 && (
                  <div
                    key={`ring-${pulseKey}`}
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                      border: `2px solid ${categoryColor}80`,
                      animation: 'goalRingBurst 0.5s ease-out forwards',
                    }}
                  />
                )}

                <button
                  onClick={handleIncrement}
                  disabled={incrementMutation.isPending}
                  className="relative rounded-xl font-bold text-white transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 px-4 py-2"
                  style={{
                    background: `linear-gradient(135deg, ${categoryColor} 0%, ${categoryColor}CC 100%)`,
                    boxShadow: `0 2px 8px ${categoryColor}40`,
                    fontSize: '0.9375rem',
                    fontFamily: "'Inter', sans-serif",
                    animation: pulseKey > 0 ? 'goalBtnPulse 0.4s ease-out' : 'none',
                  }}
                >
                  {incrementMutation.isPending ? (
                    <i className="fa-solid fa-spinner fa-spin text-sm"></i>
                  ) : (
                    <>
                      <i className="fa-solid fa-plus text-sm"></i>
                      <span>1</span>
                    </>
                  )}
                </button>
              </div>

              {/* Count readout right below the button */}
              <div className="mt-1.5 text-xs font-semibold" style={{ color: '#8E8E93', fontFamily: "'Inter', sans-serif" }}>
                {getCountLabel()}
              </div>
            </div>
          )}

          {/* Steps count for named_steps goals */}
          {goal.goal_type === 'named_steps' && !goal.completed && (
            <div className="text-xs font-semibold" style={{ color: '#8E8E93', fontFamily: "'Inter', sans-serif" }}>
              {getCountLabel()}
            </div>
          )}

          {/* Completed badge for finished goals */}
          {goal.completed && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: '#D7EDCB', color: '#4A6B27' }}
            >
              <i className="fa-solid fa-check-circle"></i>
              Complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalItem;
