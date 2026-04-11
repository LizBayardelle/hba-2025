import React from 'react';
import usePrepStore from '../../stores/prepStore';

const QUESTION_TYPE_LABELS = {
  short_answer: 'Short Answer',
  long_answer: 'Long Answer',
  checkbox: 'Yes/No',
  multiple_choice: 'Multiple Choice',
};

const QUESTION_TYPE_ICONS = {
  short_answer: 'fa-font',
  long_answer: 'fa-align-left',
  checkbox: 'fa-toggle-on',
  multiple_choice: 'fa-list-ul',
};

const QuestionCard = ({ question, index, dragHandleProps }) => {
  const { openEditModal, openDeleteModal } = usePrepStore();

  return (
    <div
      className="rounded-xl p-5 shadow-medium transition hover:shadow-md"
      style={{
        background: 'var(--surface)',
        opacity: question.inactive ? 0.6 : 1,
        borderLeft: question.inactive ? '3px solid var(--ink-tertiary)' : 'none',
      }}
    >
      <div className="flex items-start gap-4">
        {/* Drag handle + Position indicator */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing"
          style={{ background: 'var(--hover-tint)' }}
          {...(dragHandleProps || {})}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--ink-tertiary)' }}>
            {index + 1}
          </span>
        </div>

        {/* Question content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3
                className="text-base font-medium mb-2 truncate"
                style={{ color: 'var(--ink)' }}
              >
                {question.question_text}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                  style={{ background: 'var(--hover-tint)', color: 'var(--ink-tertiary)' }}
                >
                  <i className={`fa-solid ${QUESTION_TYPE_ICONS[question.question_type]}`}></i>
                  {QUESTION_TYPE_LABELS[question.question_type]}
                </span>
                {question.inactive && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                    style={{ background: 'var(--hover-tint)', color: 'var(--ink-tertiary)' }}
                  >
                    <i className="fa-solid fa-moon"></i>
                    Inactive
                  </span>
                )}
                {question.question_type === 'multiple_choice' && question.options?.length > 0 && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                    style={{ background: 'var(--hover-tint)', color: 'var(--ink-tertiary)' }}
                  >
                    {question.options.length} options
                    {question.allow_multiple && ' (multi-select)'}
                  </span>
                )}
              </div>
              {question.question_type === 'multiple_choice' && question.options?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {question.options.map((option, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 rounded"
                      style={{ background: '#E8F5E9', color: '#2E7D32' }}
                    >
                      {option}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => openEditModal(question.id)}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition hover:bg-gray-100"
                title="Edit"
              >
                <i className="fa-solid fa-pen text-sm" style={{ color: 'var(--ink-tertiary)' }}></i>
              </button>
              <button
                onClick={() => openDeleteModal(question.id)}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition hover:bg-red-50"
                title="Delete"
              >
                <i className="fa-solid fa-trash text-sm" style={{ color: 'var(--overdue)' }}></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
