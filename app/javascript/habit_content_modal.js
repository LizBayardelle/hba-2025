// Handle habit content modal display
document.addEventListener('click', function(e) {
  const contentLink = e.target.closest('[data-habit-content-modal]');

  if (contentLink) {
    e.preventDefault();
    const url = contentLink.href;

    // Fetch the content
    fetch(url)
      .then(response => response.text())
      .then(html => {
        // Create modal container if it doesn't exist
        let modalContainer = document.getElementById('habit-content-modal-container');
        if (!modalContainer) {
          modalContainer = document.createElement('div');
          modalContainer.id = 'habit-content-modal-container';
          document.body.appendChild(modalContainer);
        }

        // Insert the modal HTML
        modalContainer.innerHTML = html;

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
      })
      .catch(error => {
        console.error('Error loading content:', error);
      });
  }
});

// Function to close modal
window.closeHabitContentModal = function() {
  const modalContainer = document.getElementById('habit-content-modal-container');
  if (modalContainer) {
    modalContainer.innerHTML = '';
    document.body.style.overflow = '';
  }
};
