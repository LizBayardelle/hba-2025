import React, { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tasksApi, categoriesApi, tagsApi, documentsApi } from '../../utils/api';
import useTasksStore from '../../stores/tasksStore';
import TaskItem from './TaskItem';
import TaskFormModal from './TaskFormModal';
import TaskViewModal from './TaskViewModal';
import DocumentViewModal from '../documents/DocumentViewModal';

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

  // Group tasks based on groupBy setting
  const groupedTasks = useMemo(() => {
    if (groupBy === 'status') {
      // For completed tab, group by completion date
      if (statusFilter === 'completed') {
        const groups = {
          completedToday: { title: 'Completed Today', tasks: [] },
          earlier: { title: 'Earlier', tasks: [] },
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
        today: { title: 'Added Today', tasks: [] },
        thisWeek: { title: 'This Week', tasks: [] },
        thisMonth: { title: 'This Month', tasks: [] },
        festering: { title: 'Festering', tasks: [] },
        completedToday: { title: 'Completed Today', tasks: [] },
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
      const uncategorized = { title: 'Uncategorized', tasks: [], color: '#9CA3A8', icon: 'fa-inbox' };

      tasks.forEach(task => {
        if (task.category) {
          const catId = task.category.id;
          if (!groups[catId]) {
            groups[catId] = {
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
      const groups = {
        overdue: { title: 'Overdue', tasks: [], color: '#FB7185' },
        today: { title: 'Due Today', tasks: [], color: '#E5C730' },
        tomorrow: { title: 'Due Tomorrow', tasks: [], color: '#FFA07A' },
        thisWeek: { title: 'This Week', tasks: [], color: '#22D3EE' },
        thisMonth: { title: 'This Month', tasks: [], color: '#6B8A99' },
        later: { title: 'Later', tasks: [], color: '#9CA3A8' },
        noDueDate: { title: 'No Due Date', tasks: [], color: '#9CA3A8' },
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

      return Object.values(groups).filter(g => g.tasks.length > 0);
    } else if (groupBy === 'importance') {
      // Group by importance
      const importanceLevels = [
        { key: 'critical', title: 'Critical', color: '#FB7185' },
        { key: 'important', title: 'Important', color: '#E5C730' },
        { key: 'normal', title: 'Normal', color: '#6B8A99' },
        { key: 'optional', title: 'Optional', color: '#9CA3A8' },
      ];

      return importanceLevels.map(level => ({
        title: level.title,
        color: level.color,
        tasks: tasks.filter(t => t.importance === level.key),
      })).filter(g => g.tasks.length > 0);
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

  const renderGroup = (group) => {
    return (
      <div key={group.title} className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          {group.icon && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{ backgroundColor: group.color || '#6B8A99' }}
            >
              <i className={`fa-solid ${group.icon} text-white text-sm`}></i>
            </div>
          )}
          <h3 className="text-lg font-semibold" style={{ color: group.color || '#1d3e4c' }}>
            {group.title} ({group.tasks.length})
          </h3>
        </div>
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
      <div className="bg-white shadow-md">
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center shadow-md"
                  style={{ background: 'linear-gradient(135deg, #1d3e4c, #45606b)' }}
                >
                  <i className="fa-solid fa-check text-white text-2xl"></i>
                </div>
                <div>
                  <h1 className="text-3xl font-bold display-font" style={{ color: '#1d3e4c' }}>
                    Tasks
                  </h1>
                  <p className="text-sm font-light" style={{ color: '#566e78' }}>
                    {statusFilter === 'active' && `${stats.total} active · ${stats.overdue > 0 ? `${stats.overdue} overdue` : 'none overdue'}`}
                    {statusFilter === 'on_hold' && `${stats.total} on hold`}
                    {statusFilter === 'completed' && `${stats.total} completed`}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={openNewModal}
              className="px-6 py-3 rounded-lg text-white font-semibold shadow-lg hover:shadow-xl transition transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #1d3e4c, #45606b)' }}
            >
              <i className="fa-solid fa-plus mr-2"></i>
              New Task
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            {/* Status Filter */}
            <div className="flex gap-2">
              {[
                { value: 'active', label: 'Active' },
                { value: 'on_hold', label: 'On Hold' },
                { value: 'completed', label: 'Completed' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    statusFilter === value
                      ? 'text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  style={statusFilter === value ? { backgroundColor: '#1d3e4c' } : {}}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Group By */}
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="px-4 py-2 rounded-lg border-2 text-sm font-medium"
              style={{ borderColor: '#E8EEF1', color: '#1d3e4c' }}
            >
              <option value="status">Group by Date Added</option>
              <option value="category">Group by Category</option>
              <option value="due_date">Group by Due Date</option>
              <option value="importance">Group by Importance</option>
            </select>

            {/* Search */}
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 rounded-lg border-2 text-sm flex-1 min-w-[200px]"
              style={{ borderColor: '#E8EEF1', color: '#1d3e4c' }}
            />
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="p-8">
        {isLoading && (
          <div className="text-center py-12">
            <i className="fa-solid fa-spinner fa-spin text-4xl" style={{ color: '#6B8A99' }}></i>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-red-500">Error loading tasks: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && tasks.length === 0 && (
          <div className="text-center py-12">
            <i className="fa-solid fa-clipboard-list text-6xl mb-4" style={{ color: '#E8EEF1' }}></i>
            <p className="text-lg font-medium mb-2" style={{ color: '#566e78' }}>
              No tasks yet
            </p>
            <p className="text-sm" style={{ color: '#9CA3A8' }}>
              Create your first task to get started
            </p>
          </div>
        )}

        {!isLoading && !error && tasks.length > 0 && groupedTasks.map(group => renderGroup(group))}
      </div>

      {/* Modals */}
      <TaskFormModal allTags={allTags} categories={categories} documents={documents} />
      <TaskViewModal />
      <DocumentViewModal />
    </>
  );
};

export default TasksPage;
