import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

const AnswersHistoryPage = () => {
  const [selectedQuestion, setSelectedQuestion] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedQuestion !== 'all') {
      params.set('question_id', selectedQuestion);
    }
    if (sortOrder === 'oldest') {
      params.set('sort', 'oldest');
    }
    return params.toString();
  }, [selectedQuestion, sortOrder]);

  // Fetch data
  const { data, isLoading, error } = useQuery({
    queryKey: ['prepAnswers', selectedQuestion, sortOrder],
    queryFn: () => fetch(`/daily_prep/answers.json?${queryParams}`).then(res => res.json()),
  });

  const questions = data?.questions || [];
  const responses = data?.responses || [];

  // Group responses by date
  const groupedByDate = useMemo(() => {
    const groups = {};
    responses.forEach(r => {
      const date = r.response_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(r);
    });
    return groups;
  }, [responses]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderResponseValue = (response) => {
    const { question_type, response_value, long_response, question_options } = response;

    if (question_type === 'long_answer') {
      if (!long_response) return <span style={{ color: '#8E8E93', fontStyle: 'italic' }}>No answer</span>;
      return (
        <div
          className="prose prose-sm max-w-none"
          style={{ color: '#1D1D1F' }}
          dangerouslySetInnerHTML={{ __html: long_response }}
        />
      );
    }

    if (question_type === 'short_answer') {
      const text = response_value?.text;
      if (!text) return <span style={{ color: '#8E8E93', fontStyle: 'italic' }}>No answer</span>;
      return <p style={{ color: '#1D1D1F' }}>{text}</p>;
    }

    if (question_type === 'checkbox') {
      const checked = response_value?.checked;
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: checked ? '#D1FAE5' : '#FEE2E2' }}
          >
            <i
              className={`fa-solid ${checked ? 'fa-check' : 'fa-times'} text-xs`}
              style={{ color: checked ? '#065F46' : '#991B1B' }}
            ></i>
          </div>
          <span style={{ color: '#1D1D1F' }}>{checked ? 'Yes' : 'No'}</span>
        </div>
      );
    }

    if (question_type === 'multiple_choice') {
      const selected = response_value?.selected || [];
      if (selected.length === 0) return <span style={{ color: '#8E8E93', fontStyle: 'italic' }}>No selection</span>;

      const options = question_options || [];
      return (
        <div className="flex flex-wrap gap-2">
          {selected.map((idx) => (
            <span
              key={idx}
              className="px-3 py-1 rounded-full text-sm"
              style={{ background: '#E8F5E9', color: '#2E7D32' }}
            >
              {options[idx] || `Option ${idx + 1}`}
            </span>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 shadow-deep" style={{ background: '#FFFFFF' }}>
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <a
                href="/daily_prep"
                className="w-10 h-10 rounded-full flex items-center justify-center transition hover:bg-gray-100"
                title="Back to Daily Prep"
              >
                <i className="fa-solid fa-arrow-left" style={{ color: '#8E8E93' }}></i>
              </a>
              <div>
                <h1 className="text-5xl font-display" style={{ color: '#1D1D1F' }}>
                  Answer History
                </h1>
                <p className="text-sm mt-1" style={{ color: '#8E8E93', fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
                  View your past responses
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Question Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8E8E93' }}>
                Filter by Question
              </label>
              <select
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none appearance-none cursor-pointer"
                style={{
                  border: '1px solid rgba(199, 199, 204, 0.4)',
                  background: '#F9F9FB url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%238E8E93\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e") no-repeat right 12px center',
                  backgroundSize: '16px',
                  color: '#1D1D1F',
                }}
              >
                <option value="all">All Questions</option>
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.question_text}
                    {q.archived_at ? ' (archived)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Toggle */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8E8E93' }}>
                Sort Order
              </label>
              <div
                className="inline-flex rounded-lg overflow-hidden"
                style={{ border: '1px solid rgba(199, 199, 204, 0.4)' }}
              >
                <button
                  onClick={() => setSortOrder('newest')}
                  className="px-4 py-2.5 text-sm font-medium transition"
                  style={{
                    background: sortOrder === 'newest' ? 'linear-gradient(to bottom, #A8A8AD 0%, #8E8E93 100%)' : '#F5F5F7',
                    color: sortOrder === 'newest' ? '#FFFFFF' : '#1D1D1F',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Newest First
                </button>
                <button
                  onClick={() => setSortOrder('oldest')}
                  className="px-4 py-2.5 text-sm font-medium transition"
                  style={{
                    background: sortOrder === 'oldest' ? 'linear-gradient(to bottom, #A8A8AD 0%, #8E8E93 100%)' : '#F5F5F7',
                    color: sortOrder === 'oldest' ? '#FFFFFF' : '#1D1D1F',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Oldest First
                </button>
              </div>
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
            <p style={{ color: '#DC2626', fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Error loading answers: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && responses.length === 0 && (
          <div className="rounded-xl p-12 text-center shadow-deep" style={{ background: '#FFFFFF' }}>
            <i className="fa-solid fa-inbox text-6xl mb-4" style={{ color: '#E5E5E7' }}></i>
            <p style={{ color: '#8E8E93', fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
              {selectedQuestion === 'all'
                ? 'No answers recorded yet. Complete your daily prep to see history here!'
                : 'No answers for this question yet.'}
            </p>
          </div>
        )}

        {!isLoading && !error && responses.length > 0 && (
          <div className="space-y-8">
            {Object.entries(groupedByDate).map(([date, dateResponses]) => (
              <div key={date}>
                {/* Date Header */}
                <div
                  className="-mx-8 px-8 py-3 mb-4 flex items-center gap-3 bar-default"
                >
                  <i className="fa-solid fa-calendar-day text-white"></i>
                  <h3 className="text-xl text-white font-display" style={{ fontWeight: 500 }}>
                    {formatDate(date)}
                  </h3>
                  <span
                    className="ml-auto text-sm px-2 py-0.5 rounded"
                    style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }}
                  >
                    {dateResponses.length} {dateResponses.length === 1 ? 'answer' : 'answers'}
                  </span>
                </div>

                {/* Responses for this date */}
                <div className="space-y-4">
                  {dateResponses.map((response) => (
                    <div
                      key={response.id}
                      className="rounded-xl p-5 shadow-medium"
                      style={{
                        background: '#FFFFFF',
                      }}
                    >
                      <h4 className="text-sm font-medium mb-3" style={{ color: '#8E8E93' }}>
                        {response.question_text}
                      </h4>
                      {renderResponseValue(response)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default AnswersHistoryPage;
