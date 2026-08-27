// Touch-capable drag reordering for the ERB/Alpine pages.
//
// The app's React pages use @dnd-kit; the ERB pages previously used the native
// HTML5 drag API, which never fires on mobile. SortableJS covers mouse, touch
// and pen from one code path, with auto-scroll while dragging.
//
// Two usage shapes:
//
//   1. window.hbSortableState(el, opts) — the list is rendered by an Alpine
//      x-for and Alpine owns the order. Sortable physically moves DOM nodes,
//      which would desync Alpine, so we undo Sortable's move and hand the new
//      order back to Alpine; Alpine then re-renders as the single source of
//      truth.
//
//   2. window.hbSortablePersist(el, opts) — the list is server-rendered and the
//      new order is PATCHed to a reorder endpoint.
//
import Sortable from 'sortablejs';

const BASE = {
  animation: 150,
  handle: '[data-drag-handle]',
  draggable: '[data-sortable-item]',
  ghostClass: 'hb-sortable-ghost',
  chosenClass: 'hb-sortable-chosen',
  dragClass: 'hb-sortable-drag',
  // Long-press before a drag starts on touch, so the page still scrolls
  // normally when you swipe over a list.
  delayOnTouchOnly: true,
  delay: 160,
  touchStartThreshold: 4,
  scroll: true,
  scrollSensitivity: 80,
  scrollSpeed: 12,
};

// Only the real rows. Alpine's x-for leaves its <template> in the container and
// inserts rows after it, so el.children would otherwise include that template
// and shift every index by one.
function itemsIn(container) {
  return Array.from(container.children).filter((n) => n.matches('[data-sortable-item]'));
}

// Restore the row order Alpine last rendered, without disturbing the x-for
// template (rows always trail it, so re-appending them in order is safe).
function restoreOrder(container, snapshot) {
  snapshot.forEach((node) => container.appendChild(node));
}

/**
 * Alpine-owned list. `onReorder(order)` receives an array of the original
 * DOM positions in their new visual order — i.e. a permutation to apply to
 * the backing array.
 */
window.hbSortableState = function (el, { onReorder, ...opts } = {}) {
  if (!el || el.dataset.hbSortableBound === '1') return null;
  el.dataset.hbSortableBound = '1';

  let snapshot = null;

  return Sortable.create(el, {
    ...BASE,
    ...opts,
    onStart() {
      snapshot = itemsIn(el);
    },
    onEnd(evt) {
      if (evt.oldIndex === evt.newIndex || !snapshot) return;

      // The DOM order Sortable produced, expressed as original indices.
      const current = itemsIn(el);
      const order = current.map((node) => snapshot.indexOf(node));

      // A permutation must account for every row exactly once; bail rather
      // than apply a partial order that would silently drop or duplicate one.
      const valid = order.length === snapshot.length && !order.includes(-1);
      if (!valid) {
        console.error('Sortable produced an unusable order; ignoring', order);
        restoreOrder(el, snapshot);
        snapshot = null;
        return;
      }

      // Put the DOM back the way Alpine last rendered it, then let Alpine
      // re-render from the updated state.
      restoreOrder(el, snapshot);
      snapshot = null;

      if (typeof onReorder === 'function') onReorder(order);
    },
  });
};

/**
 * Server-rendered list. Sends the new id order to `url` as {ids: [...]}.
 * Each item must carry data-sortable-id.
 */
window.hbSortablePersist = function (el, { url, method = 'PATCH', key = 'ids', onSaved } = {}) {
  if (!el || el.dataset.hbSortableBound === '1') return null;
  el.dataset.hbSortableBound = '1';

  return Sortable.create(el, {
    ...BASE,
    onEnd(evt) {
      if (evt.oldIndex === evt.newIndex) return;

      const ids = Array.from(el.querySelectorAll('[data-sortable-id]'))
        .map((node) => node.dataset.sortableId)
        .filter(Boolean);

      const token = document.querySelector('meta[name="csrf-token"]');
      fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-Token': token ? token.content : '',
        },
        body: JSON.stringify({ [key]: ids }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Reorder failed with status ' + res.status);
          if (typeof onSaved === 'function') onSaved(ids);
        })
        .catch((err) => {
          console.error('Could not save new order:', err);
          window.location.reload();
        });
    },
  });
};

// Auto-wire any server-rendered list that declares its endpoint in markup.
function bindDeclarative() {
  document.querySelectorAll('[data-sortable-url]').forEach((el) => {
    window.hbSortablePersist(el, { url: el.dataset.sortableUrl });
  });
}

document.addEventListener('DOMContentLoaded', bindDeclarative);
// Alpine may swap content in after load (modals, teleports)
document.addEventListener('alpine:initialized', bindDeclarative);
