import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import useCategoryStore from '../../stores/categoryStore';

const HabitFormModal = ({ categoryColor }) => {
  const queryClient = useQueryClient();
  const { habitFormModal, closeHabitFormModal } = useCategoryStore();
  const { isOpen, mode, habitId, categoryId } = habitFormModal;

  const [formData, setFormData] = useState({
    name: '',
    target_count: 1,
    frequency_type: 'day',
    time_of_day: 'anytime',
    importance: 'normal',
  });

  // Fetch habit data if editing
  const { data: habit } = useQuery({
    queryKey: ['habit', habitId],
    queryFn: async () => {
      const response = await fetch(`/categories/${categoryId}/habits/${habitId}.json`);
      if (!response.ok) throw new Error('Failed to fetch habit');
      return response.json();
    },
    enabled: isOpen && mode === 'edit' && !!habitId && !!categoryId,
  });

  // Load habit data when editing
  useEffect(() => {
    if (habit && mode === 'edit') {
      setFormData({
        name: habit.name || '',
        target_count: habit.target_count || 1,
        frequency_type: habit.frequency_type || 'day',
        time_of_day: habit.time_of_day || 'anytime',
        importance: habit.importance || 'normal',
      });
    }
  }, [habit, mode]);

  // Reset form when modal opens for new habit
  useEffect(() => {
    if (isOpen && mode === 'new') {
      setFormData({
        name: '',
        target_count: 1,
        frequency_type: 'day',
        time_of_day: 'anytime',
        importance: 'normal',
      });
    }
  }, [isOpen, mode]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch(`/categories/${categoryId}/habits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': document.querySelector('[name=csrf-token]').content,
        },
        body: JSON.stringify({ habit: data }),
      });
      if (!response.ok) throw new Error('Failed to create habit');
      return response.json();
    },
    onSuccess: async (responseData) => {
      // Add the new habit to the category query data
      queryClient.setQueriesData(
        { queryKey: ['category', categoryId], exact: false },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            habits: [...oldData.habits, { ...responseData.habit, today_count: 0, habit_contents: [] }]
          };
        }
      );
      closeHabitFormModal();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch(`/categories/${categoryId}/habits/${habitId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': document.querySelector('[name=csrf-token]').content,
        },
        body: JSON.stringify({ habit: data }),
      });
      if (!response.ok) throw new Error('Failed to update habit');
      return response.json();
    },
    onSuccess: async (responseData, variables) => {
      // Update the category query data directly with the new habit data
      const allQueries = queryClient.getQueriesData({ queryKey: ['category'] });
      console.log('All category queries:', allQueries.map(([key]) => key));
      console.log('Looking for categoryId:', categoryId, typeof categoryId);
      console.log('habitId:', habitId, typeof habitId);

      const queries = queryClient.getQueriesData({ queryKey: ['category', categoryId] });
      console.log('Found queries:', queries.length);

      queries.forEach(([queryKey, data]) => {
        if (data) {
          console.log('Updating query:', queryKey);
          queryClient.setQueryData(queryKey, {
            ...data,
            habits: data.habits.map(h =>
              h.id === habitId ? { ...h, ...variables } : h
            )
          });
        }
      });

      closeHabitFormModal();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/categories/${categoryId}/habits/${habitId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': document.querySelector('[name=csrf-token]').content,
        },
      });
      if (!response.ok) throw new Error('Failed to delete habit');
      return response.json();
    },
    onSuccess: async () => {
      // Remove the habit from the category query data
      queryClient.setQueriesData(
        { queryKey: ['category', categoryId], exact: false },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            habits: oldData.habits.filter(h => h.id !== habitId)
          };
        }
      );
      closeHabitFormModal();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'edit') {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this habit?')) {
      deleteMutation.mutate();
    }
  };

  const currentMutation = mode === 'edit' ? updateMutation : createMutation;

  const footer = (
    <>
      {mode === 'edit' && (
        <button
          type="button"
          onClick={handleDelete}
          className="mr-auto px-6 py-3 rounded-lg font-semibold transition"
          style={{ color: '#DC2626' }}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        </button>
      )}
      <button
        type="button"
        onClick={closeHabitFormModal}
        className="px-6 py-3 rounded-lg font-semibold border-2 transition"
        style={{ color: '#1d3e4c', borderColor: '#E8EEF1' }}
        disabled={currentMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="habit-form"
        className="px-6 py-3 rounded-lg text-white font-semibold shadow-lg hover:shadow-xl transition cursor-pointer disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #1d3e4c, #45606b)' }}
        disabled={currentMutation.isPending}
      >
        {currentMutation.isPending
          ? 'Saving...'
          : mode === 'edit'
          ? 'Update Habit'
          : 'Create Habit'}
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={closeHabitFormModal}
      title={mode === 'edit' ? 'Edit Habit' : 'New Habit'}
      footer={footer}
    >
      <form id="habit-form" onSubmit={handleSubmit}>
        {currentMutation.isError && (
          <div
            className="mb-4 p-4 rounded-lg"
            style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
          >
            <i className="fa-solid fa-exclamation-circle mr-2"></i>
            {currentMutation.error?.message || 'An error occurred'}
          </div>
        )}

        {/* Habit Name */}
        <div className="mb-6">
          <label className="block mb-2">Habit Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
            style={{ borderColor: '#E8EEF1' }}
            placeholder="e.g., Morning meditation"
          />
        </div>

        {/* Frequency: Times per Period */}
        <div className="mb-6">
          <label className="block mb-2">Frequency</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-2 text-sm">Times</label>
              <input
                type="number"
                value={formData.target_count}
                onChange={(e) =>
                  setFormData({ ...formData, target_count: parseInt(e.target.value) || 1 })
                }
                min="1"
                className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
                style={{ borderColor: '#E8EEF1' }}
              />
            </div>
            <div>
              <label className="block mb-2 text-sm">Per</label>
              <select
                value={formData.frequency_type}
                onChange={(e) => setFormData({ ...formData, frequency_type: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
                style={{ borderColor: '#E8EEF1' }}
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Time of Day */}
        <div className="mb-6">
          <label className="block mb-2">Time of Day</label>
          <select
            value={formData.time_of_day}
            onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
            style={{ borderColor: '#E8EEF1' }}
          >
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="anytime">Anytime</option>
          </select>
        </div>

        {/* Importance */}
        <div className="mb-6">
          <label className="block mb-2">Importance</label>
          <select
            value={formData.importance}
            onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition font-light"
            style={{ borderColor: '#E8EEF1' }}
          >
            <option value="critical">Critical (!!)</option>
            <option value="important">Important (!)</option>
            <option value="normal">Normal</option>
            <option value="optional">Optional (?)</option>
          </select>
        </div>
      </form>
    </BaseModal>
  );
};

export default HabitFormModal;
