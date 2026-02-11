import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ChecklistSection from '../shared/ChecklistSection';
import ListFormModal from './ListFormModal';
import useListsStore from '../../stores/listsStore';
import { listsApi, categoriesApi } from '../../utils/api';

// Get initial grouping from URL or user default
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

  // Toggle pin mutation
  const togglePinMutation = useMutation({
    mutationFn: listsApi.togglePin,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  // Update URL when groupBy changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (groupBy && groupBy !== 'type') {
      params.set('groupBy', groupBy);
    } else {
      params.delete('groupBy');
    }
    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [groupBy]);

  // Fetch lists data
  const { data, isLoading, error } = useQuery({
    queryKey: ['lists'],
    queryFn: listsApi.fetchAll,
  });

  // Fetch categories for grouping
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.fetchAll,
  });

  const lists = data?.lists || [];
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  // Filter based on search query
  const filterItem = (item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    if (item.name.toLowerCase().includes(query)) return true;
    if (item.category?.name?.toLowerCase().includes(query)) return true;
    if (item.checklist_items.some(ci => ci.name.toLowerCase().includes(query))) return true;
    return false;
  };

  const filteredLists = lists.filter(filterItem);

  // Helper to sort lists with pinned first
  const sortPinnedFirst = (items) => {
    return [...items].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  };

  // Group lists based on selected grouping
  const groupedLists = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', title: 'All Lists', lists: sortPinnedFirst(filteredLists), hideHeader: true }];
    }

    if (groupBy === 'type') {
      const groups = [
        { key: 'habits', title: 'Attached to Habits', icon: 'fa-chart-line', color: '#8E8E93', lists: [] },
        { key: 'tasks', title: 'Attached to Tasks', icon: 'fa-check', color: '#8E8E93', lists: [] },
        { key: 'standalone', title: 'Unassigned', icon: 'fa-list-check', color: '#8E8E93', lists: [] },
      ];

      filteredLists.forEach(list => {
        const hasHabits = list.habits && list.habits.length > 0;
        const hasTasks = list.tasks && list.tasks.length > 0;

        if (hasHabits) {
          groups[0].lists.push(list);
        } else if (hasTasks) {
          groups[1].lists.push(list);
        } else {
          groups[2].lists.push(list);
        }
      });

      // Sort pinned first within each group
      return groups.map(group => ({
        ...group,
        lists: sortPinnedFirst(group.lists),
      }));
    } else {
      // Group by category - start with all categories
      const result = categories.map(cat => ({
        key: `cat-${cat.id}`,
        title: cat.name,
        icon: cat.icon,
        color: cat.color,
        lists: [],
      }));

      // Add uncategorized group
      const uncategorized = { key: 'uncategorized', title: 'Uncategorized', icon: 'fa-folder', color: '#8E8E93', lists: [] };

      filteredLists.forEach(list => {
        if (list.category) {
          const group = result.find(g => g.key === `cat-${list.category.id}`);
          if (group) {
            group.lists.push(list);
          }
        } else {
          uncategorized.lists.push(list);
        }
      });

      // Sort by name and add uncategorized at the end
      result.sort((a, b) => a.title.localeCompare(b.title));
      result.push(uncategorized);

      // Sort pinned first within each group
      return result.map(group => ({
        ...group,
        lists: sortPinnedFirst(group.lists),
      }));
    }
  }, [filteredLists, groupBy, categories]);

  return (
    <>
      {/* Header Section */}
      <div style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-5xl font-display" style={{ color: '#1D1D1F' }}>
                Lists
              </h1>
              <p className="text-sm mt-1" style={{ color: '#8E8E93', fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
                Attach to habits for reusable checklists, or to tasks for single-use.
              </p>
            </div>

            <button
              onClick={openFormModal}
              className="w-12 h-12 rounded-xl text-white transition transform hover:scale-105 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
              title="New List"
            >
              <i className="fa-solid fa-plus text-lg"></i>
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
            {/* Group By */}
            <div>
              <span className="block text-xs uppercase tracking-wide mb-2" style={{ color: '#8E8E93', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                Group By
              </span>
              <div className="inline-flex rounded-lg overflow-hidden" style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)' }}>
                {[
                  { value: 'none', label: 'None' },
                  { value: 'type', label: 'Type' },
                  { value: 'category', label: 'Category' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setGroupBy(value)}
                    className="px-4 py-2 text-sm transition"
                    style={{
                      background: groupBy === value ? 'linear-gradient(to bottom, #A8A8AD 0%, #8E8E93 100%)' : '#F5F5F7',
                      color: groupBy === value ? '#FFFFFF' : '#1D1D1F',
                      fontWeight: 500,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="flex-1">
              <span className="block text-xs uppercase tracking-wide mb-2" style={{ color: '#8E8E93', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                Search
              </span>
              <div className="relative">
                <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#8E8E93' }}></i>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lists..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none"
                  style={{
                    border: '1px solid rgba(199, 199, 204, 0.4)',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 400,
                    background: '#F9F9FB',
                    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.08)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-8 pb-8">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#2C2C2E' }}></div>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-12 text-center" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)' }}>
            <i className="fa-solid fa-exclamation-circle text-6xl mb-4" style={{ color: '#DC2626' }}></i>
            <p style={{ color: '#DC2626', fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Error loading lists: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && (
          <div>
            {groupedLists.map((group, index) => (
              <div key={group.key} className={index !== 0 ? 'mt-8' : (group.hideHeader ? 'mt-6' : '')}>
                {/* Full-width stripe header */}
                {!group.hideHeader && (
                  <div
                    className="-mx-8 px-8 py-4 mb-4 flex items-center gap-3"
                    style={{
                      background: `linear-gradient(to bottom, color-mix(in srgb, ${group.color} 85%, white) 0%, ${group.color} 100%)`,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    <i className={`fa-solid ${group.icon} text-white text-lg`}></i>
                    <h3 className="text-3xl flex-1 text-white font-display" style={{ fontWeight: 500 }}>
                      {group.title} ({group.lists.length})
                    </h3>
                    <button
                      onClick={openFormModal}
                      className="w-8 h-8 rounded-md flex items-center justify-center transition btn-glass"
                      title="New list"
                    >
                      <i className="fa-solid fa-plus text-white"></i>
                    </button>
                  </div>
                )}
                {group.lists.length > 0 ? (
                  <div className="space-y-4">
                    {group.lists.map((list) => (
                      <ListCard
                        key={list.id}
                        list={list}
                        onEdit={openEditModal}
                        onTogglePin={() => togglePinMutation.mutate(list.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="py-3 text-sm" style={{ color: '#8E8E93', fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
                    No current lists
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <ListFormModal />
    </>
  );
};

const ListCard = ({ list, onEdit, onTogglePin }) => {
  const color = list.category?.color || '#1d3e4c';
  const completedCount = list.checklist_items.filter(i => i.completed).length;
  const totalCount = list.checklist_items.length;

  return (
    <div
      className="rounded-xl p-5 transition relative"
      style={{
        background: '#FFFFFF',
        border: list.pinned ? '1px solid rgba(45, 45, 47, 0.3)' : '0.5px solid rgba(199, 199, 204, 0.2)',
        boxShadow: list.pinned
          ? '0 1px 3px rgba(45, 45, 47, 0.15), 0 0 0 0.5px rgba(45, 45, 47, 0.2)'
          : '0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(199, 199, 204, 0.2)',
      }}
    >
      {/* Pin toggle button - top right */}
      <button
        onClick={onTogglePin}
        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center transition hover:scale-110 rounded-full hover:bg-gray-100"
        title={list.pinned ? 'Unpin list' : 'Pin list'}
      >
        <i
          className={`fa-solid fa-thumbtack text-sm transition ${list.pinned ? '' : 'opacity-30 hover:opacity-60'}`}
          style={{ color: list.pinned ? '#2D2D2F' : '#8E8E93' }}
        ></i>
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-3 pr-8">
        <div className="flex items-center gap-3">
          {/* Category Icon */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: color }}
          >
            {list.category ? (
              <i className={`fa-solid ${list.category.icon} text-white`}></i>
            ) : (
              <i className="fa-solid fa-list-check text-white"></i>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3
                className="font-semibold"
                style={{ color: '#1D1D1F', fontFamily: "'Inter', sans-serif" }}
              >
                {list.name}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: '#8E8E93' }}>
              {list.category && (
                <span>{list.category.name}</span>
              )}
              {!list.category && (
                <span>No category</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit Button */}
          <button
            onClick={() => onEdit(list.id)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-gray-200"
            style={{ backgroundColor: '#F5F5F7' }}
            title="Edit list"
          >
            <i className="fa-solid fa-pen text-sm" style={{ color: '#636366' }}></i>
          </button>

          {/* Progress Badge */}
          <div
            className="px-3 py-1.5 rounded-lg font-semibold text-sm"
            style={{
              backgroundColor: completedCount === totalCount ? '#D1FAE5' : `${color}15`,
              color: completedCount === totalCount ? '#059669' : color,
            }}
          >
            {completedCount}/{totalCount}
          </div>
        </div>
      </div>

      {/* Checklist */}
      <ChecklistSection
        parentType="list"
        parentId={list.id}
        items={list.checklist_items}
        color={color}
        editable={false}
        compact={true}
      />
    </div>
  );
};

export default ListsPage;
