import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import usePrepStore from '../../stores/prepStore';
import { prepQuestionsApi } from '../../utils/api';
import QuestionCard from './QuestionCard';
import QuestionFormModal from './QuestionFormModal';
import DeleteQuestionModal from './DeleteQuestionModal';

const SortableQuestionCard = ({ question, index }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <QuestionCard question={question} index={index} dragHandleProps={listeners} />
    </div>
  );
};

const ManageQuestionsPage = () => {
  const { openNewModal } = usePrepStore();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Fetch questions
  const { data, isLoading, error } = useQuery({
    queryKey: ['prepQuestions'],
    queryFn: () => fetch('/daily_prep/manage.json').then(res => res.json()),
  });

  const reorderMut = useMutation({
    mutationFn: (questionIds) => prepQuestionsApi.reorder(questionIds),
    onError: () => queryClient.invalidateQueries({ queryKey: ['prepQuestions'] }),
  });

  const questions = data?.questions || [];

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    const reordered = arrayMove(questions, oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData(['prepQuestions'], (old) => ({
      ...old,
      questions: reordered,
    }));

    // Persist
    reorderMut.mutate(reordered.map((q) => q.id));
  }, [questions, queryClient, reorderMut]);

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
                Create and edit your daily prep questions. Drag to reorder.
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <SortableQuestionCard key={question.id} question={question} index={index} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Modals */}
      <QuestionFormModal questions={questions} />
      <DeleteQuestionModal />
    </>
  );
};

export default ManageQuestionsPage;
