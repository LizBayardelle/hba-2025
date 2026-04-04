import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '../../utils/api';
import useGoalsStore from '../../stores/goalsStore';
import useListsStore from '../../stores/listsStore';
import ProgressThermometer from './ProgressThermometer';

const GoalItem = ({ goal, groupBy }) => {
  const queryClient = useQueryClient();
  const { openViewModal, openEditModal } = useGoalsStore();
  const { openShowModal: openListShowModal } = useListsStore();
  const [particles, setParticles] = useState([]);
  const [pulseKey, setPulseKey] = useState(0);

  const incrementMutation = useMutation({
    mutationFn: () => goalsApi.increment(goal.id),
    onSuccess: () => queryClient.invalidateQueries(['goals']),
  });

  const handleIncrement = useCallback((e) => {
    e.stopPropagation();
    if (incrementMutation.isPending) return;
    const id = Date.now();
    setParticles(prev => [...prev, { id, x: -8 + Math.random() * 16, delay: 0 }, { id: id + 1, x: -12 + Math.random() * 24, delay: 80 }, { id: id + 2, x: -6 + Math.random() * 12, delay: 160 }]);
    setPulseKey(k => k + 1);
    setTimeout(() => setParticles(prev => prev.filter(p => p.id < id || p.id > id + 2)), 900);
    incrementMutation.mutate();
  }, [incrementMutation]);

  useEffect(() => {
    if (document.getElementById('goal-increment-styles')) return;
    const style = document.createElement('style');
    style.id = 'goal-increment-styles';
    style.textContent = `
      @keyframes goalParticleFloat { 0% { opacity: 1; transform: translateY(0) scale(1); } 50% { opacity: 0.9; transform: translateY(-28px) scale(1.15); } 100% { opacity: 0; transform: translateY(-52px) scale(0.7); } }
      @keyframes goalBtnPulse { 0% { transform: scale(1); } 30% { transform: scale(1.18); } 60% { transform: scale(0.95); } 100% { transform: scale(1); } }
      @keyframes goalRingBurst { 0% { transform: scale(0.6); opacity: 0.7; } 100% { transform: scale(2.2); opacity: 0; } }
    `;
    document.head.appendChild(style);
  }, []);

  const categoryColor = goal.category?.color || 'var(--ink)';

  const getCountLabel = () => {
    if (goal.goal_type === 'counted') return `${goal.current_count}/${goal.target_count}${goal.unit_name ? ' ' + goal.unit_name : ''}`;
    const total = goal.checklist_items?.length || 0;
    const completed = goal.checklist_items?.filter(i => i.completed).length || 0;
    return `${completed}/${total} steps`;
  };

  return (
    <div
      onClick={() => openViewModal(goal.id)}
      className="v2-card flex overflow-hidden cursor-pointer transition-shadow hover:shadow-sm"
      style={{ padding: 0, opacity: goal.completed ? 0.6 : 1, minHeight: 120 }}
    >
      {/* Left — Thermometer */}
      <div className="flex items-center justify-center flex-shrink-0"
        style={{ width: '25%', minWidth: 80, maxWidth: 110, background: 'var(--hover-tint)', borderRight: '1px solid var(--border)' }}>
        <ProgressThermometer progress={goal.progress} color={categoryColor} size="card" />
      </div>

      {/* Right — Details */}
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', textDecoration: goal.completed ? 'line-through' : 'none', textDecorationColor: 'var(--ink-faint)', lineHeight: 1.3 }}>
            {goal.name}
          </h4>
          <button onClick={(e) => { e.stopPropagation(); openEditModal(goal.id); }} className="v2-btn-icon-sm" title="Edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className="v2-badge v2-badge-neutral" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
            {goal.goal_type === 'counted' ? (goal.unit_name ? `# of ${goal.unit_name}` : 'Counted') : 'Steps'}
          </span>
          {goal.category && groupBy !== 'category' && (
            <span className="v2-badge" style={{ background: `${goal.category.color}15`, color: goal.category.color, fontSize: '0.6rem', padding: '1px 6px' }}>{goal.category.name}</span>
          )}
          {goal.importance_level && groupBy !== 'importance' && (
            <i className={`${goal.importance_level.icon} flex-shrink-0`} style={{ color: goal.importance_level.color, fontSize: '0.65rem' }} title={goal.importance_level.name} />
          )}
          {goal.time_block && goal.time_block.name.toLowerCase() !== 'anytime' && (
            <span className="v2-badge v2-badge-neutral" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{goal.time_block.name}</span>
          )}
          {goal.tags?.map(tag => <span key={tag.id} className="v2-badge v2-badge-neutral" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{tag.name}</span>)}
          {goal.list_attachments?.map(a => (
            <button key={a.list_id} onClick={(e) => { e.stopPropagation(); openListShowModal(a.list_id); }}
              style={{ color: 'var(--ink-faint)', fontSize: '0.7rem', background: 'none', border: 'none', cursor: 'pointer' }} title={a.list_name}>
              <i className="fa-solid fa-list-check" />
            </button>
          ))}
        </div>

        {/* Bottom: increment or completed */}
        <div className="flex items-end justify-between">
          <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>{getCountLabel()}</span>

          {goal.goal_type === 'counted' && !goal.completed && (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              {particles.map(p => (
                <div key={p.id} className="absolute pointer-events-none select-none"
                  style={{ bottom: '100%', left: `calc(50% + ${p.x}px)`, transform: 'translateX(-50%)', animation: 'goalParticleFloat 0.8s ease-out forwards', animationDelay: `${p.delay}ms`, opacity: 0, fontWeight: 800, fontSize: '0.8rem', color: categoryColor, zIndex: 10 }}>+1</div>
              ))}
              {pulseKey > 0 && <div key={`ring-${pulseKey}`} className="absolute inset-0 rounded-lg pointer-events-none" style={{ border: `2px solid ${categoryColor}80`, animation: 'goalRingBurst 0.5s ease-out forwards' }} />}
              <button onClick={handleIncrement} disabled={incrementMutation.isPending}
                className="v2-btn-sm" style={{ background: categoryColor, color: 'white', fontWeight: 600, animation: pulseKey > 0 ? 'goalBtnPulse 0.4s ease-out' : 'none' }}>
                {incrementMutation.isPending ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.7rem' }} /> : <>+ 1</>}
              </button>
            </div>
          )}

          {goal.completed && (
            <span className="v2-badge" style={{ background: 'rgba(123, 163, 142, 0.12)', color: '#5A8A6E', padding: '3px 10px' }}>
              <i className="fa-solid fa-check-circle" style={{ marginRight: 4, fontSize: '0.6rem' }} />Complete
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalItem;
