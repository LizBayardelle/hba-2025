import React, { useState } from 'react';

const PRESET_COLORS = [
  '#6B8A99', '#9C8B7E', '#F8796D', '#FFA07A',
  '#E5C730', '#A8A356', '#7CB342', '#6EE7B7',
  '#22D3EE', '#6366F1', '#A78BFA', '#E879F9',
  '#FB7185', '#9CA3A8',
];

export default function ColorPicker({ selectedColor, onSelect, showCustom = false }) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => {
              onSelect(color);
              setShowCustomPicker(false);
            }}
            className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110"
            style={{
              background: color,
              borderColor: selectedColor === color ? 'var(--ink)' : 'transparent',
            }}
          >
            {selectedColor === color && (
              <i className="fa-solid fa-check text-white text-xs drop-shadow"></i>
            )}
          </button>
        ))}

        {showCustom && (
          <button
            type="button"
            onClick={() => setShowCustomPicker(!showCustomPicker)}
            className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
            style={{
              background: !PRESET_COLORS.includes(selectedColor) && selectedColor
                ? selectedColor
                : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
              borderColor: showCustomPicker || !PRESET_COLORS.includes(selectedColor)
                ? 'var(--ink)' : 'transparent',
            }}
          >
            {!PRESET_COLORS.includes(selectedColor) && selectedColor && (
              <i className="fa-solid fa-check text-white text-xs drop-shadow"></i>
            )}
          </button>
        )}
      </div>

      {showCustom && showCustomPicker && (
        <div className="mt-3 flex items-center gap-3">
          <input
            type="color"
            value={selectedColor || '#6B8A99'}
            onChange={(e) => onSelect(e.target.value)}
            className="w-10 h-8 rounded cursor-pointer border-0"
          />
          <span className="v2-small font-mono" style={{ color: 'var(--ink-secondary)' }}>
            {selectedColor}
          </span>
        </div>
      )}
    </div>
  );
}
