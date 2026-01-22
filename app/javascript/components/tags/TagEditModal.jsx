import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../shared/BaseModal';
import { tagsApi } from '../../utils/api';
import useTagsStore from '../../stores/tagsStore';

const TagEditModal = () => {
  const { editModal, closeEditModal } = useTagsStore();
  const { isOpen, tagId, tagName: initialTagName } = editModal;
  const queryClient = useQueryClient();
  const [tagName, setTagName] = useState('');

  useEffect(() => {
    if (isOpen && initialTagName) {
      setTagName(initialTagName);
    }
  }, [isOpen, initialTagName]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data) => tagsApi.update(tagId, { tag: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['tag', tagId] });
      closeEditModal();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tagName.trim()) {
      updateMutation.mutate({ name: tagName.trim() });
    }
  };

  const footer = (
    <>
      <button
        type="button"
        onClick={closeEditModal}
        className="px-6 py-3 rounded-lg font-semibold transition"
        style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F', border: '0.5px solid rgba(199, 199, 204, 0.3)' }}
        disabled={updateMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="tag-edit-form"
        className="px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition cursor-pointer disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #A8A8AC 0%, #E5E5E7 45%, #FFFFFF 55%, #C7C7CC 70%, #8E8E93 100%)', border: '0.5px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3)', color: '#1D1D1F', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? 'Saving...' : 'Update Tag'}
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={closeEditModal}
      title="Edit Tag"
      footer={footer}
      maxWidth="max-w-md"
    >
      <form id="tag-edit-form" onSubmit={handleSubmit}>
        {updateMutation.isError && (
          <div
            className="mb-4 p-4 rounded-lg"
            style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
          >
            <i className="fa-solid fa-exclamation-circle mr-2"></i>
            {updateMutation.error?.message || 'An error occurred'}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>
            Tag Name
          </label>
          <input
            type="text"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg focus:outline-none transition font-light"
            style={{ border: '0.5px solid rgba(199, 199, 204, 0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 200 }}
            placeholder="Enter tag name"
            required
            autoFocus
          />
        </div>
      </form>
    </BaseModal>
  );
};

export default TagEditModal;
