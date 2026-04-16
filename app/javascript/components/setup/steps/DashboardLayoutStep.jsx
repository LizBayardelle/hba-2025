import React, { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { settingsApi } from '../../../utils/api';

const BLOCK_INFO = {
  calendar: { name: 'Calendar', icon: 'fa-calendar', description: 'Google Calendar events' },
  quick_links: { name: 'Quick Links', icon: 'fa-link', description: 'Fast access to common actions' },
  habits: { name: 'Habits', icon: 'fa-chart-line', description: 'Today\'s habits with completion tracking' },
  tasks: { name: 'Tasks', icon: 'fa-check', description: 'Upcoming and overdue tasks' },
  daily_prep: { name: 'Daily Prep', icon: 'fa-clipboard-check', description: 'Daily reflection questions' },
  projects: { name: 'Projects', icon: 'fa-briefcase', description: 'Your projects and task progress' },
};

const DEFAULT_LAYOUT = [
  { block: 'calendar', column: 'left', position: 0, visible: true },
  { block: 'quick_links', column: 'left', position: 1, visible: true },
  { block: 'habits', column: 'right', position: 2, visible: true },
  { block: 'tasks', column: 'right', position: 3, visible: true },
  { block: 'daily_prep', column: 'full', position: 4, visible: false },
  { block: 'projects', column: 'left', position: 5, visible: false },
];

function SortableBlock({ item, onToggleVisible, onChangeColumn }) {
  const info = BLOCK_INFO[item.block] || { name: item.block, icon: 'fa-square', description: '' };
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.block });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.85 : 1,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center gap-3 px-3 py-3 rounded-lg"
    >
      <button
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        style={{ color: 'var(--ink-faint)' }}
        tabIndex={-1}
      >
        <i className="fa-solid fa-grip-vertical text-xs"></i>
      </button>

      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: item.visible !== false ? 'var(--ink)' : 'var(--border)', opacity: item.visible !== false ? 1 : 0.5 }}
      >
        <i className={`fa-solid ${info.icon} text-white`} style={{ fontSize: '13px' }}></i>
      </div>

      <div className="flex-1 min-w-0">
        <span className="v2-body block" style={{ color: item.visible !== false ? 'var(--ink)' : 'var(--ink-faint)' }}>
          {info.name}
        </span>
        <span className="v2-caption block" style={{ color: 'var(--ink-faint)' }}>
          {info.description}
        </span>
      </div>

      <select
        value={item.column}
        onChange={(e) => onChangeColumn(item.block, e.target.value)}
        className="px-2 py-1 rounded-lg border text-xs"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--ink-secondary)' }}
      >
        <option value="left">Left</option>
        <option value="right">Right</option>
        <option value="full">Full width</option>
      </select>

      <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          checked={item.visible !== false}
          onChange={() => onToggleVisible(item.block)}
          className="rounded"
        />
        <span className="v2-caption" style={{ color: 'var(--ink-tertiary)' }}>Show</span>
      </label>
    </div>
  );
}

function DashboardPreview({ layout }) {
  const visible = layout
    .filter(b => b.visible !== false)
    .sort((a, b) => a.position - b.position);

  // Build rows from the layout
  const rows = [];
  let currentRow = { left: null, right: null };

  visible.forEach((block) => {
    if (block.column === 'full') {
      if (currentRow.left || currentRow.right) {
        rows.push(currentRow);
        currentRow = { left: null, right: null };
      }
      rows.push({ full: block });
    } else if (block.column === 'left') {
      if (currentRow.left) {
        rows.push(currentRow);
        currentRow = { left: block, right: null };
      } else {
        currentRow.left = block;
      }
    } else {
      if (currentRow.right) {
        rows.push(currentRow);
        currentRow = { left: null, right: block };
      } else {
        currentRow.right = block;
      }
    }
  });
  if (currentRow.left || currentRow.right) rows.push(currentRow);

  const MiniBlock = ({ block }) => {
    if (!block) return <div className="flex-1"></div>;
    const info = BLOCK_INFO[block.block] || { name: block.block, icon: 'fa-square' };
    return (
      <div
        className="flex-1 rounded-lg p-2 flex items-center gap-2"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <i className={`fa-solid ${info.icon}`} style={{ color: 'var(--ink-tertiary)', fontSize: '10px' }}></i>
        <span className="v2-caption" style={{ color: 'var(--ink-secondary)' }}>{info.name}</span>
      </div>
    );
  };

  return (
    <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--hover-tint)', border: '1px solid var(--border)' }}>
      {/* Mini header */}
      <div className="mb-2">
        <div className="h-2 w-24 rounded" style={{ background: 'var(--ink)', opacity: 0.15 }}></div>
      </div>
      {rows.map((row, i) => {
        if (row.full) {
          return <MiniBlock key={i} block={row.full} />;
        }
        return (
          <div key={i} className="flex gap-1.5">
            <MiniBlock block={row.left} />
            <MiniBlock block={row.right} />
          </div>
        );
      })}
      {visible.length === 0 && (
        <p className="v2-caption text-center py-2" style={{ color: 'var(--ink-faint)' }}>No blocks visible</p>
      )}
    </div>
  );
}

export default function DashboardLayoutStep({ goNext, goBack }) {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [loaded, setLoaded] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Load current layout on mount
  useEffect(() => {
    const rootEl = document.getElementById('setup-root');
    if (rootEl) {
      try {
        const settings = JSON.parse(rootEl.dataset.userSettings);
        if (settings.dashboard_layout && settings.dashboard_layout.length > 0) {
          // Merge with defaults to pick up any new blocks
          const saved = settings.dashboard_layout;
          const existing = new Set(saved.map(b => b.block));
          const merged = [...saved];
          DEFAULT_LAYOUT.forEach(d => {
            if (!existing.has(d.block)) {
              merged.push({ ...d, position: merged.length, visible: false });
            }
          });
          setLayout(merged);
        }
      } catch (e) {}
    }
    setLoaded(true);
  }, []);

  const saveLayout = useCallback((newLayout) => {
    settingsApi.update({ dashboard_layout: newLayout }).catch(() => {});
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLayout(prev => {
      const sorted = [...prev].sort((a, b) => a.position - b.position);
      const oldIndex = sorted.findIndex(b => b.block === active.id);
      const newIndex = sorted.findIndex(b => b.block === over.id);
      const reordered = arrayMove(sorted, oldIndex, newIndex).map((b, i) => ({ ...b, position: i }));
      saveLayout(reordered);
      return reordered;
    });
  }, [saveLayout]);

  const toggleVisible = useCallback((block) => {
    setLayout(prev => {
      const updated = prev.map(b =>
        b.block === block ? { ...b, visible: b.visible === false ? true : false } : b
      );
      saveLayout(updated);
      return updated;
    });
  }, [saveLayout]);

  const changeColumn = useCallback((block, column) => {
    setLayout(prev => {
      const updated = prev.map(b =>
        b.block === block ? { ...b, column } : b
      );
      saveLayout(updated);
      return updated;
    });
  }, [saveLayout]);

  const sorted = [...layout].sort((a, b) => a.position - b.position);

  return (
    <div>
      <h1 className="v2-h1 mb-2" style={{ color: 'var(--ink)' }}>Dashboard Layout</h1>
      <p className="v2-body mb-6" style={{ color: 'var(--ink-secondary)' }}>
        Your dashboard is the first thing you'll see. Arrange the blocks however you like,
        choose which column they go in, and hide anything you don't need.
      </p>

      {/* Live preview */}
      <div className="mb-6">
        <h2 className="v2-h3 mb-2" style={{ color: 'var(--ink)' }}>Preview</h2>
        <DashboardPreview layout={layout} />
      </div>

      {/* Block list */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="v2-h3" style={{ color: 'var(--ink)' }}>Blocks</h2>
          <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>
            <i className="fa-solid fa-grip-vertical mr-1"></i>Drag to reorder
          </span>
        </div>
        {loaded && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sorted.map(b => b.block)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sorted.map((item) => (
                  <SortableBlock
                    key={item.block}
                    item={item}
                    onToggleVisible={toggleVisible}
                    onChangeColumn={changeColumn}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button onClick={goBack} className="v2-btn v2-btn-ghost">
          <i className="fa-solid fa-arrow-left mr-2 text-xs"></i>Back
        </button>
        <button onClick={goNext} className="v2-btn v2-btn-primary">
          Next: Finish
          <i className="fa-solid fa-arrow-right ml-2 text-xs"></i>
        </button>
      </div>
    </div>
  );
}
