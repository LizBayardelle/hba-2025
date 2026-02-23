import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useCategoryStore from '../../stores/categoryStore';
import useTasksStore from '../../stores/tasksStore';
import useListsStore from '../../stores/listsStore';
import useDocumentsStore from '../../stores/documentsStore';
import HabitCard from './HabitCard';
import HabitFormModal from './HabitFormModal';
import CategoryEditModal from './CategoryEditModal';
import DocumentViewModal from '../documents/DocumentViewModal';
import DocumentFormModal from '../documents/DocumentFormModal';
import TaskFormModal from '../tasks/TaskFormModal';
import TaskViewModal from '../tasks/TaskViewModal';
import ListFormModal from '../lists/ListFormModal';
import ListShowModal from '../lists/ListShowModal';
import { tagsApi, tasksApi } from '../../utils/api';
import { parseLocalDate, getToday } from '../../utils/dateUtils';
import { getColorVariants } from '../../utils/colorUtils';

const CategoryPage = ({ categoryId, initialSort = 'priority' }) => {
  const queryClient = useQueryClient();
  const [groupBy, setGroupBy] = useState(initialSort);
  const [activeSection, setActiveSection] = useState('habits');
  const [taskFilter, setTaskFilter] = useState('today');
  const [togglingTaskId, setTogglingTaskId] = useState(null);
  const { openNewHabitModal, openCategoryEditModal } = useCategoryStore();
  const { openNewModal: openNewTaskModal, openViewModal: openTaskViewModal, openEditModal: openTaskEditModal } = useTasksStore();
  const { openFormModal: openNewListModal, openShowModal: openListShowModal } = useListsStore();
  const { openViewModal: openDocumentViewModal, openNewModal: openNewDocumentModal } = useDocumentsStore();

  // Fetch category data
  const { data: categoryData, isLoading, error } = useQuery({
    queryKey: ['category', categoryId, groupBy],
    queryFn: async () => {
      const response = await fetch(`/categories/${categoryId}.json?sort=${groupBy}`);
      if (!response.ok) throw new Error('Failed to fetch category');
      return response.json();
    },
  });

  // Fetch all user tags for autocomplete
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.fetchAll,
  });

  // Fetch importance levels
  const { data: importanceLevels = [] } = useQuery({
    queryKey: ['importanceLevels'],
    queryFn: async () => {
      const response = await fetch('/settings/importance_levels');
      if (!response.ok) throw new Error('Failed to fetch importance levels');
      return response.json();
    },
  });

  // Fetch time blocks
  const { data: timeBlocks = [] } = useQuery({
    queryKey: ['timeBlocks'],
    queryFn: async () => {
      const response = await fetch('/settings/time_blocks');
      if (!response.ok) throw new Error('Failed to fetch time blocks');
      return response.json();
    },
  });

  // Toggle task completion mutation
  const toggleTaskMutation = useMutation({
    mutationFn: ({ taskId, completed }) => tasksApi.update(taskId, { task: { completed } }),
    onSuccess: () => {
      queryClient.invalidateQueries(['category', categoryId]);
      setTogglingTaskId(null);
    },
    onError: () => {
      setTogglingTaskId(null);
    },
  });

  // Group habits based on groupBy setting
  const groupedHabits = useMemo(() => {
    const habits = categoryData?.habits || [];

    if (groupBy === 'priority') {
      const groups = {};

      importanceLevels.forEach(level => {
        groups[level.id] = {
          id: level.id,
          title: level.name,
          color: level.color,
          icon: level.icon || 'fa-circle',
          rank: level.rank || 0,
          habits: [],
        };
      });

      const noImportance = { id: 'none', title: 'No Priority', habits: [], color: '#9CA3A8', icon: 'fa-circle', rank: 999 };

      habits.forEach(habit => {
        if (habit.importance_level) {
          const levelId = habit.importance_level.id;
          if (groups[levelId]) {
            groups[levelId].habits.push(habit);
          }
        } else {
          noImportance.habits.push(habit);
        }
      });

      const result = Object.values(groups).sort((a, b) => a.rank - b.rank);
      if (noImportance.habits.length > 0) {
        result.push(noImportance);
      }
      return result;
    } else if (groupBy === 'time') {
      const groups = {};

      timeBlocks.forEach(block => {
        groups[block.id] = {
          id: block.id,
          title: block.name,
          color: block.color || '#9CA3A8',
          icon: block.icon || 'fa-clock',
          rank: block.rank != null ? block.rank : 999,
          habits: [],
        };
      });

      const anytime = { id: 'anytime', title: 'Anytime', habits: [], color: '#9CA3A8', icon: 'fa-clock', rank: 999 };

      habits.forEach(habit => {
        if (habit.time_block_id) {
          const blockId = habit.time_block_id;
          if (groups[blockId]) {
            groups[blockId].habits.push(habit);
          }
        } else {
          anytime.habits.push(habit);
        }
      });

      const result = Object.values(groups).sort((a, b) => a.rank - b.rank);
      if (anytime.habits.length > 0) {
        result.push(anytime);
      }
      return result;
    }

    return [{ title: 'All Habits', habits, color: '#9CA3A8', icon: 'fa-list' }];
  }, [categoryData, groupBy, importanceLevels, timeBlocks]);

  // Calculate today's task count (due today, overdue, or no due date)
  const todayTaskCount = useMemo(() => {
    const tasks = categoryData?.tasks;
    if (!tasks) return 0;
    const today = getToday();

    return tasks.filter(task => {
      if (!task.due_date) return true;
      const dueDate = parseLocalDate(task.due_date);
      const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));
      return diffDays <= 0;
    }).length;
  }, [categoryData?.tasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: '#2C2C2E' }}
        ></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-xl p-12 text-center" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
          <i className="fa-solid fa-exclamation-circle text-6xl mb-4" style={{ color: '#DC2626' }}></i>
          <p style={{ color: '#DC2626', fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Error loading category: {error.message}</p>
        </div>
      </div>
    );
  }

  const { category, habits, tasks = [], documents = [], lists = [] } = categoryData;
  const categoryColor = category.color;
  const colors = getColorVariants(categoryColor);

  // Map groupBy to viewMode for HabitCard conditional badge hiding
  const viewMode = groupBy === 'priority' ? 'priority' : groupBy === 'time' ? 'time' : 'category';

  // Format habits for DocumentFormModal
  const formattedHabits = habits?.map(habit => ({
    ...habit,
    category_name: category.name,
    category_color: category.color,
  })) || [];

  // Section tabs configuration
  const sections = [
    { id: 'habits', label: 'Habits', icon: 'fa-list-check', count: habits?.length || 0 },
    { id: 'tasks', label: 'Tasks', icon: 'fa-square-check', count: todayTaskCount },
    { id: 'documents', label: 'Documents', icon: 'fa-file-lines', count: documents?.length || 0 },
    { id: 'lists', label: 'Lists', icon: 'fa-clipboard-list', count: lists?.length || 0 },
  ];

  // Render a habit group with liquid-surface-subtle header + tinted background
  const renderHabitGroup = (group) => {
    const groupColor = group.color || '#8E8E93';
    const groupIcon = group.icon || 'fa-list';

    return (
      <div key={group.title}>
        <div
          className="-mx-6 px-6 pb-6"
          style={{ backgroundColor: `color-mix(in srgb, ${groupColor} 18%, white)` }}
        >
          <div
            className="-mx-6 px-6 py-3 mb-4 flex items-center gap-3 liquid-surface-subtle"
            style={{ '--surface-color': groupColor }}
          >
            <i className={`fa-solid ${groupIcon} text-white text-lg`}></i>
            <h3 className="text-2xl flex-1 text-white font-display" style={{ fontWeight: 500 }}>
              {group.title} ({group.habits.length})
            </h3>
          </div>
          {group.habits.length > 0 ? (
            <div className="space-y-3">
              {[...group.habits]
                .sort((a, b) => {
                  const aOptional = a.importance_level?.name === 'Optional';
                  const bOptional = b.importance_level?.name === 'Optional';
                  if (aOptional && !bOptional) return 1;
                  if (!aOptional && bOptional) return -1;
                  return 0;
                })
                .map(habit => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    categoryColor={categoryColor}
                    categoryDarkColor={colors.dark}
                    viewMode={viewMode}
                    isOptional={habit.importance_level?.name === 'Optional'}
                  />
                ))}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm italic" style={{ color: '#8E8E93' }}>
                No habits in this group
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render habits section
  const renderHabitsSection = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {[
            { value: 'priority', label: 'Priority', icon: 'fa-arrow-up-wide-short' },
            { value: 'time', label: 'Time', icon: 'fa-clock' },
          ].map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => setGroupBy(value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition"
              style={{
                backgroundColor: groupBy === value ? `${categoryColor}15` : 'transparent',
                color: groupBy === value ? categoryColor : '#8E8E93',
                fontWeight: groupBy === value ? 600 : 400,
              }}
            >
              <i className={`fa-solid ${icon} text-xs`}></i>
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => openNewHabitModal(categoryId)}
          className="w-8 h-8 rounded-lg text-white transition transform hover:scale-105 flex items-center justify-center"
          style={{ backgroundColor: categoryColor }}
          title="New Habit"
        >
          <i className="fa-solid fa-plus text-sm"></i>
        </button>
      </div>

      {habits && habits.length > 0 ? (
        <div className="space-y-0">
          {groupedHabits.map((group) => renderHabitGroup(group))}
        </div>
      ) : (
        <div className="py-8 text-center rounded-xl" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
          <i className="fa-solid fa-list-check text-4xl mb-2" style={{ color: '#E5E5E7' }}></i>
          <p className="text-sm mb-4" style={{ color: '#8E8E93' }}>
            No habits yet
          </p>
          <button
            onClick={() => openNewHabitModal(categoryId)}
            className="px-4 py-2 rounded-lg text-white transition hover:opacity-90"
            style={{ backgroundColor: categoryColor }}
          >
            <i className="fa-solid fa-plus mr-2"></i>Add Habit
          </button>
        </div>
      )}
    </div>
  );

  // Render tasks section
  const renderTasksSection = () => {
    const getDueDateStatus = (task) => {
      if (!task.due_date) return null;
      const dueDate = parseLocalDate(task.due_date);
      const today = getToday();
      const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return { text: 'Overdue', color: '#FB7185', isToday: false, isOverdue: true };
      if (diffDays === 0) return { text: 'Today', color: '#E5C730', isToday: true, isOverdue: false };
      if (diffDays <= 7) return { text: `${diffDays}d`, color: '#22D3EE', isToday: false, isOverdue: false };
      return { text: parseLocalDate(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: '#8E8E93', isToday: false, isOverdue: false };
    };

    const getRepeatDescription = (task) => {
      if (!task.repeat_frequency) return null;
      const interval = task.repeat_interval || 1;
      switch (task.repeat_frequency) {
        case 'daily': return interval === 1 ? 'Daily' : `Every ${interval} days`;
        case 'weekly': return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
        case 'monthly': return interval === 1 ? 'Monthly' : `Every ${interval} months`;
        case 'yearly': return interval === 1 ? 'Yearly' : `Every ${interval} years`;
        default: return null;
      }
    };

    // Filter tasks based on taskFilter
    const filteredTasks = tasks?.filter(task => {
      if (taskFilter === 'all') return true;
      const status = getDueDateStatus(task);
      if (!task.due_date) return true;
      if (!status) return true;
      return status.isToday || status.isOverdue;
    }) || [];

    // Sort: overdue first, then today, then no date
    const sortedTasks = [...filteredTasks].sort((a, b) => {
      const aStatus = getDueDateStatus(a);
      const bStatus = getDueDateStatus(b);
      if (aStatus?.isOverdue && !bStatus?.isOverdue) return -1;
      if (!aStatus?.isOverdue && bStatus?.isOverdue) return 1;
      if (aStatus?.isToday && !bStatus?.isToday) return -1;
      if (!aStatus?.isToday && bStatus?.isToday) return 1;
      return 0;
    });

    const todayCount = tasks?.filter(task => {
      const status = getDueDateStatus(task);
      if (!task.due_date) return true;
      if (!status) return true;
      return status.isToday || status.isOverdue;
    }).length || 0;

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            {[
              { value: 'today', label: `Today (${todayCount})`, icon: 'fa-calendar-day' },
              { value: 'all', label: `All (${tasks?.length || 0})`, icon: 'fa-list' },
            ].map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => setTaskFilter(value)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition"
                style={{
                  backgroundColor: taskFilter === value ? `${categoryColor}15` : 'transparent',
                  color: taskFilter === value ? categoryColor : '#8E8E93',
                  fontWeight: taskFilter === value ? 600 : 400,
                }}
              >
                <i className={`fa-solid ${icon} text-xs`}></i>
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => openNewTaskModal({ categoryId })}
            className="w-8 h-8 rounded-lg text-white transition transform hover:scale-105 flex items-center justify-center"
            style={{ backgroundColor: categoryColor }}
            title="New Task"
          >
            <i className="fa-solid fa-plus text-sm"></i>
          </button>
        </div>

        {sortedTasks.length > 0 ? (
          <div className="space-y-2">
            {sortedTasks.map(task => {
              const dueDateStatus = getDueDateStatus(task);
              const repeatDesc = getRepeatDescription(task);

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border shadow-md hover:shadow-lg transition cursor-pointer"
                  style={{ borderColor: '#E8EEF1', opacity: task.completed ? 0.6 : 1 }}
                  onClick={() => openTaskViewModal(task.id)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTogglingTaskId(task.id);
                      toggleTaskMutation.mutate({ taskId: task.id, completed: !task.completed });
                    }}
                    disabled={togglingTaskId === task.id}
                    className="w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition hover:scale-110"
                    style={{
                      borderColor: categoryColor,
                      backgroundColor: task.completed ? categoryColor : 'transparent',
                    }}
                  >
                    {task.completed ? (
                      <i className="fa-solid fa-check text-white text-xs"></i>
                    ) : null}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${task.completed ? 'line-through' : ''}`} style={{ color: '#1D1D1F' }}>
                        {task.name}
                      </span>
                      {repeatDesc && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: 'rgba(142, 142, 147, 0.15)',
                            color: '#8E8E93',
                            fontWeight: 500,
                            fontSize: '0.65rem',
                          }}
                        >
                          {repeatDesc}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {/* Importance Level — icon only */}
                      {task.importance_level && (
                        <i
                          className={`${task.importance_level.icon} text-sm flex-shrink-0`}
                          style={{ color: task.importance_level.color }}
                          title={task.importance_level.name}
                        ></i>
                      )}
                      {/* Time Block */}
                      {task.time_block && task.time_block.name?.toLowerCase() !== 'anytime' && (
                        <div
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: task.time_block.color, color: 'white' }}
                        >
                          <i className={`${task.time_block.icon} text-[10px]`}></i>
                          <span>{task.time_block.name}</span>
                        </div>
                      )}
                      {/* Due Date */}
                      {dueDateStatus && (
                        <div
                          className="px-2 py-0.5 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: '#1D1D1F', color: 'white' }}
                        >
                          <i className="fa-solid fa-calendar-day mr-1"></i>
                          {dueDateStatus.text}
                        </div>
                      )}
                      {/* Repeat badge */}
                      {task.repeat_frequency && (
                        <div
                          className="px-2 py-0.5 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: '#7C3AED', color: 'white' }}
                        >
                          <i className="fa-solid fa-repeat mr-1"></i>
                          {task.repeat_frequency.charAt(0).toUpperCase() + task.repeat_frequency.slice(1)}
                        </div>
                      )}
                      {/* Checklist */}
                      {task.checklist_items && task.checklist_items.length > 0 && (
                        <div
                          className="px-2 py-0.5 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: '#1D1D1F', color: 'white' }}
                        >
                          <i className="fa-solid fa-list-check mr-1"></i>
                          {task.checklist_items.filter(i => i.completed).length}/{task.checklist_items.length}
                        </div>
                      )}
                      {/* Tags */}
                      {task.tags?.map(tag => (
                        <div
                          key={tag.id}
                          className="px-2 py-0.5 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: '#1D1D1F', color: 'white' }}
                        >
                          <i className="fa-solid fa-tag mr-1"></i>
                          {tag.name}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openTaskEditModal(task.id);
                    }}
                    className="w-5 h-5 flex items-center justify-center transition hover:opacity-70"
                  >
                    <i className="fa-solid fa-pen text-xs" style={{ color: '#9CA3A8' }}></i>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center rounded-xl" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
            <i className="fa-solid fa-square-check text-4xl mb-2" style={{ color: '#E5E5E7' }}></i>
            <p className="text-sm mb-4" style={{ color: '#8E8E93' }}>
              {taskFilter === 'today' ? 'No tasks due today' : 'No tasks yet'}
            </p>
            <button
              onClick={() => openNewTaskModal({ categoryId })}
              className="px-4 py-2 rounded-lg text-white transition hover:opacity-90"
              style={{ backgroundColor: categoryColor }}
            >
              <i className="fa-solid fa-plus mr-2"></i>Add Task
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render documents section
  const renderDocumentsSection = () => (
    <div>
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={openNewDocumentModal}
          className="w-8 h-8 rounded-lg text-white transition transform hover:scale-105 flex items-center justify-center"
          style={{ backgroundColor: categoryColor }}
          title="New Document"
        >
          <i className="fa-solid fa-plus text-sm"></i>
        </button>
      </div>

      {documents && documents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.map(doc => {
            const iconMap = {
              document: 'fa-file-lines',
              youtube: 'fa-youtube',
              video: 'fa-video',
              link: 'fa-link',
            };
            const icon = iconMap[doc.content_type] || 'fa-file';

            return (
              <button
                key={doc.id}
                onClick={() => openDocumentViewModal(doc.id)}
                className="flex items-center gap-3 p-4 bg-white rounded-lg border shadow-md hover:shadow-lg transition text-left"
                style={{ borderColor: '#E8EEF1' }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: categoryColor }}
                >
                  <i className={`fa-solid ${icon} text-white`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate" style={{ color: '#1D1D1F' }}>{doc.title}</div>
                  <div className="text-xs capitalize" style={{ color: '#8E8E93' }}>{doc.content_type}</div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center rounded-xl" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
          <i className="fa-solid fa-file-lines text-4xl mb-2" style={{ color: '#E5E5E7' }}></i>
          <p className="text-sm mb-4" style={{ color: '#8E8E93' }}>
            No documents yet
          </p>
          <button
            onClick={openNewDocumentModal}
            className="px-4 py-2 rounded-lg text-white transition hover:opacity-90"
            style={{ backgroundColor: categoryColor }}
          >
            <i className="fa-solid fa-plus mr-2"></i>Add Document
          </button>
        </div>
      )}
    </div>
  );

  // Render lists section
  const renderListsSection = () => (
    <div>
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => openNewListModal(categoryId)}
          className="w-8 h-8 rounded-lg text-white transition transform hover:scale-105 flex items-center justify-center"
          style={{ backgroundColor: categoryColor }}
          title="New List"
        >
          <i className="fa-solid fa-plus text-sm"></i>
        </button>
      </div>

      {lists && lists.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {lists.map(list => {
            const progress = list.total_count > 0 ? (list.completed_count / list.total_count) * 100 : 0;

            return (
              <button
                key={list.id}
                onClick={() => openListShowModal(list.id)}
                className="flex flex-col p-4 bg-white rounded-lg border shadow-md hover:shadow-lg transition text-left"
                style={{ borderColor: '#E8EEF1' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: categoryColor }}
                  >
                    <i className="fa-solid fa-clipboard-list text-white"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate" style={{ color: '#1D1D1F' }}>{list.name}</div>
                    <div className="text-xs" style={{ color: '#8E8E93' }}>
                      {list.completed_count}/{list.total_count} items
                    </div>
                  </div>
                </div>
                {list.total_count > 0 && (
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${categoryColor}20` }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, backgroundColor: categoryColor }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center rounded-xl" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
          <i className="fa-solid fa-clipboard-list text-4xl mb-2" style={{ color: '#E5E5E7' }}></i>
          <p className="text-sm mb-4" style={{ color: '#8E8E93' }}>
            No lists yet
          </p>
          <button
            onClick={() => openNewListModal(categoryId)}
            className="px-4 py-2 rounded-lg text-white transition hover:opacity-90"
            style={{ backgroundColor: categoryColor }}
          >
            <i className="fa-solid fa-plus mr-2"></i>Add List
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Header Section */}
      <div style={{ background: '#FFFFFF' }}>
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: categoryColor, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)' }}
              >
                <i className={`fa-solid ${category.icon} text-white text-2xl`}></i>
              </div>
              <div>
                <h1 className="text-5xl font-display mb-1" style={{ color: categoryColor }}>
                  {category.name}
                </h1>
                {category.description && (
                  <p className="text-sm" style={{ color: '#8E8E93' }}>
                    {category.description}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => openCategoryEditModal(categoryId)}
              className="text-xs tracking-wide hover:opacity-70 transition"
              style={{
                color: categoryColor,
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Edit Category
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-8 flex items-center gap-1" style={{ borderBottom: '1px solid rgba(199, 199, 204, 0.3)' }}>
          {sections.map(section => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className="flex items-center gap-2 px-4 py-3 -mb-px transition-colors"
                style={{
                  borderBottom: isActive ? `2px solid ${categoryColor}` : '2px solid transparent',
                }}
              >
                <i className={`fa-solid ${section.icon} text-sm`} style={{ color: isActive ? categoryColor : '#8E8E93' }}></i>
                <span
                  className="text-sm"
                  style={{
                    color: isActive ? categoryColor : '#8E8E93',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {section.label}
                </span>
                <span
                  className="px-1.5 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: isActive ? `${categoryColor}15` : 'rgba(142, 142, 147, 0.12)',
                    color: isActive ? categoryColor : '#8E8E93',
                    fontWeight: 600,
                  }}
                >
                  {section.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {activeSection === 'habits' && renderHabitsSection()}
        {activeSection === 'tasks' && renderTasksSection()}
        {activeSection === 'documents' && renderDocumentsSection()}
        {activeSection === 'lists' && renderListsSection()}
      </div>

      {/* Modals */}
      <HabitFormModal categoryColor={categoryColor} />
      <CategoryEditModal />
      <DocumentViewModal />
      <DocumentFormModal habits={formattedHabits} allTags={allTags} />
      <TaskFormModal />
      <TaskViewModal />
      <ListFormModal />
      <ListShowModal />
    </>
  );
};

export default CategoryPage;
