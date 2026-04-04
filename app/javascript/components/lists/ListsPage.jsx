import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ChecklistSection from '../shared/ChecklistSection';
import ListFormModal from './ListFormModal';
import useListsStore from '../../stores/listsStore';
import { listsApi, categoriesApi } from '../../utils/api';

const getInitialGrouping = () => {
  const params = new URLSearchParams(window.location.search);
  const urlGroupBy = params.get('groupBy');
  if (urlGroupBy) return urlGroupBy;
  const rootElement = document.getElementById('lists-react-root');
  return rootElement?.dataset?.defaultGrouping || 'type';
};

const ListsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState(getInitialGrouping);
  const { openFormModal, openEditModal } = useListsStore();
  const queryClient = useQueryClient();

  const togglePinMutation = useMutation({
    mutationFn: listsApi.togglePin,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['lists'] }); },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (groupBy && groupBy !== 'type') params.set('groupBy', groupBy); else params.delete('groupBy');
    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [groupBy]);

  const { data, isLoading, error } = useQuery({ queryKey: ['lists'], queryFn: listsApi.fetchAll });
  const { data: categoriesData } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.fetchAll });

  const lists = data?.lists || [];
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const filteredLists = lists.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.category?.name?.toLowerCase().includes(q) || item.checklist_items.some(ci => ci.name.toLowerCase().includes(q));
  });

  const sortPinnedFirst = (items) => [...items].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const groupedLists = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', title: 'All Lists', lists: sortPinnedFirst(filteredLists), hideHeader: true }];

    if (groupBy === 'type') {
      const groups = [
        { key: 'habits', title: 'Attached to Habits', lists: [] },
        { key: 'tasks', title: 'Attached to Tasks', lists: [] },
        { key: 'standalone', title: 'Unassigned', lists: [] },
      ];
      filteredLists.forEach(list => {
        if (list.habits?.length > 0) groups[0].lists.push(list);
        else if (list.tasks?.length > 0) groups[1].lists.push(list);
        else groups[2].lists.push(list);
      });
      return groups.map(g => ({ ...g, lists: sortPinnedFirst(g.lists) }));
    } else {
      const result = categories.map(cat => ({ key: `cat-${cat.id}`, title: cat.name, color: cat.color, icon: cat.icon, lists: [] }));
      const uncategorized = { key: 'uncategorized', title: 'Uncategorized', color: '#9CA3A8', lists: [] };
      filteredLists.forEach(list => {
        if (list.category) { const g = result.find(g => g.key === `cat-${list.category.id}`); if (g) g.lists.push(list); }
        else uncategorized.lists.push(list);
      });
      result.sort((a, b) => a.title.localeCompare(b.title));
      result.push(uncategorized);
      return result.map(g => ({ ...g, lists: sortPinnedFirst(g.lists) }));
    }
  }, [filteredLists, groupBy, categories]);

  return (
    <>
      {/* v2 Header */}
      <div className="sticky top-0 z-10" style={{ background: 'var(--bg)' }}>
        <div className="pl-14 pr-4 pt-6 pb-4 md:pl-8 md:pr-8 md:pt-8 md:pb-5">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="v2-h1">Lists</h1>
              <p className="v2-small" style={{ marginTop: 4, color: 'var(--ink-tertiary)' }}>Reusable checklists for habits and tasks.</p>
            </div>
            <button onClick={openFormModal} className="v2-btn-sm v2-btn-primary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New List
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="v2-seg-control">
              {[{ value: 'none', label: 'All' }, { value: 'type', label: 'Type' }, { value: 'category', label: 'Category' }].map(({ value, label }) => (
                <button key={value} onClick={() => setGroupBy(value)} className={`v2-seg-btn ${groupBy === value ? 'active' : ''}`}>{label}</button>
              ))}
            </div>

            <div className="relative flex-1 min-w-[160px] max-w-xs ml-auto">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search lists..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm focus:outline-none"
                style={{ border: '1px solid var(--border)', fontFamily: 'var(--font-body)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '0.833rem' }} />
            </div>
          </div>
        </div>
        <div style={{ height: 12, background: 'linear-gradient(to bottom, var(--bg), transparent)', pointerEvents: 'none' }} />
      </div>

      {/* Content */}
      <div className="px-4 pb-16 md:px-8 space-y-4" style={{ maxWidth: 920, paddingTop: 8 }}>
        {isLoading && <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ink-faint)' }} /></div>}
        {error && <div className="v2-card text-center" style={{ padding: '48px 24px' }}><p className="v2-small" style={{ color: 'var(--overdue)' }}>Error: {error.message}</p></div>}

        {!isLoading && !error && groupedLists.map((group) => {
          if (group.hideHeader) {
            return (
              <div key={group.key} className="space-y-3">
                {group.lists.map(list => <ListCard key={list.id} list={list} onEdit={openEditModal} onTogglePin={() => togglePinMutation.mutate(list.id)} />)}
              </div>
            );
          }

          return (
            <div key={group.key} className="v2-card" style={{ padding: 0 }}>
              <div className="v2-section-header" style={{ padding: '12px 18px 8px' }}>
                <div className="flex items-center gap-2">
                  {group.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: group.color, flexShrink: 0 }} />}
                  <span className="v2-section-title">{group.title}</span>
                  <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>{group.lists.length}</span>
                </div>
                <button onClick={openFormModal} className="v2-btn-icon-sm" title="New list">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
              {group.lists.length > 0 ? (
                <div style={{ padding: '0 18px 12px' }} className="space-y-3">
                  {group.lists.map(list => <ListCard key={list.id} list={list} onEdit={openEditModal} onTogglePin={() => togglePinMutation.mutate(list.id)} />)}
                </div>
              ) : (
                <p className="v2-small" style={{ padding: '12px 18px 16px', color: 'var(--ink-faint)' }}>No lists</p>
              )}
            </div>
          );
        })}
      </div>

      <ListFormModal />
    </>
  );
};

const ListCard = ({ list, onEdit, onTogglePin }) => {
  const color = list.category?.color || 'var(--ink)';
  const completedCount = list.checklist_items.filter(i => i.completed).length;
  const totalCount = list.checklist_items.length;

  return (
    <div style={{ padding: '14px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', position: 'relative' }}>
      {/* Header row */}
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div className="flex items-center gap-2.5">
          {list.category && <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />}
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.933rem', fontWeight: 500, color: 'var(--ink)' }}>{list.name}</span>
          {list.pinned && <i className="fa-solid fa-thumbtack" style={{ fontSize: '0.55rem', color: 'var(--ink-faint)', transform: 'rotate(30deg)' }} />}
          <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>
            {completedCount}/{totalCount}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={onTogglePin} className="v2-btn-icon-sm" title={list.pinned ? 'Unpin' : 'Pin'}>
            <i className={`fa-solid fa-thumbtack`} style={{ fontSize: '0.6rem', color: list.pinned ? 'var(--ink)' : 'var(--ink-faint)', opacity: list.pinned ? 1 : 0.4 }} />
          </button>
          <button onClick={() => onEdit(list.id)} className="v2-btn-icon-sm" title="Edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </button>
        </div>
      </div>

      {/* Checklist */}
      <ChecklistSection parentType="list" parentId={list.id} items={list.checklist_items} color={color} editable={false} compact={true} />
    </div>
  );
};

export default ListsPage;
