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
      <div className="bg-white rounded-lg shadow-md p-12">
        <div className="flex items-center justify-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2"
            style={{ borderColor: '#1d3e4c' }}
          ></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <i className="fa-solid fa-exclamation-circle text-5xl mb-4" style={{ color: '#DC2626' }}></i>
        <p style={{ color: '#DC2626' }}>Error loading tag: {error.message}</p>
      </div>
    );
  }

  if (!tag) return null;

  const totalItems = (tag.journals?.length || 0) + (tag.habits?.length || 0) + (tag.documents?.length || 0) + (tag.tasks?.length || 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #1d3e4c, #45606b)' }}
            >
              <i className="fa-solid fa-tag text-white text-xl"></i>
            </div>
            <div>
              <h2 className="text-2xl font-bold display-font" style={{ color: '#1d3e4c' }}>
                {tag.name}
              </h2>
              <p className="text-sm font-light" style={{ color: '#657b84' }}>
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>

          {/* Edit and Delete buttons */}
          <div className="flex gap-2">
            <button
              onClick={(e) => onEdit(tag, e)}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition hover:bg-gray-100"
              title="Edit tag"
            >
              <i className="fa-solid fa-edit text-lg" style={{ color: '#1d3e4c' }}></i>
            </button>
            <button
              onClick={(e) => onDelete(tag, e)}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition hover:bg-red-50"
              title="Delete tag"
              disabled={deletePending}
            >
              <i className="fa-solid fa-trash text-lg" style={{ color: '#DC2626' }}></i>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Journals Section */}
        {tag.journals?.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: '#1d3e4c' }}>
              <i className="fa-solid fa-book"></i>
              Journals ({tag.journals.length})
            </h3>
            <div className="space-y-3">
              {tag.journals.map((journal) => (
                <button
                  key={journal.id}
                  onClick={() => openJournalViewModal(journal.id)}
                  className="w-full text-left p-4 rounded-lg border shadow-md hover:shadow-lg transition"
                  style={{ borderColor: '#E8EEF1' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-xs font-light" style={{ color: '#657b84' }}>
                      {formatDate(journal.created_at)}
                    </div>
                    <i className="fa-solid fa-arrow-right text-xs" style={{ color: '#1d3e4c' }}></i>
                  </div>
                  <div
                    className="text-sm font-light line-clamp-2"
                    style={{ color: '#1d3e4c' }}
                    dangerouslySetInnerHTML={{ __html: journal.content }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Habits Section */}
        {tag.habits?.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: '#1d3e4c' }}>
              <i className="fa-solid fa-chart-line"></i>
              Habits ({tag.habits?.length})
            </h3>
            <div className="space-y-3">
              {tag.habits.map((habit) => (
                <button
                  key={habit.id}
                  onClick={() => openHabitViewModal(habit.id)}
                  data-habit-id={habit.id}
                  data-category-id={habit.category_id}
                  className="w-full text-left p-4 rounded-lg border shadow-md hover:shadow-lg transition"
                  style={{ borderColor: '#E8EEF1' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: habit.category_color }}
                      >
                        <i className="fa-solid fa-check text-white"></i>
                      </div>
                      <div>
                        <div className="font-semibold" style={{ color: '#1d3e4c' }}>
                          {habit.name}
                        </div>
                        <div className="text-xs font-light" style={{ color: '#657b84' }}>
                          {habit.category_name}
                        </div>
                      </div>
                    </div>
                    <i className="fa-solid fa-arrow-right text-xs" style={{ color: '#1d3e4c' }}></i>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Documents Section */}
        {tag.documents?.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: '#1d3e4c' }}>
              <i className="fa-solid fa-file-alt"></i>
              Documents ({tag.documents?.length})
            </h3>
            <div className="space-y-3">
              {tag.documents.map((content) => (
                <button
                  key={content.id}
                  onClick={() => openDocumentViewModal(content.id)}
                  className="w-full text-left p-4 rounded-lg border shadow-md hover:shadow-lg transition"
                  style={{ borderColor: '#E8EEF1' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs px-2 py-1 rounded-lg font-medium"
                        style={{ backgroundColor: '#E8EEF1', color: '#1d3e4c' }}
                      >
                        {content.content_type}
                      </span>
                    </div>
                    <i className="fa-solid fa-arrow-right text-xs" style={{ color: '#1d3e4c' }}></i>
                  </div>
                  <div className="font-semibold mb-1" style={{ color: '#1d3e4c' }}>
                    {content.title}
                  </div>
                  {content.habits.length > 0 && (
                    <div className="text-xs font-light" style={{ color: '#657b84' }}>
                      Used in: {content.habits.map(h => h.name).join(', ')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tasks Section */}
        {tag.tasks?.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: '#1d3e4c' }}>
              <i className="fa-solid fa-check"></i>
              Tasks ({tag.tasks?.length})
            </h3>
            <div className="space-y-3">
              {tag.tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => openTaskViewModal(task.id)}
                  className="w-full text-left p-4 rounded-lg border shadow-md hover:shadow-lg transition"
                  style={{ borderColor: '#E8EEF1', opacity: task.completed ? 0.6 : 1 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {task.completed && (
                          <i className="fa-solid fa-check-circle text-sm" style={{ color: '#6B8A99' }}></i>
                        )}
                        <span className="font-semibold" style={{ color: '#1d3e4c' }}>
                          {task.name}
                        </span>
                      </div>
                      {task.category && (
                        <span
                          className="text-xs px-2 py-1 rounded-lg font-medium"
                          style={{
                            backgroundColor: `${task.category_color}20`,
                            color: task.category_color,
                          }}
                        >
                          {task.category_name}
                        </span>
                      )}
                    </div>
                    <i className="fa-solid fa-arrow-right text-xs" style={{ color: '#1d3e4c' }}></i>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {totalItems === 0 && (
          <div className="text-center py-12">
            <i
              className="fa-solid fa-inbox text-6xl mb-4"
              style={{ color: '#1d3e4c40' }}
            ></i>
            <p className="text-lg font-light" style={{ color: '#657b84' }}>
              No items tagged with "{tag.name}" yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagDetail;
