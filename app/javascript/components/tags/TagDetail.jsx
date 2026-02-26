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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#2C2C2E' }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl p-12 text-center shadow-deep" style={{ background: '#FFFFFF' }}>
        <i className="fa-solid fa-exclamation-circle text-6xl mb-4" style={{ color: '#DC2626' }}></i>
        <p style={{ color: '#DC2626', fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Error loading tag: {error.message}</p>
      </div>
    );
  }

  if (!tag) return null;

  const totalItems = (tag.journals?.length || 0) + (tag.habits?.length || 0) + (tag.documents?.length || 0) + (tag.tasks?.length || 0);

  const sectionColors = {
    journals: '#6B8A99',
    habits: '#7CB342',
    documents: '#A78BFA',
    tasks: '#22D3EE',
  };

  const renderSection = (title, icon, color, items, renderItem) => {
    if (!items || items.length === 0) return null;

    return (
      <div>
        <div
          className="-mx-6 px-6 pb-6"
          style={{
            background: `linear-gradient(180deg, color-mix(in srgb, ${color} 12%, white) 0%, color-mix(in srgb, ${color} 6%, white) 100%)`,
          }}
        >
          <div
            className="-mx-6 px-6 py-3 mb-4 flex items-center gap-3 bar-colored"
            style={{ '--bar-color': color }}
          >
            <i className={`fa-solid ${icon} text-white text-lg`}></i>
            <h3 className="text-xl flex-1 text-white font-display" style={{ fontWeight: 500 }}>
              {title} ({items.length})
            </h3>
          </div>
          <div className="space-y-2">
            {items.map(renderItem)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Tag header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)' }}
          >
            <i className="fa-solid fa-tag text-white"></i>
          </div>
          <div>
            <h2 className="text-2xl font-display" style={{ color: '#1D1D1F' }}>
              {tag.name}
            </h2>
            <p className="text-xs" style={{ color: '#8E8E93', fontFamily: "'Inter', sans-serif" }}>
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => onEdit(tag, e)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-gray-100"
            title="Edit tag"
          >
            <i className="fa-solid fa-pencil text-sm" style={{ color: '#8E8E93' }}></i>
          </button>
          <button
            onClick={(e) => onDelete(tag, e)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-gray-100"
            title="Delete tag"
            disabled={deletePending}
          >
            <i className="fa-solid fa-trash text-sm" style={{ color: '#8E8E93' }}></i>
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-0">
        {renderSection('Journals', 'fa-book', sectionColors.journals, tag.journals, (journal) => (
          <button
            key={journal.id}
            onClick={() => openJournalViewModal(journal.id)}
            className="w-full text-left p-3 bg-white rounded-xl shadow-medium hover:shadow-md transition"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm line-clamp-2"
                  style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif" }}
                  dangerouslySetInnerHTML={{ __html: journal.content }}
                />
                <div className="text-xs mt-1" style={{ color: '#8E8E93' }}>
                  {formatDate(journal.created_at)}
                </div>
              </div>
              <i className="fa-solid fa-chevron-right text-xs flex-shrink-0" style={{ color: '#C7C7CC' }}></i>
            </div>
          </button>
        ))}

        {renderSection('Habits', 'fa-chart-line', sectionColors.habits, tag.habits, (habit) => (
          <button
            key={habit.id}
            onClick={() => openHabitViewModal(habit.id)}
            className="w-full text-left p-3 bg-white rounded-xl shadow-medium hover:shadow-md transition"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: habit.category_color }}
              >
                <i className="fa-solid fa-check text-white text-xs"></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" style={{ color: '#1D1D1F' }}>{habit.name}</div>
                <div className="text-xs" style={{ color: '#8E8E93' }}>{habit.category_name}</div>
              </div>
              <i className="fa-solid fa-chevron-right text-xs flex-shrink-0" style={{ color: '#C7C7CC' }}></i>
            </div>
          </button>
        ))}

        {renderSection('Documents', 'fa-file-lines', sectionColors.documents, tag.documents, (doc) => {
          const iconMap = { document: 'fa-file-lines', youtube: 'fa-youtube', video: 'fa-video', link: 'fa-link' };
          const icon = iconMap[doc.content_type] || 'fa-file';

          return (
            <button
              key={doc.id}
              onClick={() => openDocumentViewModal(doc.id)}
              className="w-full text-left p-3 bg-white rounded-xl shadow-medium hover:shadow-md transition"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${sectionColors.documents}20` }}
                >
                  <i className={`fa-solid ${icon} text-sm`} style={{ color: sectionColors.documents }}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: '#1D1D1F' }}>{doc.title}</div>
                  {doc.habits?.length > 0 && (
                    <div className="text-xs truncate" style={{ color: '#8E8E93' }}>
                      {doc.habits.map(h => h.name).join(', ')}
                    </div>
                  )}
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: '#F5F5F7', color: '#8E8E93', fontWeight: 500 }}
                >
                  {doc.content_type}
                </span>
                <i className="fa-solid fa-chevron-right text-xs flex-shrink-0" style={{ color: '#C7C7CC' }}></i>
              </div>
            </button>
          );
        })}

        {renderSection('Tasks', 'fa-square-check', sectionColors.tasks, tag.tasks, (task) => (
          <button
            key={task.id}
            onClick={() => openTaskViewModal(task.id)}
            className="w-full text-left p-3 bg-white rounded-xl shadow-medium hover:shadow-md transition"
            style={{ opacity: task.completed ? 0.6 : 1 }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center"
                style={{
                  borderColor: task.category_color || '#8E8E93',
                  backgroundColor: task.completed ? (task.category_color || '#8E8E93') : 'transparent',
                }}
              >
                {task.completed && <i className="fa-solid fa-check text-white text-xs"></i>}
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={`font-semibold text-sm ${task.completed ? 'line-through' : ''}`}
                  style={{ color: '#1D1D1F' }}
                >
                  {task.name}
                </span>
                {task.category_name && (
                  <div className="text-xs" style={{ color: '#8E8E93' }}>{task.category_name}</div>
                )}
              </div>
              <i className="fa-solid fa-chevron-right text-xs flex-shrink-0" style={{ color: '#C7C7CC' }}></i>
            </div>
          </button>
        ))}

        {totalItems === 0 && (
          <div className="rounded-xl p-12 text-center shadow-deep" style={{ background: '#FFFFFF' }}>
            <i className="fa-solid fa-inbox text-5xl mb-4 block" style={{ color: '#E5E5E7' }}></i>
            <h3 className="text-lg mb-1" style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
              No Items Yet
            </h3>
            <p className="text-sm" style={{ color: '#8E8E93', fontWeight: 300, fontFamily: "'Inter', sans-serif" }}>
              Nothing tagged with "{tag.name}" yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagDetail;
