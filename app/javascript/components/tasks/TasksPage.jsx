import React, { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tasksApi, categoriesApi, tagsApi, documentsApi } from '../../utils/api';
import useTasksStore from '../../stores/tasksStore';
import TaskItem from './TaskItem';
import TaskFormModal from './TaskFormModal';
import TaskViewModal from './TaskViewModal';
import DocumentViewModal from '../documents/DocumentViewModal';
import ListShowModal from '../lists/ListShowModal';

const TasksPage = () => {
  const {
    statusFilter,
    groupBy,
    categoryFilter,
    tagFilter,
    searchQuery,
    setStatusFilter,
    setGroupBy,
    setCategoryFilter,
    setSearchQuery,
    openNewModal,
  } = useTasksStore();

  // Initialize from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlStatus = params.get('status');
    const urlGroupBy = params.get('groupBy');
    const urlSearch = params.get('search');

    if (urlStatus) setStatusFilter(urlStatus);
    if (urlGroupBy) setGroupBy(urlGroupBy);
    if (urlSearch) setSearchQuery(urlSearch);
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'active') params.set('status', statusFilter);
    if (groupBy && groupBy !== 'status') params.set('groupBy', groupBy);
    if (searchQuery) params.set('search', searchQuery);

    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [statusFilter, groupBy, searchQuery]);

  // Fetch tasks
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks', statusFilter, categoryFilter, tagFilter, searchQuery],
    queryFn: () => {
      const params = {};
      // For active filter, include tasks completed today
      if (statusFilter === 'active') {
        params.status = 'active_with_today_completed';
      } else if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (categoryFilter) params.category_id = categoryFilter;
      if (tagFilter) params.tag_id = tagFilter;
      if (searchQuery) params.search = searchQuery;
      return tasksApi.fetchAll(params);
    },
  });

  // Fetch all categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.fetchAll(),
  });

  // Fetch all user tags for autocomplete
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.fetchAll,
  });

  // Fetch all documents
  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.fetchAll,
  });

  // Fetch importance levels for mapping
  const { data: importanceLevels = [] } = useQuery({
    queryKey: ['importanceLevels'],
    queryFn: async () => {
      const response = await fetch('/settings/importance_levels');
      if (!response.ok) throw new Error('Failed to fetch importance levels');
      return response.json();
    },
  });

  // Group tasks based on groupBy setting
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') {
      return [{ title: 'All Tasks', tasks, hideHeader: true }];
    }

    if (groupBy === 'status') {
      // For completed tab, group by completion date
      const metallicGrey = '#8E8E93'; // Theme grey for system groups

      if (statusFilter === 'completed') {
        const groups = {
          completedToday: { title: 'Completed Today', tasks: [], color: metallicGrey, icon: 'fa-check-circle' },
          earlier: { title: 'Earlier', tasks: [], color: metallicGrey, icon: 'fa-history' },
        };

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        tasks.forEach(task => {
          if (task.completed_at) {
            const completedDate = new Date(task.completed_at);
            const completedDay = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate());

            if (completedDay.getTime() === today.getTime()) {
              groups.completedToday.tasks.push(task);
            } else {
              groups.earlier.tasks.push(task);
            }
          } else {
            // Fallback for tasks marked completed but no completed_at
            groups.earlier.tasks.push(task);
          }
        });

        return Object.values(groups).filter(g => g.tasks.length > 0);
      }

      // For active/on_hold tabs, group by date created with completed today at bottom
      const groups = {
        today: { title: 'Added Today', tasks: [], color: metallicGrey, icon: 'fa-sparkles' },
        thisWeek: { title: 'This Week', tasks: [], color: metallicGrey, icon: 'fa-calendar-week' },
        thisMonth: { title: 'This Month', tasks: [], color: metallicGrey, icon: 'fa-calendar' },
        festering: { title: 'Festering', tasks: [], color: metallicGrey, icon: 'fa-skull' },
        completedToday: { title: 'Completed Today', tasks: [], color: metallicGrey, icon: 'fa-check-circle' },
      };

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - today.getDay()); // Start of week
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const festeringDate = new Date(now);
      festeringDate.setMonth(festeringDate.getMonth() - 1);

      // Separate active and completed tasks
      const activeTasks = tasks.filter(t => !t.completed);
      const completedTodayTasks = tasks.filter(t => {
        if (!t.completed || !t.completed_at) return false;
        const completedDate = new Date(t.completed_at);
        const completedDay = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate());
        return completedDay.getTime() === today.getTime();
      });

      activeTasks.forEach(task => {
        const createdDate = new Date(task.created_at);
        const createdDay = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());

        if (createdDay.getTime() >= today.getTime()) {
          groups.today.tasks.push(task);
        } else if (createdDay.getTime() >= weekStart.getTime()) {
          groups.thisWeek.tasks.push(task);
        } else if (createdDay.getTime() >= monthStart.getTime()) {
          groups.thisMonth.tasks.push(task);
        } else if (createdDate < festeringDate) {
          groups.festering.tasks.push(task);
        }
      });

      groups.completedToday.tasks = completedTodayTasks;

      return Object.values(groups).filter(g => g.tasks.length > 0);
    } else if (groupBy === 'category') {
      // Group by category
      const groups = {};
      const uncategorized = { title: 'Uncategorized', tasks: [], color: '#9CA3A8', icon: 'fa-inbox', id: null };

      tasks.forEach(task => {
        if (task.category) {
          const catId = task.category.id;
          if (!groups[catId]) {
            groups[catId] = {
              id: catId,
              title: task.category.name,
              color: task.category.color,
              icon: task.category.icon,
              tasks: [],
            };
          }
          groups[catId].tasks.push(task);
        } else {
          uncategorized.tasks.push(task);
        }
      });

      const result = Object.values(groups);
      if (uncategorized.tasks.length > 0) {
        result.push(uncategorized);
      }
      return result;
    } else if (groupBy === 'due_date') {
      // Group by due date
      const metallicGrey = '#8E8E93';
      const groups = {
        overdue: { title: 'Overdue', tasks: [], color: metallicGrey, icon: 'fa-exclamation-triangle' },
        today: { title: 'Due Today', tasks: [], color: metallicGrey, icon: 'fa-calendar-day' },
        tomorrow: { title: 'Due Tomorrow', tasks: [], color: metallicGrey, icon: 'fa-calendar-plus' },
        thisWeek: { title: 'This Week', tasks: [], color: metallicGrey, icon: 'fa-calendar-week' },
        thisMonth: { title: 'This Month', tasks: [], color: metallicGrey, icon: 'fa-calendar' },
        later: { title: 'Later', tasks: [], color: metallicGrey, icon: 'fa-calendar-alt' },
        noDueDate: { title: 'No Due Date', tasks: [], color: metallicGrey, icon: 'fa-infinity' },
      };

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month

      tasks.forEach(task => {
        if (!task.due_date) {
          groups.noDueDate.tasks.push(task);
        } else {
          const dueDate = new Date(task.due_date);
          const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

          if (dueDay < today) {
            groups.overdue.tasks.push(task);
          } else if (dueDay.getTime() === today.getTime()) {
            groups.today.tasks.push(task);
          } else if (dueDay.getTime() === tomorrow.getTime()) {
            groups.tomorrow.tasks.push(task);
          } else if (dueDay <= weekEnd) {
            groups.thisWeek.tasks.push(task);
          } else if (dueDay <= monthEnd) {
            groups.thisMonth.tasks.push(task);
          } else {
            groups.later.tasks.push(task);
          }
        }
      });

      // Sort tasks within each group by time_block rank (anytime = 999)
      Object.values(groups).forEach(group => {
        group.tasks.sort((a, b) => {
          const rankA = a.time_block?.rank != null ? a.time_block.rank : 999;
          const rankB = b.time_block?.rank != null ? b.time_block.rank : 999;
          return rankA - rankB;
        });
      });

      return Object.values(groups).filter(g => g.tasks.length > 0);
    } else if (groupBy === 'importance') {
      // Group by importance - use user's actual importance levels
      const groups = {};
      const noImportance = { title: 'No Importance', tasks: [], color: '#9CA3A8', icon: 'fa-circle', importanceKey: null };

      tasks.forEach(task => {
        if (task.importance_level) {
          const levelId = task.importance_level.id;
          if (!groups[levelId]) {
            groups[levelId] = {
              id: levelId,
              title: task.importance_level.name,
              color: task.importance_level.color,
              icon: task.importance_level.icon || 'fa-circle',
              importanceKey: task.importance_level.name?.toLowerCase(),
              tasks: [],
            };
          }
          groups[levelId].tasks.push(task);
        } else {
          noImportance.tasks.push(task);
        }
      });

      // Sort by rank if available
      const result = Object.values(groups).sort((a, b) => (a.rank || 0) - (b.rank || 0));
      if (noImportance.tasks.length > 0) {
        result.push(noImportance);
      }
      return result;
    }

    return [{ title: 'All Tasks', tasks }];
  }, [tasks, groupBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const onHold = tasks.filter(t => t.on_hold).length;
    const overdue = tasks.filter(t => {
      if (!t.due_date || t.completed) return false;
      const dueDate = new Date(t.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length;

    return { total, completed, onHold, overdue };
  }, [tasks]);

  // Handle new task button click based on group type
  const handleNewTaskForGroup = (group) => {
    if (groupBy === 'category' && group.id) {
      openNewModal({ categoryId: group.id });
    } else if (groupBy === 'importance' && group.id) {
      openNewModal({ importanceLevelId: group.id });
    } else {
      openNewModal({});
    }
  };

  const renderGroup = (group, index) => {
    const groupColor = group.color || '#8E8E93';
    const groupIcon = group.icon || 'fa-list';

    return (
      <div key={group.title} className={`mb-6 ${index !== 0 ? 'mt-8' : ''}`}>
        {/* Full-width colored stripe header */}
        {!group.hideHeader && (
          <div
            className="-mx-8 px-8 py-4 mb-4 flex items-center gap-3"
            style={{
              background: `linear-gradient(to bottom, color-mix(in srgb, ${groupColor} 85%, white) 0%, ${groupColor} 100%)`,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
          >
            <i className={`fa-solid ${groupIcon} text-white text-lg`}></i>
            <h3 className="text-3xl flex-1 text-white font-display" style={{ fontWeight: 500 }}>
              {group.title} ({group.tasks.length})
            </h3>
            <button
              onClick={() => handleNewTaskForGroup(group)}
              className="w-8 h-8 rounded-md flex items-center justify-center transition btn-glass"
              title="New task"
            >
              <i className="fa-solid fa-plus text-white"></i>
            </button>
          </div>
        )}
        <div className="space-y-2">
          {group.tasks.map(task => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Header Section */}
      <div style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-5xl font-display mb-2" style={{ color: '#1D1D1F' }}>
                Tasks
              </h1>
            </div>

            <button
              onClick={() => openNewModal({})}
              className="w-12 h-12 rounded-xl text-white transition transform hover:scale-105 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
              title="New Task"
            >
              <i className="fa-solid fa-plus text-lg"></i>
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-6 mb-4">
            {/* Group By */}
            <div>
              <span className="block text-xs uppercase tracking-wide mb-2" style={{ color: '#8E8E93', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                Group By
              </span>
              <div className="inline-flex rounded-lg overflow-hidden" style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}>
                {[
                  { value: 'none', label: 'None' },
                  { value: 'status', label: 'Date Added' },
                  { value: 'category', label: 'Category' },
                  { value: 'due_date', label: 'Due Date' },
                  { value: 'importance', label: 'Importance' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setGroupBy(value)}
                    className="px-4 py-2 text-sm transition"
                    style={{
                      background: groupBy === value ? 'linear-gradient(to bottom, #A8A8AD 0%, #8E8E93 100%)' : '#F5F5F7',
                      color: groupBy === value ? '#FFFFFF' : '#1D1D1F',
                      fontWeight: 500,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Only Checkbox - far right */}
            <label className="flex items-center gap-2 cursor-pointer select-none ml-auto">
              <input
                type="checkbox"
                checked={statusFilter === 'active'}
                onChange={(e) => setStatusFilter(e.target.checked ? 'active' : 'all')}
                className="w-4 h-4 rounded cursor-pointer"
                style={{ accentColor: '#8E8E93' }}
              />
              <span style={{ color: '#8E8E93', fontWeight: 400, fontFamily: "'Inter', sans-serif", fontSize: '0.8125rem' }}>
                Active only
              </span>
            </label>
          </div>

          {/* Search Row */}
          <div className="relative">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#8E8E93' }}></i>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none"
              style={{
                border: '1px solid rgba(199, 199, 204, 0.4)',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
                background: '#F9F9FB',
                boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.08)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="px-8 pb-8">
        {isLoading && (
          <div className="text-center py-12">
            <i className="fa-solid fa-spinner fa-spin text-4xl" style={{ color: '#2C2C2E' }}></i>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p style={{ color: '#DC2626', fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Error loading tasks: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && tasks.length === 0 && (
          <div className="text-center py-12">
            <i className="fa-solid fa-clipboard-list text-6xl mb-4" style={{ color: '#E5E5E7' }}></i>
            <p className="text-lg mb-2" style={{ color: '#1D1D1F', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
              No tasks yet
            </p>
            <p className="text-sm" style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
              Create your first task to get started
            </p>
          </div>
        )}

        {!isLoading && !error && tasks.length > 0 && groupedTasks.map((group, index) => renderGroup(group, index))}
      </div>

      {/* Modals */}
      <TaskFormModal allTags={allTags} categories={categories} documents={documents} />
      <TaskViewModal />
      <DocumentViewModal />
      <ListShowModal />
    </>
  );
};

export default TasksPage;
