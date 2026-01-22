import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import useCategoryStore from '../../stores/categoryStore';

const CategoryEditModal = () => {
  const queryClient = useQueryClient();
  const { categoryEditModal, closeCategoryEditModal } = useCategoryStore();
  const { isOpen, categoryId } = categoryEditModal;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6B8A99',
    icon: 'fa-check',
  });

  // Color mapping for preview
  const colorMap = {
    '#6B8A99': { light: '#E8EEF1', dark: '#1d3e4c' },
    '#9C8B7E': { light: '#E8E0D5', dark: '#5C4F45' },
    '#F8796D': { light: '#FFD4CE', dark: '#B8352A' },
    '#FFA07A': { light: '#FFE4D6', dark: '#D66A3E' },
    '#E5C730': { light: '#FEF7C3', dark: '#B89F0A' },
    '#A8A356': { light: '#E8EBCD', dark: '#7A7637' },
    '#7CB342': { light: '#D7EDCB', dark: '#4A6B27' },
    '#6EE7B7': { light: '#D1FAF0', dark: '#2C9D73' },
    '#22D3EE': { light: '#CFFAFE', dark: '#0E7490' },
    '#6366F1': { light: '#E0E7FF', dark: '#3730A3' },
    '#A78BFA': { light: '#EDE9FE', dark: '#6B21A8' },
    '#E879F9': { light: '#FAE8FF', dark: '#A21CAF' },
    '#FB7185': { light: '#FFE4E6', dark: '#BE123C' },
    '#9CA3A8': { light: '#E8E8E8', dark: '#4A5057' },
  };

  const icons = [
    'fa-check', 'fa-dumbbell', 'fa-book', 'fa-heart', 'fa-briefcase', 'fa-utensils',
    'fa-bed', 'fa-apple-whole', 'fa-mug-hot', 'fa-person-running', 'fa-pills', 'fa-brain',
    'fa-music', 'fa-paintbrush', 'fa-droplet', 'fa-users', 'fa-star', 'fa-pen'
  ];

  const colors = Object.keys(colorMap);

  // Fetch category data
  const { data: category } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      const response = await fetch(`/categories/${categoryId}.json`);
      if (!response.ok) throw new Error('Failed to fetch category');
      const data = await response.json();
      return data.category;
    },
    enabled: isOpen && !!categoryId,
  });

  // Load category data when editing
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        color: category.color || '#6B8A99',
        icon: category.icon || 'fa-check',
      });
    }
  }, [category]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch(`/categories/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': document.querySelector('[name=csrf-token]').content,
        },
        body: JSON.stringify({ category: data }),
      });
      if (!response.ok) throw new Error('Failed to update category');
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate and refetch
      await queryClient.refetchQueries({
        queryKey: ['category', categoryId],
        exact: false
      });
      closeCategoryEditModal();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': document.querySelector('[name=csrf-token]').content,
        },
      });
      if (!response.ok) throw new Error('Failed to delete category');
      return response.json();
    },
    onSuccess: () => {
      window.location.href = '/';
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      deleteMutation.mutate();
    }
  };

  const currentColors = colorMap[formData.color] || { light: '#E8EEF1', dark: '#1d3e4c' };

  const footer = (
    <>
      <button
        type="button"
        onClick={closeCategoryEditModal}
        className="px-6 py-3 rounded-lg font-semibold transition"
        style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F', border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
        disabled={updateMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="category-form"
        className="px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition cursor-pointer disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #A8A8AC 0%, #E5E5E7 45%, #FFFFFF 55%, #C7C7CC 70%, #8E8E93 100%)', border: '0.5px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3)', color: '#1D1D1F', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? 'Saving...' : 'Update Category'}
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={closeCategoryEditModal}
      title="Edit Category"
      footer={footer}
    >
      <form id="category-form" onSubmit={handleSubmit}>
        {updateMutation.isError && (
          <div
            className="mb-4 p-4 rounded-lg"
            style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
          >
            <i className="fa-solid fa-exclamation-circle mr-2"></i>
            {updateMutation.error?.message || 'An error occurred'}
          </div>
        )}

        {/* Preview Box */}
        <div className="mb-6">
          <p className="text-xs font-semibold mb-2" style={{ color: '#566e78' }}>
            PREVIEW
          </p>
          <div
            className="p-4 rounded-lg border-2"
            style={{
              backgroundColor: currentColors.light,
              borderColor: formData.color,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                style={{ backgroundColor: formData.color }}
              >
                <i className={`fa-solid ${formData.icon} text-white`}></i>
              </div>
              <span
                className="font-bold display-font"
                style={{ color: currentColors.dark }}
              >
                {formData.name || 'My Category'}
              </span>
            </div>
          </div>
        </div>

        {/* Category Name */}
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
            Category Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-4 py-3 rounded-lg focus:outline-none transition font-light"
            style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#1d3e4c' }}
          />
        </div>

        {/* Description */}
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
            Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full px-4 py-3 rounded-lg focus:outline-none transition font-light resize-none"
            style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#1d3e4c' }}
          />
        </div>

        {/* Icon Selector */}
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
            Icon
          </label>
          <div className="grid grid-cols-6 md:grid-cols-9 gap-2 max-w-md">
            {icons.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setFormData({ ...formData, icon })}
                className={`w-10 h-10 rounded-lg border-2 hover:border-theme-blue flex items-center justify-center transition ${
                  formData.icon === icon ? 'border-theme-blue bg-theme-blue-light/10' : 'border-gray-200'
                }`}
              >
                <i className={`fa-solid ${icon} text-base`} style={{ color: '#1d3e4c' }}></i>
              </button>
            ))}
          </div>
        </div>

        {/* Color Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
            Color
          </label>
          <div className="grid grid-cols-7 md:grid-cols-14 gap-2 max-w-md">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData({ ...formData, color })}
                className={`w-8 h-8 rounded-full border-2 shadow-md hover:scale-110 transition flex items-center justify-center ${
                  formData.color === color ? 'border-gray-800' : 'border-white'
                }`}
                style={{ backgroundColor: color }}
              >
                {formData.color === color && (
                  <i className="fa-solid fa-check text-white text-sm font-black"></i>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="pt-6 border-t border-gray-200">
          <p className="text-sm font-semibold mb-3" style={{ color: '#DC2626' }}>
            <i className="fa-solid fa-triangle-exclamation mr-2"></i>Danger Zone
          </p>
          <p className="text-xs font-light mb-4" style={{ color: '#566e78' }}>
            Deleting this category will archive it and all associated habits. This action can
            be undone.
          </p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="w-full py-2 px-4 rounded-lg font-semibold border-2 transition hover:bg-red-50"
            style={{ color: '#DC2626', borderColor: '#DC2626' }}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Category'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default CategoryEditModal;
