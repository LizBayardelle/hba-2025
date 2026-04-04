import React, { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { goalsApi, categoriesApi, tagsApi, documentsApi } from '../../utils/api';
import useGoalsStore from '../../stores/goalsStore';
import GoalItem from './GoalItem';
import GoalFormModal from './GoalFormModal';
import GoalViewModal from './GoalViewModal';
import DocumentViewModal from '../documents/DocumentViewModal';
import DocumentFormModal from '../documents/DocumentFormModal';
import ListShowModal from '../lists/ListShowModal';

const GoalsPage = () => {
  const { statusFilter, groupBy, searchQuery, setStatusFilter, setGroupBy, setSearchQuery, openNewModal } = useGoalsStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status')) setStatusFilter(params.get('status'));
    if (params.get('groupBy')) setGroupBy(params.get('groupBy'));
    if (params.get('search')) setSearchQuery(params.get('search'));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'active') params.set('status', statusFilter);
    if (groupBy && groupBy !== 'none') params.set('groupBy', groupBy);
    if (searchQuery) params.set('search', searchQuery);
    window.history.replaceState({}, '', params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname);
  }, [statusFilter, groupBy, searchQuery]);

  const { data: goals = [], isLoading, error } = useQuery({
    queryKey: ['goals', statusFilter, searchQuery],
    queryFn: () => goalsApi.fetchAll({ status: statusFilter, ...(searchQuery ? { search: searchQuery } : {}) }),
  });

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.fetchAll });
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.fetchAll });
  const { data: documents = [] } = useQuery({ queryKey: ['documents'], queryFn: documentsApi.fetchAll });

  const groupedGoals = useMemo(() => {
    if (groupBy === 'none') return [{ title: 'All Goals', goals, hideHeader: true }];
    if (groupBy === 'category') {
      const groups = {}; const uncategorized = { title: 'Uncategorized', goals: [], color: '#9CA3A8', id: null };
      goals.forEach(g => { if (g.category) { const cid = g.category.id; if (!groups[cid]) groups[cid] = { id: cid, title: g.category.name, color: g.category.color, goals: [] }; groups[cid].goals.push(g); } else uncategorized.goals.push(g); });
      const result = Object.values(groups); if (uncategorized.goals.length > 0) result.push(uncategorized); return result;
    } else if (groupBy === 'type') {
      const groups = { counted: { title: 'Counted', goals: [] }, named_steps: { title: 'Named Steps', goals: [] } };
      goals.forEach(g => { if (groups[g.goal_type]) groups[g.goal_type].goals.push(g); });
      return Object.values(groups).filter(g => g.goals.length > 0);
    } else if (groupBy === 'importance') {
      const groups = {}; const noImp = { title: 'No Importance', goals: [], color: '#9CA3A8', id: null };
      goals.forEach(g => { if (g.importance_level) { const lid = g.importance_level.id; if (!groups[lid]) groups[lid] = { id: lid, title: g.importance_level.name, color: g.importance_level.color, goals: [] }; groups[lid].goals.push(g); } else noImp.goals.push(g); });
      const result = Object.values(groups).sort((a, b) => (a.rank || 0) - (b.rank || 0)); if (noImp.goals.length > 0) result.push(noImp); return result;
    }
    return [{ title: 'All Goals', goals }];
  }, [goals, groupBy]);

  const handleNewForGroup = (group) => {
    if (groupBy === 'category' && group.id) openNewModal({ categoryId: group.id });
    else if (groupBy === 'importance' && group.id) openNewModal({ importanceLevelId: group.id });
    else openNewModal({});
  };

  return (
    <>
      <div className="sticky top-0 z-10" style={{ background: 'var(--bg)' }}>
        <div className="pl-14 pr-4 pt-6 pb-4 md:pl-8 md:pr-8 md:pt-8 md:pb-5">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="v2-h1">Goals</h1>
              <p className="v2-small" style={{ marginTop: 4, color: 'var(--ink-tertiary)' }}>
                {goals.length > 0 ? `${goals.filter(g => !g.completed).length} active` : 'No goals yet'}
              </p>
            </div>
            <button onClick={() => openNewModal({})} className="v2-btn-sm v2-btn-primary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Goal
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="v2-seg-control">
              {[{ value: 'none', label: 'All' }, { value: 'category', label: 'Category' }, { value: 'type', label: 'Type' }, { value: 'importance', label: 'Importance' }].map(({ value, label }) => (
                <button key={value} onClick={() => setGroupBy(value)} className={`v2-seg-btn ${groupBy === value ? 'active' : ''}`}>{label}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none" style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
              <input type="checkbox" checked={statusFilter === 'active'} onChange={(e) => setStatusFilter(e.target.checked ? 'active' : 'all')} style={{ accentColor: 'var(--ink)', width: 15, height: 15 }} />
              Active only
            </label>
            <div className="relative flex-1 min-w-[160px] max-w-xs ml-auto">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search goals..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm focus:outline-none"
                style={{ border: '1px solid var(--border)', fontFamily: 'var(--font-body)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '0.833rem' }} />
            </div>
          </div>
        </div>
        <div style={{ height: 12, background: 'linear-gradient(to bottom, var(--bg), transparent)', pointerEvents: 'none' }} />
      </div>

      <div className="px-4 pb-16 md:px-8 space-y-4" style={{ maxWidth: 920, paddingTop: 8 }}>
        {isLoading && <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ink-faint)' }} /></div>}
        {error && <div className="v2-card text-center" style={{ padding: '48px 24px' }}><p className="v2-small" style={{ color: 'var(--overdue)' }}>Error: {error.message}</p></div>}
        {!isLoading && !error && goals.length === 0 && (
          <div className="v2-card text-center" style={{ padding: '48px 24px' }}>
            <p className="v2-body">No goals yet</p>
            <p className="v2-small" style={{ color: 'var(--ink-faint)', marginTop: 4 }}>Create your first goal to start tracking.</p>
            <button onClick={() => openNewModal({})} className="v2-btn v2-btn-primary" style={{ marginTop: 16 }}>New Goal</button>
          </div>
        )}
        {!isLoading && !error && goals.length > 0 && groupedGoals.map(group => {
          if (group.hideHeader) return <div key={group.title} className="space-y-3">{group.goals.map(g => <GoalItem key={g.id} goal={g} groupBy={groupBy} />)}</div>;
          return (
            <div key={group.title} className="v2-card" style={{ padding: 0 }}>
              <div className="v2-section-header" style={{ padding: '12px 18px 8px' }}>
                <div className="flex items-center gap-2">
                  {group.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: group.color, flexShrink: 0 }} />}
                  <span className="v2-section-title">{group.title}</span>
                  <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>{group.goals.length}</span>
                </div>
                <button onClick={() => handleNewForGroup(group)} className="v2-btn-icon-sm" title="New goal">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
              <div style={{ padding: '0 18px 12px' }} className="space-y-3">
                {group.goals.map(g => <GoalItem key={g.id} goal={g} groupBy={groupBy} />)}
              </div>
            </div>
          );
        })}
      </div>

      <GoalFormModal allTags={allTags} categories={categories} documents={documents} />
      <GoalViewModal />
      <DocumentViewModal />
      <DocumentFormModal />
      <ListShowModal />
    </>
  );
};

export default GoalsPage;
