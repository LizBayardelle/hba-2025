// Entry point for the build script in your package.json
// React components can be imported here as needed

// Restore scroll position after reload
(function() {
  const key = 'scrollPos:' + window.location.pathname;
  const scrollContainer = () => document.querySelector('main.overflow-y-auto') || window;

  window.addEventListener('beforeunload', () => {
    const el = scrollContainer();
    const pos = el === window ? window.scrollY : el.scrollTop;
    sessionStorage.setItem(key, pos);
  });

  document.addEventListener('DOMContentLoaded', () => {
    const saved = sessionStorage.getItem(key);
    if (saved) {
      sessionStorage.removeItem(key);
      requestAnimationFrame(() => {
        const el = scrollContainer();
        if (el === window) window.scrollTo(0, parseInt(saved));
        else el.scrollTop = parseInt(saved);
      });
    }
  });
})();

import "trix"
import "@rails/actiontext"
import "./trix_customization"
import "./habit_content_modal"
import "./documents_app"
import "./dashboard_app"
