import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import SlideOverPanel from '../shared/SlideOverPanel';
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
        className="btn-liquid-outline-light"
        disabled={updateMutation.isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="tag-edit-form"
        className="btn-liquid"
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? 'Saving...' : 'Update Tag'}
      </button>
    </>
  );

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={closeEditModal}
      title="Edit Tag"
      footer={footer}
    >
      <form id="tag-edit-form" onSubmit={handleSubmit}>
        {updateMutation.isError && (
          <div className="form-error">
            <i className="fa-solid fa-circle-exclamation form-error-icon"></i>
            <span className="form-error-text">
              {updateMutation.error?.message || 'An error occurred'}
            </span>
          </div>
        )}

        <div className="mb-6">
          <label className="form-label">
            Tag Name
          </label>
          <input
            type="text"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            className="form-input-hero"
            placeholder="Enter tag name"
            required
            autoFocus
          />
        </div>
      </form>
    </SlideOverPanel>
  );
};

export default TagEditModal;
