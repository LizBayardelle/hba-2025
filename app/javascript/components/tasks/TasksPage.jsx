import React, { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tasksApi, categoriesApi, tagsApi, documentsApi } from '../../utils/api';
import { parseLocalDate, getToday } from '../../utils/dateUtils';
import useTasksStore from '../../stores/tasksStore';
import TaskItem from './TaskItem';
import TaskFormModal from './TaskFormModal';
import TaskViewModal from './TaskViewModal';
import DocumentViewModal from '../documents/DocumentViewModal';
import DocumentFormModal from '../documents/DocumentFormModal';
import ListShowModal from '../lists/ListShowModal';

const TasksPage = () => {
  const { statusFilter, groupBy, categoryFilter, tagFilter, searchQuery, setStatusFilter, setGroupBy, setCategoryFilter, setSearchQuery, openNewModal } = useTasksStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlStatus = params.get('status');
    const urlGroupBy = params.get('groupBy');
    const urlSearch = params.get('search');
    if (urlStatus) setStatusFilter(urlStatus);
    if (urlSearch) setSearchQuery(urlSearch);
    if (urlGroupBy) { setGroupBy(urlGroupBy); } else {
      const rootElement = document.getElementById('tasks-react-root');
      const defaultGrouping = rootElement?.dataset?.defaultGrouping;
      if (defaultGrouping) setGroupBy(defaultGrouping);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'active') params.set('status', statusFilter);
    if (groupBy && groupBy !== 'status') params.set('groupBy', groupBy);
    if (searchQuery) params.set('search', searchQuery);
    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [statusFilter, groupBy, searchQuery]);

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks', statusFilter, categoryFilter, tagFilter, searchQuery],
    queryFn: () => {
      const params = {};
      if (statusFilter === 'active') { params.status = 'active_with_today_completed'; } else if (statusFilter !== 'all') { params.status = statusFilter; }
      if (categoryFilter) params.category_id = categoryFilter;
      if (tagFilter) params.tag_id = tagFilter;
      if (searchQuery) params.search = searchQuery;
      return tasksApi.fetchAll(params);
    },
  });

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.fetchAll() });
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.fetchAll });
  const { data: documents = [] } = useQuery({ queryKey: ['documents'], queryFn: documentsApi.fetchAll });
  const { data: importanceLevels = [] } = useQuery({
    queryKey: ['importanceLevels'],
    queryFn: async () => { const r = await fetch('/settings/importance_levels'); if (!r.ok) throw new Error('Failed'); return r.json(); },
  });

  // Group tasks (identical logic to original)
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') return [{ title: 'All Tasks', tasks, hideHeader: true }];

    if (groupBy === 'status') {
      if (statusFilter === 'completed') {
        const groups = { completedToday: { title: 'Completed Today', tasks: [] }, earlier: { title: 'Earlier', tasks: [] } };
        const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        tasks.forEach(task => {
          if (task.completed_at) { const cd = new Date(task.completed_at); const d = new Date(cd.getFullYear(), cd.getMonth(), cd.getDate()); if (d.getTime() === today.getTime()) groups.completedToday.tasks.push(task); else groups.earlier.tasks.push(task); } else groups.earlier.tasks.push(task);
        });
        return Object.values(groups).filter(g => g.tasks.length > 0);
      }
      const groups = { today: { title: 'Added Today', tasks: [] }, thisWeek: { title: 'This Week', tasks: [] }, thisMonth: { title: 'This Month', tasks: [] }, festering: { title: 'Festering', tasks: [] }, completedToday: { title: 'Completed Today', tasks: [] } };
      const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - today.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const activeTasks = tasks.filter(t => !t.completed);
      const completedTodayTasks = tasks.filter(t => { if (!t.completed || !t.completed_at) return false; const cd = new Date(t.completed_at); const d = new Date(cd.getFullYear(), cd.getMonth(), cd.getDate()); return d.getTime() === today.getTime(); });
      activeTasks.forEach(task => { const cd = new Date(task.created_at); const d = new Date(cd.getFullYear(), cd.getMonth(), cd.getDate()); if (d.getTime() >= today.getTime()) groups.today.tasks.push(task); else if (d.getTime() >= weekStart.getTime()) groups.thisWeek.tasks.push(task); else if (d.getTime() >= monthStart.getTime()) groups.thisMonth.tasks.push(task); else groups.festering.tasks.push(task); });
      groups.completedToday.tasks = completedTodayTasks;
      return Object.values(groups).filter(g => g.tasks.length > 0);
    } else if (groupBy === 'category') {
      const groups = {}; const uncategorized = { title: 'Uncategorized', tasks: [], color: '#9CA3A8', id: null };
      tasks.forEach(task => { if (task.category) { const catId = task.category.id; if (!groups[catId]) groups[catId] = { id: catId, title: task.category.name, color: task.category.color, icon: task.category.icon, tasks: [] }; groups[catId].tasks.push(task); } else uncategorized.tasks.push(task); });
      const result = Object.values(groups); if (uncategorized.tasks.length > 0) result.push(uncategorized); return result;
    } else if (groupBy === 'due_date') {
      const groups = { overdue: { title: 'Overdue', tasks: [] }, today: { title: 'Due Today', tasks: [] }, tomorrow: { title: 'Due Tomorrow', tasks: [] }, thisWeek: { title: 'This Week', tasks: [] }, thisMonth: { title: 'This Month', tasks: [] }, later: { title: 'Later', tasks: [] }, noDueDate: { title: 'No Due Date', tasks: [] } };
      const today = getToday(); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1); const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7); const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      tasks.forEach(task => { if (!task.due_date) { groups.noDueDate.tasks.push(task); } else { const d = parseLocalDate(task.due_date); if (d < today) groups.overdue.tasks.push(task); else if (d.getTime() === today.getTime()) groups.today.tasks.push(task); else if (d.getTime() === tomorrow.getTime()) groups.tomorrow.tasks.push(task); else if (d <= weekEnd) groups.thisWeek.tasks.push(task); else if (d <= monthEnd) groups.thisMonth.tasks.push(task); else groups.later.tasks.push(task); } });
      Object.values(groups).forEach(group => { group.tasks.sort((a, b) => (a.time_block?.rank ?? 999) - (b.time_block?.rank ?? 999)); });
      return Object.values(groups).filter(g => g.tasks.length > 0);
    } else if (groupBy === 'importance') {
      const groups = {}; const noImportance = { title: 'No Importance', tasks: [], color: '#9CA3A8' };
      tasks.forEach(task => { if (task.importance_level) { const lid = task.importance_level.id; if (!groups[lid]) groups[lid] = { id: lid, title: task.importance_level.name, color: task.importance_level.color, icon: task.importance_level.icon || 'fa-circle', tasks: [] }; groups[lid].tasks.push(task); } else noImportance.tasks.push(task); });
      const result = Object.values(groups).sort((a, b) => (a.rank || 0) - (b.rank || 0)); if (noImportance.tasks.length > 0) result.push(noImportance); return result;
    }
    return [{ title: 'All Tasks', tasks }];
  }, [tasks, groupBy, statusFilter]);

  const stats = useMemo(() => {
    const total = tasks.length; const completed = tasks.filter(t => t.completed).length;
    const today = getToday(); const overdue = tasks.filter(t => !t.due_date ? false : !t.completed && parseLocalDate(t.due_date) < today).length;
    return { total, completed, overdue };
  }, [tasks]);

  const handleNewTaskForGroup = (group) => {
    if (groupBy === 'category' && group.id) openNewModal({ categoryId: group.id });
    else if (groupBy === 'importance' && group.id) openNewModal({ importanceLevelId: group.id });
    else openNewModal({});
  };

  const renderGroup = (group) => {
    if (group.hideHeader) {
      return (
        <div key={group.title} className="v2-card" style={{ padding: 0 }}>
          {group.tasks.map(task => <TaskItem key={task.id} task={task} groupBy={groupBy} />)}
        </div>
      );
    }

    return (
      <div key={group.title} className="v2-card" style={{ padding: 0 }}>
        <div className="v2-section-header" style={{ padding: '12px 18px 8px' }}>
          <div className="flex items-center gap-2">
            {group.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: group.color, flexShrink: 0 }} />}
            <span className="v2-section-title">{group.title}</span>
            <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>{group.tasks.length}</span>
          </div>
          <button onClick={() => handleNewTaskForGroup(group)} className="v2-btn-icon-sm" title="New task">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
        {group.tasks.map(task => <TaskItem key={task.id} task={task} groupBy={groupBy} />)}
      </div>
    );
  };

  return (
    <>
      {/* v2 Header */}
      <div className="sticky top-0 z-10" style={{ background: 'var(--bg)' }}>
        <div className="pl-14 pr-4 pt-6 pb-4 md:pl-8 md:pr-8 md:pt-8 md:pb-5">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="v2-h1">Tasks</h1>
              <p className="v2-small" style={{ marginTop: 4, color: 'var(--ink-tertiary)' }}>
                {stats.total > 0 ? `${stats.total - stats.completed} active${stats.overdue > 0 ? ` · ${stats.overdue} overdue` : ''}` : 'No tasks'}
              </p>
            </div>
            <button onClick={() => openNewModal({})} className="v2-btn-sm v2-btn-primary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Task
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="v2-seg-control">
              {[
                { value: 'none', label: 'All' },
                { value: 'status', label: 'Date Added' },
                { value: 'category', label: 'Category' },
                { value: 'due_date', label: 'Due Date' },
                { value: 'importance', label: 'Importance' },
              ].map(({ value, label }) => (
                <button key={value} onClick={() => setGroupBy(value)} className={`v2-seg-btn ${groupBy === value ? 'active' : ''}`}>{label}</button>
              ))}
            </div>

            {/* Active only toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none" style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
              <input type="checkbox" checked={statusFilter === 'active'} onChange={(e) => setStatusFilter(e.target.checked ? 'active' : 'all')}
                style={{ accentColor: 'var(--ink)', width: 15, height: 15 }} />
              Active only
            </label>

            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-xs ml-auto">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm focus:outline-none"
                style={{ border: '1px solid var(--border)', fontFamily: 'var(--font-body)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '0.833rem' }} />
            </div>
          </div>
        </div>
        <div style={{ height: 12, background: 'linear-gradient(to bottom, var(--bg), transparent)', pointerEvents: 'none' }} />
      </div>

      {/* Content */}
      <div className="px-4 pb-16 md:px-8 space-y-4" style={{ maxWidth: 920, paddingTop: 8 }}>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ink-faint)' }} />
          </div>
        )}

        {error && (
          <div className="v2-card text-center" style={{ padding: '48px 24px' }}>
            <p className="v2-small" style={{ color: 'var(--overdue)' }}>Error loading tasks: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && tasks.length === 0 && (
          <div className="v2-card text-center" style={{ padding: '48px 24px' }}>
            <p className="v2-body" style={{ color: 'var(--ink)' }}>No tasks yet</p>
            <p className="v2-small" style={{ color: 'var(--ink-faint)', marginTop: 4 }}>Create your first task to get started.</p>
            <button onClick={() => openNewModal({})} className="v2-btn v2-btn-primary" style={{ marginTop: 16 }}>New Task</button>
          </div>
        )}

        {!isLoading && !error && tasks.length > 0 && groupedTasks.map((group) => renderGroup(group))}
      </div>

      <TaskFormModal allTags={allTags} categories={categories} documents={documents} />
      <TaskViewModal />
      <DocumentViewModal />
      <DocumentFormModal />
      <ListShowModal />
    </>
  );
};

export default TasksPage;
