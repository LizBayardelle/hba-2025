import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prepQuestionsApi, prepResponsesApi } from '../../utils/api';
import ResponseInput from './ResponseInput';

const DailyPrepPage = () => {
  const queryClient = useQueryClient();
  const [responses, setResponses] = useState({});
  const [saveStatus, setSaveStatus] = useState({});

  // Fetch questions and today's responses
  const { data, isLoading, error } = useQuery({
    queryKey: ['dailyPrep'],
    queryFn: () => fetch('/daily_prep.json').then(res => res.json()),
  });

  const questions = data?.questions || [];
  const serverResponses = data?.responses || [];
  const today = data?.today;

  // Initialize local state from server responses
  useEffect(() => {
    if (serverResponses.length > 0) {
      const initial = {};
      serverResponses.forEach(r => {
        initial[r.prep_question_id] = {
          id: r.id,
          response_value: r.response_value,
          long_response: r.long_response,
        };
      });
      setResponses(initial);
    }
  }, [serverResponses]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data) => prepResponsesApi.upsert(data),
    onSuccess: (result, variables) => {
      setSaveStatus(prev => ({ ...prev, [variables.prep_question_id]: 'saved' }));
      // Update local response with ID if it was newly created
      if (result.response?.id) {
        setResponses(prev => ({
          ...prev,
          [variables.prep_question_id]: {
            ...prev[variables.prep_question_id],
            id: result.response.id,
          },
        }));
      }
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [variables.prep_question_id]: null }));
      }, 2000);
    },
    onError: (error, variables) => {
      setSaveStatus(prev => ({ ...prev, [variables.prep_question_id]: 'error' }));
    },
  });

  // Debounced save function
  const saveResponse = useCallback((questionId, value, questionType) => {
    setSaveStatus(prev => ({ ...prev, [questionId]: 'saving' }));

    const payload = {
      prep_question_id: questionId,
      response_date: today,
    };

    if (questionType === 'long_answer') {
      payload.long_response = value;
    } else if (questionType === 'short_answer') {
      payload.response_value = { text: value };
    } else {
      // checkbox and multiple_choice pass objects directly
      payload.response_value = value;
    }

    saveMutation.mutate(payload);
  }, [today, saveMutation]);

  // Handle value change with debounce for text inputs
  const handleChange = useCallback((questionId, value, questionType) => {
    let responseValue;
    if (questionType === 'long_answer') {
      responseValue = { long_response: value };
    } else if (questionType === 'short_answer') {
      responseValue = { response_value: { text: value } };
    } else {
      // checkbox and multiple_choice pass objects directly
      responseValue = { response_value: value };
    }

    setResponses(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        ...responseValue,
      },
    }));

    // For checkboxes and multiple choice, save immediately
    if (questionType === 'checkbox' || questionType === 'multiple_choice') {
      saveResponse(questionId, value, questionType);
    }
  }, [saveResponse]);

  // Debounced save for text inputs
  const handleBlur = useCallback((questionId, value, questionType) => {
    if (questionType === 'short_answer' || questionType === 'long_answer') {
      saveResponse(questionId, value, questionType);
    }
  }, [saveResponse]);

  const getResponseValue = (questionId, questionType) => {
    const r = responses[questionId];
    if (!r) return questionType === 'checkbox' ? false : questionType === 'multiple_choice' ? [] : '';

    if (questionType === 'long_answer') {
      return r.long_response || '';
    }
    if (questionType === 'short_answer') {
      return r.response_value?.text || '';
    }
    if (questionType === 'checkbox') {
      return r.response_value?.checked || false;
    }
    if (questionType === 'multiple_choice') {
      return r.response_value?.selected || [];
    }
    return '';
  };

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 shadow-deep" style={{ background: '#FFFFFF' }}>
        <div className="p-8">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h1 className="text-5xl font-display mb-2" style={{ color: '#1D1D1F' }}>
                Daily Prep
              </h1>
              <p className="text-sm" style={{ color: '#8E8E93', fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
                {today ? new Date(today + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : ''}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/daily_prep/answers"
                className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-80"
                style={{
                  background: '#F5F5F7',
                  color: '#1D1D1F',
                  border: '1px solid rgba(199, 199, 204, 0.4)'
                }}
              >
                <i className="fa-solid fa-clock-rotate-left mr-2"></i>
                History
              </a>
              <a
                href="/daily_prep/manage"
                className="btn-onyx px-4 py-2 rounded-lg text-sm font-medium text-white transition hover:opacity-80"
              >
                <i className="fa-solid fa-gear mr-2"></i>
                Manage
              </a>
            </div>
          </div>
        </div>
      </div>

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
          <div className="rounded-xl p-12 text-center shadow-deep" style={{ background: '#FFFFFF' }}>
            <i className="fa-solid fa-exclamation-circle text-6xl mb-4" style={{ color: '#DC2626' }}></i>
            <p style={{ color: '#DC2626', fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Error loading questions: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && questions.length === 0 && (
          <div className="rounded-xl p-12 text-center shadow-deep" style={{ background: '#FFFFFF' }}>
            <i className="fa-solid fa-clipboard-list text-6xl mb-4" style={{ color: '#E5E5E7' }}></i>
            <p className="mb-4" style={{ color: '#8E8E93', fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
              No prep questions yet.
            </p>
            <a
              href="/daily_prep/manage"
              className="btn-onyx inline-block px-6 py-3 rounded-lg text-white font-medium transition hover:opacity-90"
            >
              <i className="fa-solid fa-plus mr-2"></i>
              Add Your First Question
            </a>
          </div>
        )}

        {!isLoading && !error && questions.length > 0 && (
          <div className="space-y-6">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-xl p-6 shadow-medium"
                style={{
                  background: '#FFFFFF',
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                      style={{ background: '#F5F5F7', color: '#8E8E93' }}
                    >
                      {index + 1}
                    </span>
                    <h3 className="text-lg font-medium" style={{ color: '#1D1D1F' }}>
                      {question.question_text}
                    </h3>
                  </div>
                  {saveStatus[question.id] && (
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        background: saveStatus[question.id] === 'saved' ? '#D1FAE5' :
                          saveStatus[question.id] === 'error' ? '#FEE2E2' : '#F3F4F6',
                        color: saveStatus[question.id] === 'saved' ? '#065F46' :
                          saveStatus[question.id] === 'error' ? '#991B1B' : '#6B7280'
                      }}
                    >
                      {saveStatus[question.id] === 'saving' && 'Saving...'}
                      {saveStatus[question.id] === 'saved' && 'Saved'}
                      {saveStatus[question.id] === 'error' && 'Error saving'}
                    </span>
                  )}
                </div>

                <ResponseInput
                  question={question}
                  value={getResponseValue(question.id, question.question_type)}
                  onChange={(value) => handleChange(question.id, value, question.question_type)}
                  onBlur={(value) => handleBlur(question.id, value, question.question_type)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default DailyPrepPage;
