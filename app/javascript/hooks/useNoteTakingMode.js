import { useState, useEffect, useCallback, useRef } from 'react';

const useNoteTakingMode = () => {
  const [isNoteTakingMode, setIsNoteTakingMode] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(null);
  const listenerRef = useRef(null);

  const toggleNoteTakingMode = useCallback(() => {
    setIsNoteTakingMode(prev => !prev);
  }, []);

  const exitNoteTakingMode = useCallback(() => {
    setIsNoteTakingMode(false);
  }, []);

  // Track visualViewport height only while in note-taking mode
  useEffect(() => {
    if (!isNoteTakingMode) {
      setViewportHeight(null);
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => setViewportHeight(vv.height);
    update();
    vv.addEventListener('resize', update);
    listenerRef.current = update;

    return () => {
      vv.removeEventListener('resize', update);
      listenerRef.current = null;
    };
  }, [isNoteTakingMode]);

  return { isNoteTakingMode, toggleNoteTakingMode, exitNoteTakingMode, viewportHeight };
};

// Syncs the trix toolbar expand/collapse button with React note-taking state
export const useTrixExpandButton = (trixRef, isNoteTakingMode, toggleNoteTakingMode) => {
  // Listen on document (event bubbles) — avoids timing issues with ref being null on mount
  useEffect(() => {
    const handler = (e) => {
      if (trixRef.current && e.target === trixRef.current) {
        toggleNoteTakingMode();
      }
    };
    document.addEventListener('trix-toggle-writing-mode', handler);
    return () => document.removeEventListener('trix-toggle-writing-mode', handler);
  }, [toggleNoteTakingMode]);

  // Update the toolbar button icon when mode changes
  useEffect(() => {
    const el = trixRef.current;
    if (!el) return;
    const toolbar = el.toolbarElement;
    if (!toolbar) return;
    const btn = toolbar.querySelector('.trix-button--icon-expand');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (icon) {
      icon.className = isNoteTakingMode ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
    }
    btn.title = isNoteTakingMode ? 'Exit writing mode' : 'Writing mode';
  }, [isNoteTakingMode]);
};

export default useNoteTakingMode;
