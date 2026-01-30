import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import useListsStore from '../../stores/listsStore';
import { categoriesApi, checklistItemsApi, listsApi } from '../../utils/api';

const ListFormModal = () => {
  const queryClient = useQueryClient();
  const { formModal, closeFormModal } = useListsStore();
  const { isOpen, mode, itemId } = formModal;

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
  });
  const [checklistItems, setChecklistItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [itemsToDelete, setItemsToDelete] = useState([]);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.fetchAll,
  });

  // Fetch existing list data when editing
  const { data: existingList } = useQuery({
    queryKey: ['list', itemId],
    queryFn: () => listsApi.fetchOne(itemId),
    enabled: isOpen && mode === 'edit' && !!itemId,
  });

  // Load existing data when editing
  useEffect(() => {
    if (mode === 'edit' && existingList) {
      setFormData({
        name: existingList.name || '',
        category_id: existingList.category_id || '',
      });
      setChecklistItems(
        (existingList.checklist_items || []).map(item => ({
          ...item,
          isExisting: true,
        }))
      );
      setItemsToDelete([]);
    }
  }, [mode, existingList]);

  // Reset form when modal opens for new
  useEffect(() => {
    if (isOpen && mode === 'new') {
      setFormData({ name: '', category_id: '' });
      setChecklistItems([]);
      setNewItemName('');
      setItemsToDelete([]);
    }
  }, [isOpen, mode]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Create the list first
      const listResponse = await listsApi.create({
        name: data.name,
        category_id: data.category_id || null,
      });

      const listId = listResponse.list.id;

      // Create checklist items
      for (let i = 0; i < data.checklistItems.length; i++) {
        const item = data.checklistItems[i];
        await checklistItemsApi.createForList(listId, {
          name: item.name,
          position: i,
        });
      }

      return listResponse;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
      closeFormModal();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // Update the list name and category
      await listsApi.update(itemId, {
        name: data.name,
        category_id: data.category_id || null,
      });

      // Delete removed items
      for (const deleteId of data.itemsToDelete) {
        await checklistItemsApi.deleteForList(itemId, deleteId);
      }

      // Add new items
      const newItems = data.checklistItems.filter(item => !item.isExisting);
      for (let i = 0; i < newItems.length; i++) {
        const item = newItems[i];
        await checklistItemsApi.createForList(itemId, {
          name: item.name,
          position: data.checklistItems.length + i,
        });
      }

      return { success: true };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
      await queryClient.invalidateQueries({ queryKey: ['list', itemId] });
      await queryClient.invalidateQueries({ queryKey: ['habits'] });
      closeFormModal();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => listsApi.delete(itemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
      await queryClient.invalidateQueries({ queryKey: ['habits'] });
      closeFormModal();
    },
  });

  const handleAddItem = (e) => {
    e.preventDefault();
    if (newItemName.trim()) {
      setChecklistItems([...checklistItems, { name: newItemName.trim(), id: `new-${Date.now()}`, isExisting: false }]);
      setNewItemName('');
    }
  };

  const handleRemoveItem = (item) => {
    if (item.isExisting) {
      setItemsToDelete([...itemsToDelete, item.id]);
    }
    setChecklistItems(checklistItems.filter((i) => i.id !== item.id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (checklistItems.length === 0) return;

    if (mode === 'edit') {
      updateMutation.mutate({
        ...formData,
        checklistItems,
        itemsToDelete,
      });
    } else {
      createMutation.mutate({
        ...formData,
        checklistItems,
      });
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this list? This will also remove it from any attached habits or tasks.')) {
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
          className="mr-auto w-10 h-10 rounded-lg transition hover:bg-white/10 flex items-center justify-center"
          disabled={deleteMutation.isPending}
          title="Delete list"
        >
          {deleteMutation.isPending ? (
            <i className="fa-solid fa-spinner fa-spin text-white"></i>
          ) : (
            <i className="fa-solid fa-trash text-white text-lg"></i>
          )}
        </button>
      )}
      <button
        type="button"
        onClick={closeFormModal}
        className="px-6 py-3 rounded-lg transition text-white hover:opacity-70"
        style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
        disabled={currentMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="list-form"
        className="px-6 py-3 rounded-lg transition cursor-pointer disabled:opacity-50 hover:opacity-90"
        style={{
          background: 'linear-gradient(135deg, #A8A8AC 0%, #E5E5E7 45%, #FFFFFF 55%, #C7C7CC 70%, #8E8E93 100%)',
          border: '0.5px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
          color: '#1D1D1F',
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
        }}
        disabled={currentMutation.isPending || !formData.name.trim() || checklistItems.length === 0}
      >
        {currentMutation.isPending
          ? (mode === 'edit' ? 'Saving...' : 'Creating...')
          : (mode === 'edit' ? 'Save Changes' : 'Create List')}
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={closeFormModal}
      title={mode === 'edit' ? 'Edit List' : 'Create a New List'}
      footer={footer}
    >
      <form id="list-form" onSubmit={handleSubmit}>
        {currentMutation.isError && (
          <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            <i className="fa-solid fa-exclamation-circle mr-2"></i>
            {currentMutation.error?.message || 'An error occurred'}
          </div>
        )}

        {/* List Name */}
        <div className="mb-6">
          <label
            className="block mb-2"
            style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}
          >
            List Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-4 py-3 rounded-lg focus:outline-none transition"
            style={{
              border: '0.5px solid rgba(199, 199, 204, 0.3)',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 200,
            }}
            placeholder="e.g., Shopping List"
            autoFocus={mode === 'new'}
          />
        </div>

        {/* Category (optional) */}
        <div className="mb-6">
          <label
            className="block mb-2"
            style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}
          >
            Category (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, category_id: '' })}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full transition hover:scale-105 ${
                formData.category_id === '' ? 'ring-2 ring-offset-2' : ''
              }`}
              style={{
                backgroundColor: formData.category_id === '' ? '#1D1D1F' : 'white',
                border: '1px solid ' + (formData.category_id === '' ? '#1D1D1F' : 'rgba(199, 199, 204, 0.4)'),
                '--tw-ring-color': '#000000',
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: formData.category_id === '' ? 'rgba(255,255,255,0.25)' : '#1D1D1F' }}
              >
                <i className="fa-solid fa-inbox text-white text-xs"></i>
              </div>
              <span
                style={{
                  fontWeight: 500,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.8125rem',
                  color: formData.category_id === '' ? 'white' : '#1D1D1F',
                  whiteSpace: 'nowrap',
                }}
              >
                No Category
              </span>
            </button>

            {categories?.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setFormData({ ...formData, category_id: category.id })}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full transition hover:scale-105 ${
                  formData.category_id === category.id ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{
                  backgroundColor: formData.category_id === category.id ? category.color : 'white',
                  border:
                    '1px solid ' +
                    (formData.category_id === category.id ? category.color : 'rgba(199, 199, 204, 0.4)'),
                  '--tw-ring-color': category.color,
                }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor:
                      formData.category_id === category.id ? 'rgba(255,255,255,0.25)' : category.color,
                  }}
                >
                  <i className={`fa-solid ${category.icon} text-white text-xs`}></i>
                </div>
                <span
                  style={{
                    fontWeight: 500,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.8125rem',
                    color: formData.category_id === category.id ? 'white' : '#1D1D1F',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Checklist Items */}
        <div className="mb-6">
          <label
            className="block mb-2"
            style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}
          >
            Checklist Items
          </label>

          {checklistItems.length > 0 && (
            <div className="space-y-2 mb-3">
              {checklistItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2 rounded-lg"
                  style={{ backgroundColor: '#F5F5F7' }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ backgroundColor: '#E5E5E7', color: '#1D1D1F' }}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={`flex-1 ${item.completed ? 'line-through opacity-60' : ''}`}
                    style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#1D1D1F' }}
                  >
                    {item.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item)}
                    className="w-6 h-6 rounded hover:bg-gray-200 flex items-center justify-center transition"
                  >
                    <i className="fa-solid fa-times text-xs text-gray-400"></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddItem(e);
                }
              }}
              className="flex-1 px-4 py-2 rounded-lg focus:outline-none transition"
              style={{
                border: '0.5px solid rgba(199, 199, 204, 0.3)',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 200,
              }}
              placeholder="Add an item..."
            />
            <button
              type="button"
              onClick={handleAddItem}
              disabled={!newItemName.trim()}
              className="px-4 py-2 rounded-lg transition disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)',
                color: 'white',
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <i className="fa-solid fa-plus"></i>
            </button>
          </div>

          {checklistItems.length === 0 && (
            <p
              className="text-xs mt-2"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: '#8E8E93' }}
            >
              Add at least one item to create a list
            </p>
          )}
        </div>
      </form>
    </BaseModal>
  );
};

export default ListFormModal;
