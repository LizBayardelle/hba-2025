import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { tagsApi } from '../../utils/api';
import useJournalStore from '../../stores/journalStore';
import useDocumentsStore from '../../stores/documentsStore';
import useTasksStore from '../../stores/tasksStore';
import useHabitsStore from '../../stores/habitsStore';

const TagDetail = ({ tagId, onEdit, onDelete, deletePending }) => {
  const { openViewModal: openJournalViewModal } = useJournalStore();
  const { openViewModal: openDocumentViewModal } = useDocumentsStore();
  const { openViewModal: openTaskViewModal } = useTasksStore();
  const { openViewModal: openHabitViewModal } = useHabitsStore();
  const { data: tag, isLoading, error } = useQuery({
    queryKey: ['tag', tagId],
    queryFn: () => tagsApi.fetchOne(tagId),
    enabled: !!tagId,
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl p-12" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
        <div className="flex items-center justify-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2"
            style={{ borderColor: '#2C2C2E' }}
          ></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl p-12 text-center" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
        <i className="fa-solid fa-exclamation-circle text-5xl mb-4" style={{ color: '#DC2626' }}></i>
        <p style={{ color: '#DC2626', fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Error loading tag: {error.message}</p>
      </div>
    );
  }

  if (!tag) return null;

  const totalItems = (tag.journals?.length || 0) + (tag.habits?.length || 0) + (tag.documents?.length || 0) + (tag.tasks?.length || 0);

  // Section colors
  const sectionColors = {
    journals: '#6B8A99',
    habits: '#7CB342',
    documents: '#A78BFA',
    tasks: '#22D3EE',
  };

  const renderSection = (title, icon, color, items, renderItem) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="mb-6">
        {/* Section Header Bar */}
        <div
          className="-mx-6 px-6 py-3 mb-4 flex items-center gap-3"
          style={{
            background: `linear-gradient(to bottom, color-mix(in srgb, ${color} 85%, white) 0%, ${color} 100%)`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
        >
          <i className={`fa-solid ${icon} text-white text-lg`}></i>
          <h3 className="text-xl flex-1 text-white font-display" style={{ fontWeight: 500 }}>
            {title} ({items.length})
          </h3>
        </div>
        <div className="space-y-3">
          {items.map(renderItem)}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl p-6" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
      {/* Header */}
      <div className="mb-6 pb-4" style={{ borderBottom: '1px solid rgba(199, 199, 204, 0.3)' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
            >
              <i className="fa-solid fa-tag text-white text-xl"></i>
            </div>
            <div>
              <h2 className="text-3xl font-display" style={{ color: '#1D1D1F' }}>
                {tag.name}
              </h2>
              <p className="text-sm" style={{ color: '#8E8E93', fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>

          {/* Edit and Delete buttons */}
          <div className="flex gap-2">
            <button
              onClick={(e) => onEdit(tag, e)}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition hover:bg-gray-100"
              style={{ backgroundColor: '#F5F5F7' }}
              title="Edit tag"
            >
              <i className="fa-solid fa-edit text-lg" style={{ color: '#636366' }}></i>
            </button>
            <button
              onClick={(e) => onDelete(tag, e)}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition hover:bg-red-50"
              style={{ backgroundColor: '#FEE2E2' }}
              title="Delete tag"
              disabled={deletePending}
            >
              <i className="fa-solid fa-trash text-lg" style={{ color: '#DC2626' }}></i>
            </button>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div>
        {/* Journals Section */}
        {renderSection('Journals', 'fa-book', sectionColors.journals, tag.journals, (journal) => (
          <button
            key={journal.id}
            onClick={() => openJournalViewModal(journal.id)}
            className="w-full text-left p-4 rounded-lg transition hover:shadow-md"
            style={{ background: '#FFFFFF', border: '0.5px solid rgba(199, 199, 204, 0.3)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-xs" style={{ color: '#8E8E93', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                {formatDate(journal.created_at)}
              </div>
              <i className="fa-solid fa-arrow-right text-xs" style={{ color: '#8E8E93' }}></i>
            </div>
            <div
              className="text-sm line-clamp-2"
              style={{ color: '#1D1D1F', fontWeight: 400, fontFamily: "'Inter', sans-serif" }}
              dangerouslySetInnerHTML={{ __html: journal.content }}
            />
          </button>
        ))}

        {/* Habits Section */}
        {renderSection('Habits', 'fa-chart-line', sectionColors.habits, tag.habits, (habit) => (
          <button
            key={habit.id}
            onClick={() => openHabitViewModal(habit.id)}
            data-habit-id={habit.id}
            data-category-id={habit.category_id}
            className="w-full text-left p-4 rounded-lg transition hover:shadow-md"
            style={{ background: '#FFFFFF', border: '0.5px solid rgba(199, 199, 204, 0.3)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: habit.category_color }}
                >
                  <i className="fa-solid fa-check text-white"></i>
                </div>
                <div>
                  <div style={{ color: '#1D1D1F', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                    {habit.name}
                  </div>
                  <div className="text-xs" style={{ color: '#8E8E93', fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>
                    {habit.category_name}
                  </div>
                </div>
              </div>
              <i className="fa-solid fa-arrow-right text-xs" style={{ color: '#8E8E93' }}></i>
            </div>
          </button>
        ))}

        {/* Documents Section */}
        {renderSection('Documents', 'fa-file-alt', sectionColors.documents, tag.documents, (content) => (
          <button
            key={content.id}
            onClick={() => openDocumentViewModal(content.id)}
            className="w-full text-left p-4 rounded-lg transition hover:shadow-md"
            style={{ background: '#FFFFFF', border: '0.5px solid rgba(199, 199, 204, 0.3)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{ backgroundColor: '#F5F5F7', color: '#636366', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
                >
                  {content.content_type}
                </span>
              </div>
              <i className="fa-solid fa-arrow-right text-xs" style={{ color: '#8E8E93' }}></i>
            </div>
            <div className="mb-1" style={{ color: '#1D1D1F', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
              {content.title}
            </div>
            {content.habits.length > 0 && (
              <div className="text-xs" style={{ color: '#8E8E93', fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>
                Used in: {content.habits.map(h => h.name).join(', ')}
              </div>
            )}
          </button>
        ))}

        {/* Tasks Section */}
        {renderSection('Tasks', 'fa-check', sectionColors.tasks, tag.tasks, (task) => (
          <button
            key={task.id}
            onClick={() => openTaskViewModal(task.id)}
            className="w-full text-left p-4 rounded-lg transition hover:shadow-md"
            style={{ background: '#FFFFFF', border: '0.5px solid rgba(199, 199, 204, 0.3)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)', opacity: task.completed ? 0.6 : 1 }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {task.completed && (
                    <i className="fa-solid fa-check-circle text-sm" style={{ color: '#22D3EE' }}></i>
                  )}
                  <span style={{ color: '#1D1D1F', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                    {task.name}
                  </span>
                </div>
                {task.category && (
                  <span
                    className="text-xs px-2 py-1 rounded-lg"
                    style={{
                      backgroundColor: `${task.category_color}20`,
                      color: task.category_color,
                      fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {task.category_name}
                  </span>
                )}
              </div>
              <i className="fa-solid fa-arrow-right text-xs" style={{ color: '#8E8E93' }}></i>
            </div>
          </button>
        ))}

        {totalItems === 0 && (
          <div className="text-center py-12">
            <i
              className="fa-solid fa-inbox text-6xl mb-4"
              style={{ color: '#E5E5E7' }}
            ></i>
            <h3 className="text-xl mb-2" style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
              No Items Yet
            </h3>
            <p style={{ color: '#8E8E93', fontWeight: 200, fontFamily: "'Inter', sans-serif" }}>
              No items tagged with "{tag.name}" yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagDetail;
