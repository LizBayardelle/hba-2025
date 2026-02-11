import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
import useCategoryStore from '../../stores/categoryStore';
import {
  presetColors,
  getColorVariants,
  hasGoodContrastWithWhite,
  isValidHexColor,
  normalizeHex,
} from '../../utils/colorUtils';

const CategoryEditModal = () => {
  const queryClient = useQueryClient();
  const { categoryEditModal, closeCategoryEditModal } = useCategoryStore();
  const { isOpen, categoryId } = categoryEditModal;
  const colorInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6B8A99',
    icon: 'fa-check',
  });
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customColorInput, setCustomColorInput] = useState('');

  // Save status tracking
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'saved', 'error'
  const saveTimeoutRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  const icons = [
    'fa-check', 'fa-dumbbell', 'fa-book', 'fa-heart', 'fa-briefcase', 'fa-utensils',
    'fa-bed', 'fa-apple-whole', 'fa-mug-hot', 'fa-person-running', 'fa-pills', 'fa-brain',
    'fa-music', 'fa-paintbrush', 'fa-droplet', 'fa-users', 'fa-star', 'fa-pen'
  ];

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
      setCustomColorInput(category.color || '#6B8A99');
      setSaveStatus(null);
    }
  }, [category]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  // Show saved status briefly
  const showSavedStatus = useCallback(() => {
    setSaveStatus('saved');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus(null);
    }, 2000);
  }, []);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
      showSavedStatus();
    },
    onError: () => {
      setSaveStatus('error');
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

  // Auto-save (debounced)
  const autoSave = useCallback((newFormData) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    if (!newFormData.name.trim()) return;

    setSaveStatus('saving');
    debounceTimeoutRef.current = setTimeout(() => {
      updateMutation.mutate(newFormData);
    }, 500);
  }, [updateMutation]);

  // Handle field changes with auto-save
  const handleNameChange = (e) => {
    const newFormData = { ...formData, name: e.target.value };
    setFormData(newFormData);
    autoSave(newFormData);
  };

  const handleDescriptionChange = (e) => {
    const newFormData = { ...formData, description: e.target.value };
    setFormData(newFormData);
    autoSave(newFormData);
  };

  const handleIconChange = (icon) => {
    const newFormData = { ...formData, icon };
    setFormData(newFormData);
    if (formData.name.trim()) {
      setSaveStatus('saving');
      updateMutation.mutate(newFormData);
    }
  };

  // Handle custom color from native picker
  const handleNativeColorChange = (e) => {
    const color = normalizeHex(e.target.value);
    const newFormData = { ...formData, color };
    setFormData(newFormData);
    setCustomColorInput(color);
    if (formData.name.trim()) {
      setSaveStatus('saving');
      updateMutation.mutate(newFormData);
    }
  };

  // Handle custom hex input
  const handleCustomHexInput = (e) => {
    const value = e.target.value;
    setCustomColorInput(value);
    if (isValidHexColor(value)) {
      const color = normalizeHex(value);
      const newFormData = { ...formData, color };
      setFormData(newFormData);
      if (formData.name.trim()) {
        setSaveStatus('saving');
        updateMutation.mutate(newFormData);
      }
    }
  };

  // Handle preset color selection
  const handlePresetColor = (color) => {
    const newFormData = { ...formData, color };
    setFormData(newFormData);
    setShowCustomPicker(false);
    setCustomColorInput(color);
    if (formData.name.trim()) {
      setSaveStatus('saving');
      updateMutation.mutate(newFormData);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this category? This will archive all associated habits.')) {
      deleteMutation.mutate();
    }
  };

  const handleClose = () => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    closeCategoryEditModal();
    // Refresh page to update sidebar with new color
    window.location.reload();
  };

  // Get dynamic color variants
  const colorVariants = getColorVariants(formData.color);
  const hasGoodContrast = hasGoodContrastWithWhite(formData.color);

  // Header actions - save status and delete button
  const headerActions = (
    <div className="flex items-center gap-3">
      {/* Save status indicator */}
      {saveStatus && (
        <div className="flex items-center gap-2 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
          {saveStatus === 'saving' && (
            <>
              <i className="fa-solid fa-spinner fa-spin" style={{ color: '#8E8E93' }}></i>
              <span style={{ color: '#8E8E93' }}>Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <i className="fa-solid fa-check" style={{ color: '#22C55E' }}></i>
              <span style={{ color: '#22C55E' }}>Saved</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <i className="fa-solid fa-exclamation-circle" style={{ color: '#DC2626' }}></i>
              <span style={{ color: '#DC2626' }}>Error</span>
            </>
          )}
        </div>
      )}

      {/* Delete button */}
      <button
        type="button"
        onClick={handleDelete}
        className="w-9 h-9 rounded-lg transition hover:bg-red-50 flex items-center justify-center"
        disabled={deleteMutation.isPending}
        title="Delete category"
      >
        {deleteMutation.isPending ? (
          <i className="fa-solid fa-spinner fa-spin" style={{ color: '#DC2626' }}></i>
        ) : (
          <i className="fa-solid fa-trash" style={{ color: '#DC2626' }}></i>
        )}
      </button>
    </div>
  );

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={handleClose}
      title={formData.name || 'Edit Category'}
      headerActions={headerActions}
    >
      <div>
        {/* Category Name */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
            Category Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            className="w-full px-4 py-3 rounded-lg focus:outline-none transition font-light"
            style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#1d3e4c' }}
            placeholder="e.g., Health & Fitness"
          />
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
            Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={handleDescriptionChange}
            rows={2}
            className="w-full px-4 py-3 rounded-lg focus:outline-none transition font-light resize-none"
            style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#1d3e4c' }}
            placeholder="Optional description"
          />
        </div>

        {/* Icon Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
            Icon
          </label>
          <div className="grid grid-cols-6 md:grid-cols-9 gap-2 max-w-md">
            {icons.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => handleIconChange(icon)}
                className={`w-10 h-10 rounded-lg border-2 hover:border-theme-blue flex items-center justify-center transition ${
                  formData.icon === icon ? 'border-theme-blue bg-theme-blue-light/10' : 'border-gray-200'
                }`}
              >
                <i className={`fa-solid ${icon} text-base`} style={{ color: '#1d3e4c' }}></i>
              </button>
            ))}
          </div>
        </div>

        {/* Color Preview - right above color picker */}
        <div className="mb-4">
          <p className="text-xs font-semibold mb-2" style={{ color: '#566e78' }}>
            COLOR PREVIEW
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Preview on white background */}
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E5E7' }}>
              <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: '#8E8E93' }}>On White</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: formData.color }}
                >
                  <i className={`fa-solid ${formData.icon} text-white text-xs`}></i>
                </div>
                <span className="text-sm font-semibold" style={{ color: colorVariants.dark }}>
                  {formData.name || 'Category'}
                </span>
              </div>
            </div>

            {/* Preview on dark background */}
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#1D1D1F' }}>
              <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: '#8E8E93' }}>On Dark</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: formData.color }}
                >
                  <i className={`fa-solid ${formData.icon} text-white text-xs`}></i>
                </div>
                <span className="text-sm font-semibold" style={{ color: formData.color }}>
                  {formData.name || 'Category'}
                </span>
              </div>
            </div>

            {/* Badge preview */}
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#F5F5F7' }}>
              <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: '#8E8E93' }}>As Badge</p>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: formData.color, color: 'white' }}
              >
                <i className={`fa-solid ${formData.icon} text-[10px]`}></i>
                {formData.name || 'Category'}
              </span>
            </div>

            {/* Light background preview */}
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: colorVariants.light, border: `1px solid ${formData.color}40` }}
            >
              <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: '#8E8E93' }}>Light BG</p>
              <span className="text-sm font-semibold" style={{ color: colorVariants.dark }}>
                {formData.name || 'Category'}
              </span>
            </div>
          </div>

          {/* Contrast warning */}
          {!hasGoodContrast && (
            <div className="mt-3 p-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: '#FEF3C7' }}>
              <i className="fa-solid fa-triangle-exclamation text-sm" style={{ color: '#D97706' }}></i>
              <span className="text-xs" style={{ color: '#92400E' }}>
                This color may be hard to read with white text. Consider a darker shade.
              </span>
            </div>
          )}
        </div>

        {/* Color Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
            Color
          </label>

          {/* Preset colors */}
          <div className="flex flex-wrap gap-2 mb-3">
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handlePresetColor(color)}
                className={`w-8 h-8 rounded-full border-2 shadow-md hover:scale-110 transition flex items-center justify-center ${
                  formData.color === color && !showCustomPicker ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-400' : 'border-white'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              >
                {formData.color === color && !showCustomPicker && (
                  <i className="fa-solid fa-check text-white text-sm font-black drop-shadow"></i>
                )}
              </button>
            ))}

            {/* Custom color button */}
            <button
              type="button"
              onClick={() => {
                setShowCustomPicker(!showCustomPicker);
                setCustomColorInput(formData.color);
              }}
              className={`w-8 h-8 rounded-full border-2 shadow-md hover:scale-110 transition flex items-center justify-center ${
                showCustomPicker || !presetColors.includes(formData.color) ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-400' : 'border-gray-300'
              }`}
              style={{
                background: showCustomPicker || !presetColors.includes(formData.color)
                  ? formData.color
                  : 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
              }}
              title="Custom color"
            >
              {(showCustomPicker || !presetColors.includes(formData.color)) && (
                <i className="fa-solid fa-palette text-white text-xs drop-shadow"></i>
              )}
            </button>
          </div>

          {/* Custom color picker (expandable) */}
          {showCustomPicker && (
            <div className="p-4 rounded-lg mb-2" style={{ backgroundColor: '#F5F5F7', border: '1px solid #E5E5E7' }}>
              <div className="flex items-center gap-3">
                {/* Native color picker */}
                <div className="relative">
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={formData.color}
                    onChange={handleNativeColorChange}
                    className="w-12 h-12 rounded-lg cursor-pointer border-2 border-white shadow-md"
                    style={{ padding: 0 }}
                  />
                </div>

                {/* Hex input */}
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: '#8E8E93' }}>Hex Code</label>
                  <input
                    type="text"
                    value={customColorInput}
                    onChange={handleCustomHexInput}
                    placeholder="#6B8A99"
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                    style={{
                      border: isValidHexColor(customColorInput) || !customColorInput ? '1px solid #E5E5E7' : '1px solid #DC2626',
                      backgroundColor: 'white',
                    }}
                  />
                  {customColorInput && !isValidHexColor(customColorInput) && (
                    <p className="text-xs mt-1" style={{ color: '#DC2626' }}>Invalid hex color</p>
                  )}
                </div>

                {/* Current color preview */}
                <div className="text-center">
                  <div
                    className="w-12 h-12 rounded-lg shadow-inner flex items-center justify-center"
                    style={{ backgroundColor: formData.color }}
                  >
                    <i className={`fa-solid ${formData.icon} text-white`}></i>
                  </div>
                  <p className="text-xs mt-1 font-mono" style={{ color: '#8E8E93' }}>{formData.color}</p>
                </div>
              </div>
            </div>
          )}

          {/* Show current color if it's custom (not in presets) */}
          {!showCustomPicker && !presetColors.includes(formData.color) && (
            <p className="text-xs" style={{ color: '#8E8E93' }}>
              Custom color: <span className="font-mono">{formData.color}</span>
            </p>
          )}
        </div>
      </div>
    </SlideOverPanel>
  );
};

export default CategoryEditModal;
