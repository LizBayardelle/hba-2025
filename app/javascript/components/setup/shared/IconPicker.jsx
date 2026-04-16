import React from 'react';

export const CATEGORY_ICONS = [
  'fa-check', 'fa-dumbbell', 'fa-book', 'fa-heart', 'fa-briefcase', 'fa-utensils',
  'fa-bed', 'fa-apple-whole', 'fa-mug-hot', 'fa-person-running', 'fa-pills', 'fa-brain',
  'fa-music', 'fa-paintbrush', 'fa-droplet', 'fa-users', 'fa-star', 'fa-pen',
];

export const IMPORTANCE_ICONS = [
  // Exclamation & Alerts
  'fa-circle-exclamation', 'fa-triangle-exclamation', 'fa-exclamation', 'fa-circle-info',
  'fa-circle-question', 'fa-question', 'fa-info', 'fa-radiation', 'fa-skull-crossbones',
  'fa-ban', 'fa-xmark', 'fa-circle-xmark',
  // Energy & Urgency
  'fa-fire', 'fa-fire-flame-curved', 'fa-bolt', 'fa-bolt-lightning', 'fa-bomb', 'fa-meteor',
  // Stars & Priority
  'fa-star', 'fa-star-half-stroke', 'fa-certificate', 'fa-award', 'fa-medal',
  'fa-trophy', 'fa-crown', 'fa-ranking-star', 'fa-gem',
  // Markers & Flags
  'fa-flag', 'fa-bookmark', 'fa-bullseye', 'fa-location-pin', 'fa-thumbtack',
  // Shapes
  'fa-circle', 'fa-circle-dot', 'fa-circle-check', 'fa-square', 'fa-square-check',
  'fa-diamond', 'fa-heart',
  // Arrows & Direction
  'fa-angles-up', 'fa-angle-up', 'fa-chevron-up', 'fa-arrow-up', 'fa-circle-up',
  'fa-angles-down', 'fa-angle-down', 'fa-chevron-down', 'fa-arrow-down', 'fa-circle-down',
  'fa-equals', 'fa-minus', 'fa-check',
  // Numbers
  'fa-0', 'fa-1', 'fa-2', 'fa-3', 'fa-4', 'fa-5', 'fa-6', 'fa-7', 'fa-8', 'fa-9',
];

export const TIME_BLOCK_ICONS = [
  // Time & Sky
  'fa-sun', 'fa-cloud-sun', 'fa-moon', 'fa-cloud-moon', 'fa-cloud', 'fa-star',
  'fa-snowflake', 'fa-rainbow', 'fa-meteor', 'fa-bolt',
  // Clocks & Time
  'fa-clock', 'fa-stopwatch', 'fa-hourglass', 'fa-hourglass-half', 'fa-hourglass-end', 'fa-bell-concierge',
  // Calendar
  'fa-calendar', 'fa-calendar-day', 'fa-calendar-week', 'fa-watch',
  // Activities & Lifestyle
  'fa-mug-hot', 'fa-coffee', 'fa-bed', 'fa-utensils', 'fa-plate-wheat', 'fa-bowl-rice',
  'fa-pizza-slice', 'fa-champagne-glasses', 'fa-dumbbell', 'fa-person-running',
  'fa-person-walking', 'fa-spa',
  // Places & Context
  'fa-home', 'fa-briefcase', 'fa-school', 'fa-building', 'fa-car', 'fa-plane',
  'fa-bell', 'fa-laptop', 'fa-book', 'fa-music', 'fa-gamepad', 'fa-tv',
];

export default function IconPicker({ icons, selectedIcon, onSelect, columns = 9 }) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {icons.map((icon) => {
        const iconClass = icon.startsWith('fa-') ? `fa-solid ${icon}` : icon;
        const isSelected = selectedIcon === icon || selectedIcon === iconClass;

        return (
          <button
            key={icon}
            type="button"
            onClick={() => onSelect(icon)}
            className="w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors"
            style={{
              borderColor: isSelected ? '#3B82F6' : 'var(--border)',
              background: isSelected ? '#DBEAFE' : 'transparent',
            }}
          >
            <i className={iconClass} style={{ color: 'var(--ink)', fontSize: '13px' }}></i>
          </button>
        );
      })}
    </div>
  );
}
