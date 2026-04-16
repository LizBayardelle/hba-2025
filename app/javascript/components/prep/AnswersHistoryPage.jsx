import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

const AnswersHistoryPage = () => {
  // Initialize state from URL params
  const initFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      question: params.get('question') || 'all',
      sort: params.get('sort') || 'newest',
      view: params.get('view') || 'list',
      inactive: params.get('inactive') === 'true',
    };
  };

  const initial = initFromUrl();
  const [selectedQuestion, setSelectedQuestion] = useState(initial.question);
  const [sortOrder, setSortOrder] = useState(initial.sort);
  const [viewMode, setViewMode] = useState(initial.view);
  const [showInactive, setShowInactive] = useState(initial.inactive);

  // Sync state to URL — always write all values so mobile refresh preserves them
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('view', viewMode);
    params.set('sort', sortOrder);
    params.set('question', selectedQuestion);
    params.set('inactive', String(showInactive));
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, [viewMode, sortOrder, selectedQuestion, showInactive]);

  // List view query params (may filter by question)
  const listQueryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedQuestion !== 'all') {
      params.set('question_id', selectedQuestion);
    }
    if (sortOrder === 'oldest') {
      params.set('sort', 'oldest');
    }
    return params.toString();
  }, [selectedQuestion, sortOrder]);

  // Chart view query params (always all questions)
  const chartQueryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (sortOrder === 'oldest') {
      params.set('sort', 'oldest');
    }
    return params.toString();
  }, [sortOrder]);

  // List view data
  const { data: listData, isLoading: listLoading, error: listError } = useQuery({
    queryKey: ['prepAnswers', 'list', selectedQuestion, sortOrder],
    queryFn: () => fetch(`/daily_prep/answers.json?${listQueryParams}`).then(res => res.json()),
    enabled: viewMode === 'list',
  });

  // Chart view data (always fetches all)
  const { data: chartData, isLoading: chartLoading, error: chartError } = useQuery({
    queryKey: ['prepAnswers', 'chart', sortOrder],
    queryFn: () => fetch(`/daily_prep/answers.json?${chartQueryParams}`).then(res => res.json()),
    enabled: viewMode === 'chart',
  });

  const data = viewMode === 'chart' ? chartData : listData;
  const isLoading = viewMode === 'chart' ? chartLoading : listLoading;
  const error = viewMode === 'chart' ? chartError : listError;

  const questions = data?.questions || [];
  const responses = data?.responses || [];

  // Questions for chart columns
  const chartQuestions = useMemo(() => {
    return questions.filter(q => !q.archived_at && (showInactive || !q.inactive));
  }, [questions, showInactive]);

  // Group responses by date
  const groupedByDate = useMemo(() => {
    const groups = {};
    responses.forEach(r => {
      const date = r.response_date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(r);
    });
    return groups;
  }, [responses]);

  // For chart: build a lookup map of date -> question_id -> response
  const responseMap = useMemo(() => {
    const map = {};
    responses.forEach(r => {
      const key = `${r.response_date}:${r.prep_question_id}`;
      map[key] = r;
    });
    return map;
  }, [responses]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedByDate).sort((a, b) =>
      sortOrder === 'newest' ? b.localeCompare(a) : a.localeCompare(b)
    );
  }, [groupedByDate, sortOrder]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateShort = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderResponseValue = (response) => {
    const { question_type, response_value, long_response, question_options } = response;

    if (question_type === 'long_answer') {
      if (!long_response) return <span className="v2-small" style={{ color: 'var(--ink-tertiary)', fontStyle: 'italic' }}>No answer</span>;
      return (
        <div
          className="prose prose-sm max-w-none"
          style={{ color: 'var(--ink)' }}
          dangerouslySetInnerHTML={{ __html: long_response }}
        />
      );
    }

    if (question_type === 'short_answer') {
      const text = response_value?.text;
      if (!text) return <span className="v2-small" style={{ color: 'var(--ink-tertiary)', fontStyle: 'italic' }}>No answer</span>;
      return <p className="v2-body" style={{ color: 'var(--ink)' }}>{text}</p>;
    }

    if (question_type === 'checkbox') {
      const checked = response_value?.checked;
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: checked ? '#D1FAE5' : 'var(--overdue-bg, #FEE2E2)' }}
          >
            <i
              className={`fa-solid ${checked ? 'fa-check' : 'fa-times'} text-xs`}
              style={{ color: checked ? '#065F46' : 'var(--overdue)' }}
            ></i>
          </div>
          <span className="v2-body" style={{ color: 'var(--ink)' }}>{checked ? 'Yes' : 'No'}</span>
        </div>
      );
    }

    if (question_type === 'multiple_choice') {
      const selected = response_value?.selected || [];
      if (selected.length === 0) return <span className="v2-small" style={{ color: 'var(--ink-tertiary)', fontStyle: 'italic' }}>No selection</span>;

      const options = question_options || [];
      return (
        <div className="flex flex-wrap gap-2">
          {selected.map((idx) => (
            <span
              key={idx}
              className="v2-badge v2-badge-active"
            >
              {options[idx] || `Option ${idx + 1}`}
            </span>
          ))}
        </div>
      );
    }

    return null;
  };

  // Compact cell renderer for chart view
  const renderCellValue = (response) => {
    if (!response) return <span style={{ color: 'var(--ink-faint)' }}>&mdash;</span>;

    const { question_type, response_value, long_response, question_options } = response;

    if (question_type === 'checkbox') {
      const checked = response_value?.checked;
      return (
        <i
          className={`fa-solid ${checked ? 'fa-check' : 'fa-times'}`}
          style={{ color: checked ? '#22C55E' : 'var(--overdue)', fontSize: '13px' }}
        ></i>
      );
    }

    if (question_type === 'short_answer') {
      const text = response_value?.text;
      if (!text) return <span style={{ color: 'var(--ink-faint)' }}>&mdash;</span>;
      return <span className="v2-caption" style={{ color: 'var(--ink)' }}>{text}</span>;
    }

    if (question_type === 'long_answer') {
      if (!long_response) return <span style={{ color: 'var(--ink-faint)' }}>&mdash;</span>;
      // Strip HTML and truncate
      const text = long_response.replace(/<[^>]*>/g, '').trim();
      const truncated = text.length > 60 ? text.slice(0, 60) + '...' : text;
      return <span className="v2-caption" style={{ color: 'var(--ink)' }}>{truncated}</span>;
    }

    if (question_type === 'multiple_choice') {
      const selected = response_value?.selected || [];
      if (selected.length === 0) return <span style={{ color: 'var(--ink-faint)' }}>&mdash;</span>;
      const options = question_options || [];
      return (
        <span className="v2-caption" style={{ color: 'var(--ink)' }}>
          {selected.map(idx => options[idx] || `#${idx + 1}`).join(', ')}
        </span>
      );
    }

    return <span style={{ color: 'var(--ink-faint)' }}>&mdash;</span>;
  };

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10" style={{ background: 'var(--bg)' }}>
        <div className="pl-14 pr-4 pt-6 pb-3 md:pl-8 md:pr-8 md:pt-8 md:pb-5">
          {/* Title row */}
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <a
              href="/daily_prep"
              className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition flex-shrink-0"
              style={{ color: 'var(--ink-tertiary)' }}
              title="Back to Daily Prep"
            >
              <i className="fa-solid fa-arrow-left"></i>
            </a>
            <h1 className="v2-h1">Answer History</h1>
          </div>

          {/* Filters — compact on mobile, spacious on desktop */}
          <div className="flex flex-wrap items-end gap-2.5 md:gap-4">
            {/* View Toggle */}
            <div>
              <label className="v2-caption font-medium hidden md:block mb-1.5" style={{ color: 'var(--ink-tertiary)' }}>
                View
              </label>
              <div className="v2-seg-control">
                <button
                  onClick={() => setViewMode('list')}
                  className={`v2-seg-btn ${viewMode === 'list' ? 'active' : ''}`}
                >
                  <i className="fa-solid fa-list md:mr-1.5" style={{ fontSize: '10px' }}></i>
                  <span className="hidden md:inline">List</span>
                </button>
                <button
                  onClick={() => setViewMode('chart')}
                  className={`v2-seg-btn ${viewMode === 'chart' ? 'active' : ''}`}
                >
                  <i className="fa-solid fa-table md:mr-1.5" style={{ fontSize: '10px' }}></i>
                  <span className="hidden md:inline">Chart</span>
                </button>
              </div>
            </div>

            {/* Sort Toggle */}
            <div>
              <label className="v2-caption font-medium hidden md:block mb-1.5" style={{ color: 'var(--ink-tertiary)' }}>
                Sort Order
              </label>
              <div className="v2-seg-control">
                <button
                  onClick={() => setSortOrder('newest')}
                  className={`v2-seg-btn ${sortOrder === 'newest' ? 'active' : ''}`}
                >
                  <span className="hidden md:inline">Newest First</span>
                  <span className="md:hidden">New</span>
                </button>
                <button
                  onClick={() => setSortOrder('oldest')}
                  className={`v2-seg-btn ${sortOrder === 'oldest' ? 'active' : ''}`}
                >
                  <span className="hidden md:inline">Oldest First</span>
                  <span className="md:hidden">Old</span>
                </button>
              </div>
            </div>

            {/* Show Inactive Toggle */}
            <div className="flex items-center gap-2" style={{ paddingBottom: '2px' }}>
              <button
                onClick={() => setShowInactive(!showInactive)}
                className={`v2-toggle ${showInactive ? 'active' : ''}`}
                role="switch"
                aria-checked={showInactive}
              ></button>
              <span className="v2-caption" style={{ color: 'var(--ink-tertiary)' }}>Inactive</span>
            </div>

            {/* Question Filter - only for list view, full width on mobile */}
            {viewMode === 'list' && (
              <div className="w-full md:w-auto md:flex-1 md:min-w-[200px]">
                <select
                  value={selectedQuestion}
                  onChange={(e) => setSelectedQuestion(e.target.value)}
                  className="w-full rounded-lg text-sm focus:outline-none"
                  style={{
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    padding: '5px 12px',
                    height: '30px',
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
            )}
          </div>
        </div>
        {viewMode === 'list' ? (
          <div style={{ height: 12, background: 'linear-gradient(to bottom, var(--bg), transparent)', pointerEvents: 'none' }} />
        ) : (
          <div style={{ height: 1, background: 'var(--border)' }} />
        )}
      </div>

      {/* Content */}
      <div className={`px-4 md:px-8 py-6 ${viewMode === 'list' ? '' : 'overflow-x-auto'}`} style={viewMode === 'list' ? { maxWidth: '920px' } : {}}>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <i className="fa-solid fa-spinner fa-spin text-xl" style={{ color: 'var(--ink-tertiary)' }}></i>
          </div>
        )}

        {error && (
          <div className="v2-card p-12 text-center">
            <i className="fa-solid fa-exclamation-circle text-5xl mb-4" style={{ color: 'var(--overdue)' }}></i>
            <p className="v2-body" style={{ color: 'var(--overdue)' }}>Error loading answers: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && responses.length === 0 && (
          <div className="v2-card p-12 text-center">
            <i className="fa-solid fa-inbox text-5xl mb-4" style={{ color: 'var(--border)' }}></i>
            <p className="v2-body" style={{ color: 'var(--ink-tertiary)' }}>
              {selectedQuestion === 'all'
                ? 'No answers recorded yet. Complete your daily prep to see history here!'
                : 'No answers for this question yet.'}
            </p>
          </div>
        )}

        {/* List View */}
        {!isLoading && !error && responses.length > 0 && viewMode === 'list' && (
          <div className="space-y-8">
            {Object.entries(groupedByDate).map(([date, dateResponses]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <i className="fa-solid fa-calendar-day" style={{ color: 'var(--ink-tertiary)' }}></i>
                  <h3 className="v2-h2" style={{ color: 'var(--ink)' }}>
                    {formatDate(date)}
                  </h3>
                  <span className="v2-badge v2-badge-neutral ml-auto">
                    {dateResponses.length} {dateResponses.length === 1 ? 'answer' : 'answers'}
                  </span>
                </div>

                <div className="space-y-3">
                  {dateResponses.map((response) => (
                    <div key={response.id} className="v2-card p-5">
                      <h4 className="v2-small font-medium mb-3" style={{ color: 'var(--ink-tertiary)' }}>
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

        {/* Chart View */}
        {!isLoading && !error && responses.length > 0 && viewMode === 'chart' && chartQuestions.length > 0 && (
          <div className="v2-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${chartQuestions.length * 160 + 140}px` }}>
                <thead>
                  <tr>
                    <th
                      className="v2-caption font-semibold"
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        color: 'var(--ink-tertiary)',
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--bg)',
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        minWidth: '120px',
                        borderRight: '1px solid var(--border)',
                      }}
                    >
                      Date
                    </th>
                    {chartQuestions.map((q) => (
                      <th
                        key={q.id}
                        className="v2-caption font-semibold"
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          color: 'var(--ink-tertiary)',
                          borderBottom: '1px solid var(--border)',
                          background: 'var(--bg)',
                          minWidth: '140px',
                          maxWidth: '220px',
                        }}
                      >
                        {q.question_text}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedDates.map((date, i) => (
                    <tr
                      key={date}
                      style={{
                        borderBottom: i < sortedDates.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <td
                        className="v2-small font-medium"
                        style={{
                          padding: '10px 16px',
                          color: 'var(--ink-secondary)',
                          whiteSpace: 'nowrap',
                          background: 'var(--bg)',
                          position: 'sticky',
                          left: 0,
                          zIndex: 2,
                          borderRight: '1px solid var(--border)',
                        }}
                      >
                        {formatDateShort(date)}
                      </td>
                      {chartQuestions.map((q) => {
                        const response = responseMap[`${date}:${q.id}`];
                        return (
                          <td
                            key={q.id}
                            style={{
                              padding: '10px 16px',
                              verticalAlign: 'top',
                            }}
                          >
                            {renderCellValue(response)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AnswersHistoryPage;
