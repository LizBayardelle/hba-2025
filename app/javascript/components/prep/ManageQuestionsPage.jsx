import React from 'react';
import { useQuery } from '@tanstack/react-query';
import usePrepStore from '../../stores/prepStore';
import QuestionCard from './QuestionCard';
import QuestionFormModal from './QuestionFormModal';
import DeleteQuestionModal from './DeleteQuestionModal';

const ManageQuestionsPage = () => {
  const { openNewModal } = usePrepStore();

  // Fetch questions
  const { data, isLoading, error } = useQuery({
    queryKey: ['prepQuestions'],
    queryFn: () => fetch('/daily_prep/manage.json').then(res => res.json()),
  });

  const questions = data?.questions || [];

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10" style={{ background: 'var(--bg)' }}>
        <div className="pl-14 pr-4 pt-6 pb-4 md:pl-8 md:pr-8 md:pt-8 md:pb-5">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <a
                  href="/daily_prep"
                  className="w-10 h-10 rounded-full flex items-center justify-center transition hover:bg-gray-100"
                  title="Back to Daily Prep"
                >
                  <i className="fa-solid fa-arrow-left" style={{ color: 'var(--ink-tertiary)' }}></i>
                </a>
                <h1 className="v2-h1" style={{ color: 'var(--ink)' }}>
                  Manage Questions
                </h1>
              </div>
              <p className="text-sm ml-13" style={{ color: 'var(--ink-tertiary)', fontFamily: 'var(--font-body)', fontWeight: 300, marginLeft: '52px' }}>
                Create and edit your daily prep questions
              </p>
            </div>

            <button
              onClick={openNewModal}
              className="w-12 h-12 rounded-xl text-white transition transform hover:scale-105 flex items-center justify-center v2-btn-sm v2-btn-primary"
              title="New Question"
            >
              <i className="fa-solid fa-plus text-lg"></i>
            </button>
          </div>
        </div>
      </div>
      <div style={{ height: 12, background: 'linear-gradient(to bottom, var(--bg), transparent)', pointerEvents: 'none' }} />

      {/* Content */}
      <div className="px-8 py-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2"
              style={{ borderColor: '#2C2C2E' }}
            ></div>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-12 text-center v2-card" style={{ background: 'var(--surface)' }}>
            <i className="fa-solid fa-exclamation-circle text-6xl mb-4" style={{ color: 'var(--overdue)' }}></i>
            <p style={{ color: 'var(--overdue)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>Error loading questions: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && questions.length === 0 && (
          <div className="rounded-xl p-12 text-center v2-card" style={{ background: 'var(--surface)' }}>
            <i className="fa-solid fa-clipboard-list text-6xl mb-4" style={{ color: 'var(--border)' }}></i>
            <p className="mb-4" style={{ color: 'var(--ink-tertiary)', fontFamily: 'var(--font-body)', fontWeight: 300 }}>
              No questions yet. Add your first question to get started!
            </p>
            <button
              onClick={openNewModal}
              className="v2-btn-sm v2-btn-primary inline-block px-6 py-3 rounded-lg text-white font-medium transition hover:opacity-90"
            >
              <i className="fa-solid fa-plus mr-2"></i>
              Add Your First Question
            </button>
          </div>
        )}

        {!isLoading && !error && questions.length > 0 && (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <QuestionCard key={question.id} question={question} index={index} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <QuestionFormModal questions={questions} />
      <DeleteQuestionModal />
    </>
  );
};

export default ManageQuestionsPage;
