// Import the documentsStore
import useDocumentsStore from './stores/documentsStore';

// Expose the store globally for dashboard usage
window.openDocumentViewModal = (documentId) => {
  const { openViewModal } = useDocumentsStore.getState();
  openViewModal(documentId);
};

// Handle habit content modal display
document.addEventListener('click', function(e) {
  const contentLink = e.target.closest('[data-habit-content-modal]');

  if (contentLink) {
    e.preventDefault();
    const url = contentLink.href;

    // Extract document ID from URL (e.g., /contents/123 or /habit_contents/123)
    const matches = url.match(/\/(?:habit_)?contents\/(\d+)/);
    if (matches && matches[1]) {
      const documentId = parseInt(matches[1]);
      window.openDocumentViewModal(documentId);
    } else {
      console.error('Could not extract document ID from URL:', url);
    }
  }
});

// Keep the old function for backwards compatibility but make it do nothing
window.closeHabitContentModal = function() {
  // No longer needed - React modal handles its own closing
};
