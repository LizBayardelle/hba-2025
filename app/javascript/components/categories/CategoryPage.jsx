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

const CategoryPage = ({ categoryId, initialSort = 'priority' }) => {
  const queryClient = useQueryClient();
  const [groupBy, setGroupBy] = useState(initialSort);
  const [activeSection, setActiveSection] = useState('habits');
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
    },
  });

  // Color mapping for light/dark variants
  const colorMap = {
    '#6B8A99': { light: '#E8EEF1', dark: '#1d3e4c' },
    '#9C8B7E': { light: '#E8E0D5', dark: '#5C4F45' },
    '#F8796D': { light: '#FFD4CE', dark: '#B8352A' },
    '#FFA07A': { light: '#FFE4D6', dark: '#D66A3E' },
    '#E5C730': { light: '#FEF7C3', dark: '#B89F0A' },
    '#A8A356': { light: '#E8EBCD', dark: '#7A7637' },
    '#7CB342': { light: '#D7EDCB', dark: '#4A6B27' },
    '#6EE7B7': { light: '#D1FAF0', dark: '#2C9D73' },
    '#22D3EE': { light: '#CFFAFE', dark: '#0E7490' },
    '#6366F1': { light: '#E0E7FF', dark: '#3730A3' },
    '#A78BFA': { light: '#EDE9FE', dark: '#6B21A8' },
    '#E879F9': { light: '#FAE8FF', dark: '#A21CAF' },
    '#FB7185': { light: '#FFE4E6', dark: '#BE123C' },
    '#9CA3A8': { light: '#E8E8E8', dark: '#4A5057' },
  };

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
  const colors = colorMap[categoryColor] || { light: '#E8EEF1', dark: '#1d3e4c' };

  // Format habits for DocumentFormModal
  const formattedHabits = habits?.map(habit => ({
    ...habit,
    category_name: category.name,
    category_color: category.color,
  })) || [];

  // Section tabs configuration
  const sections = [
    { id: 'habits', label: 'Habits', icon: 'fa-list-check', count: habits?.length || 0 },
    { id: 'tasks', label: 'Tasks', icon: 'fa-square-check', count: tasks?.length || 0 },
    { id: 'documents', label: 'Documents', icon: 'fa-file-lines', count: documents?.length || 0 },
    { id: 'lists', label: 'Lists', icon: 'fa-clipboard-list', count: lists?.length || 0 },
  ];

  // Render a habit group with colored stripe header
  const renderHabitGroup = (group, index) => {
    const groupColor = group.color || '#8E8E93';
    const groupIcon = group.icon || 'fa-list';

    return (
      <div key={group.title} className={`mb-6 ${index !== 0 ? 'mt-8' : ''}`}>
        <div
          className="-mx-6 px-6 py-3 mb-4 flex items-center gap-3"
          style={{
            background: `linear-gradient(to bottom, color-mix(in srgb, ${groupColor} 85%, white) 0%, ${groupColor} 100%)`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
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
                  isOptional={habit.importance_level?.name === 'Optional'}
                />
              ))}
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm italic" style={{ color: '#8E8E93', fontFamily: "'Inter', sans-serif" }}>
              No habits in this group
            </p>
          </div>
        )}
      </div>
    );
  };

  // Render habits section
  const renderHabitsSection = () => (
    <div className="rounded-xl p-6" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-display" style={{ color: '#1D1D1F' }}>Habits</h2>
        <div className="flex items-center gap-3">
          {/* Group By Filter */}
          <div className="inline-flex rounded-lg overflow-hidden" style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}>
            {[
              { value: 'priority', label: 'Priority' },
              { value: 'time', label: 'Time' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setGroupBy(value)}
                className="px-3 py-1.5 text-xs transition"
                style={{
                  background: groupBy === value ? categoryColor : '#F5F5F7',
                  color: groupBy === value ? '#FFFFFF' : '#1D1D1F',
                  fontWeight: 500,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
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
      </div>

      {habits && habits.length > 0 ? (
        groupedHabits.map((group, index) => renderHabitGroup(group, index))
      ) : (
        <div className="py-8 text-center">
          <i className="fa-solid fa-list-check text-4xl mb-2" style={{ color: '#E5E5E7' }}></i>
          <p className="text-sm mb-4" style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
            No habits yet
          </p>
          <button
            onClick={() => openNewHabitModal(categoryId)}
            className="px-4 py-2 rounded-lg text-white transition hover:opacity-90"
            style={{ backgroundColor: categoryColor, fontWeight: 500, fontFamily: "'Inter', sans-serif" }}
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
      const dueDate = new Date(task.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return { text: 'Overdue', color: '#FB7185' };
      if (diffDays === 0) return { text: 'Today', color: '#E5C730' };
      if (diffDays <= 7) return { text: `${diffDays}d`, color: '#22D3EE' };
      return { text: new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: '#8E8E93' };
    };

    return (
      <div className="rounded-xl p-6" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display" style={{ color: '#1D1D1F' }}>Tasks</h2>
          <button
            onClick={() => openNewTaskModal({ categoryId })}
            className="w-8 h-8 rounded-lg text-white transition transform hover:scale-105 flex items-center justify-center"
            style={{ backgroundColor: categoryColor }}
            title="New Task"
          >
            <i className="fa-solid fa-plus text-sm"></i>
          </button>
        </div>

        {tasks && tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map(task => {
              const dueDateStatus = getDueDateStatus(task);
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                  style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
                  onClick={() => openTaskViewModal(task.id)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTaskMutation.mutate({ taskId: task.id, completed: !task.completed });
                    }}
                    className="w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition hover:scale-110"
                    style={{
                      borderColor: categoryColor,
                      backgroundColor: task.completed ? categoryColor : 'transparent',
                    }}
                  >
                    {task.completed && <i className="fa-solid fa-check text-white text-xs"></i>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${task.completed ? 'line-through opacity-60' : ''}`} style={{ color: '#1D1D1F' }}>
                      {task.name}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {task.importance_level && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: task.importance_level.color, color: 'white' }}>
                          {task.importance_level.name}
                        </span>
                      )}
                      {dueDateStatus && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${dueDateStatus.color}20`, color: dueDateStatus.color }}>
                          {dueDateStatus.text}
                        </span>
                      )}
                      {task.checklist_items && task.checklist_items.length > 0 && (
                        <span className="text-xs" style={{ color: '#8E8E93' }}>
                          <i className="fa-solid fa-list-check mr-1"></i>
                          {task.checklist_items.filter(i => i.completed).length}/{task.checklist_items.length}
                        </span>
                      )}
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
          <div className="py-8 text-center">
            <i className="fa-solid fa-square-check text-4xl mb-2" style={{ color: '#E5E5E7' }}></i>
            <p className="text-sm mb-4" style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
              No tasks yet
            </p>
            <button
              onClick={() => openNewTaskModal({ categoryId })}
              className="px-4 py-2 rounded-lg text-white transition hover:opacity-90"
              style={{ backgroundColor: categoryColor, fontWeight: 500, fontFamily: "'Inter', sans-serif" }}
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
    <div className="rounded-xl p-6" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-display" style={{ color: '#1D1D1F' }}>Documents</h2>
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
                className="flex items-center gap-3 p-4 rounded-lg hover:shadow-md transition text-left"
                style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: categoryColor }}
                >
                  <i className={`fa-solid ${icon} text-white`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate" style={{ color: '#1D1D1F' }}>{doc.title}</div>
                  <div className="text-xs capitalize" style={{ color: '#8E8E93' }}>{doc.content_type}</div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center">
          <i className="fa-solid fa-file-lines text-4xl mb-2" style={{ color: '#E5E5E7' }}></i>
          <p className="text-sm mb-4" style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
            No documents yet
          </p>
          <button
            onClick={openNewDocumentModal}
            className="px-4 py-2 rounded-lg text-white transition hover:opacity-90"
            style={{ backgroundColor: categoryColor, fontWeight: 500, fontFamily: "'Inter', sans-serif" }}
          >
            <i className="fa-solid fa-plus mr-2"></i>Add Document
          </button>
        </div>
      )}
    </div>
  );

  // Render lists section
  const renderListsSection = () => (
    <div className="rounded-xl p-6" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-display" style={{ color: '#1D1D1F' }}>Lists</h2>
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
                className="flex flex-col p-4 rounded-lg hover:shadow-md transition text-left"
                style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: categoryColor }}
                  >
                    <i className="fa-solid fa-clipboard-list text-white"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate" style={{ color: '#1D1D1F' }}>{list.name}</div>
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
        <div className="py-8 text-center">
          <i className="fa-solid fa-clipboard-list text-4xl mb-2" style={{ color: '#E5E5E7' }}></i>
          <p className="text-sm mb-4" style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
            No lists yet
          </p>
          <button
            onClick={() => openNewListModal(categoryId)}
            className="px-4 py-2 rounded-lg text-white transition hover:opacity-90"
            style={{ backgroundColor: categoryColor, fontWeight: 500, fontFamily: "'Inter', sans-serif" }}
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
      <div style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
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
                  <p className="text-sm" style={{ color: '#8E8E93', fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>
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

          {/* Section Tabs */}
          <div className="flex gap-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition"
                style={{
                  backgroundColor: activeSection === section.id ? categoryColor : 'transparent',
                  color: activeSection === section.id ? 'white' : '#8E8E93',
                  fontWeight: 500,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <i className={`fa-solid ${section.icon} text-sm`}></i>
                <span>{section.label}</span>
                <span
                  className="px-1.5 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: activeSection === section.id ? 'rgba(255,255,255,0.2)' : 'rgba(142, 142, 147, 0.15)',
                    color: activeSection === section.id ? 'white' : '#8E8E93',
                  }}
                >
                  {section.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-8">
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
