import React from 'react';

const ProgressThermometer = ({ progress = 0, color = '#8E8E93', size = 'normal', label = '', countLabel = '' }) => {
  const isComplete = progress >= 100;
  const fillColor = isComplete ? '#22C55E' : color;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  if (size === 'compact') {
    // Compact version for list items (~60px tall)
    const tubeHeight = 40;
    const bulbSize = 18;
    const tubeWidth = 10;
    const fillHeight = (clampedProgress / 100) * tubeHeight;

    return (
      <div className="flex flex-col items-center" style={{ width: 24, height: 60 }}>
        {/* Trophy or percentage */}
        <div className="text-center mb-0.5" style={{ fontSize: '0.5rem', fontWeight: 600, color: fillColor, lineHeight: 1 }}>
          {isComplete ? (
            <i className="fa-solid fa-trophy" style={{ fontSize: '0.5rem', color: '#F59E0B' }}></i>
          ) : (
            `${clampedProgress}%`
          )}
        </div>

        {/* Thermometer */}
        <svg width={24} height={tubeHeight + bulbSize} viewBox={`0 0 24 ${tubeHeight + bulbSize}`}>
          {/* Tube background */}
          <rect
            x={(24 - tubeWidth) / 2}
            y={0}
            width={tubeWidth}
            height={tubeHeight}
            rx={tubeWidth / 2}
            fill="#E5E5E7"
          />
          {/* Tube fill */}
          <rect
            x={(24 - tubeWidth) / 2}
            y={tubeHeight - fillHeight}
            width={tubeWidth}
            height={fillHeight}
            rx={fillHeight > 0 ? tubeWidth / 2 : 0}
            fill={fillColor}
          />
          {/* Glass shine */}
          <rect
            x={(24 - tubeWidth) / 2 + 2}
            y={2}
            width={3}
            height={tubeHeight - 4}
            rx={1.5}
            fill="white"
            opacity={0.3}
          />
          {/* Bulb */}
          <circle
            cx={12}
            cy={tubeHeight + bulbSize / 2}
            r={bulbSize / 2}
            fill={fillColor}
          />
          {/* Bulb shine */}
          <circle
            cx={10}
            cy={tubeHeight + bulbSize / 2 - 2}
            r={3}
            fill="white"
            opacity={0.25}
          />
        </svg>
      </div>
    );
  }

  // Normal version for detail view (~120px tall)
  const tubeHeight = 80;
  const bulbSize = 28;
  const tubeWidth = 14;
  const fillHeight = (clampedProgress / 100) * tubeHeight;

  return (
    <div className="flex flex-col items-center" style={{ width: 48 }}>
      {/* Trophy or percentage */}
      <div className="text-center mb-1" style={{ fontSize: '0.7rem', fontWeight: 700, color: fillColor }}>
        {isComplete ? (
          <i className="fa-solid fa-trophy" style={{ fontSize: '0.875rem', color: '#F59E0B' }}></i>
        ) : (
          `${clampedProgress}%`
        )}
      </div>

      {/* Thermometer */}
      <svg width={48} height={tubeHeight + bulbSize + 4} viewBox={`0 0 48 ${tubeHeight + bulbSize + 4}`}>
        {/* Tube background */}
        <rect
          x={(48 - tubeWidth) / 2}
          y={2}
          width={tubeWidth}
          height={tubeHeight}
          rx={tubeWidth / 2}
          fill="#E5E5E7"
        />
        {/* Tube fill */}
        {fillHeight > 0 && (
          <rect
            x={(48 - tubeWidth) / 2}
            y={2 + tubeHeight - fillHeight}
            width={tubeWidth}
            height={fillHeight}
            rx={tubeWidth / 2}
            fill={fillColor}
          />
        )}
        {/* Glass shine */}
        <rect
          x={(48 - tubeWidth) / 2 + 3}
          y={4}
          width={4}
          height={tubeHeight - 4}
          rx={2}
          fill="white"
          opacity={0.3}
        />
        {/* Bulb */}
        <circle
          cx={24}
          cy={2 + tubeHeight + bulbSize / 2}
          r={bulbSize / 2}
          fill={fillColor}
        />
        {/* Bulb shine */}
        <circle
          cx={21}
          cy={2 + tubeHeight + bulbSize / 2 - 3}
          r={5}
          fill="white"
          opacity={0.2}
        />
      </svg>

      {/* Count label */}
      {countLabel && (
        <div className="text-center mt-1" style={{ fontSize: '0.625rem', fontWeight: 500, color: '#8E8E93', lineHeight: 1.2 }}>
          {countLabel}
        </div>
      )}
    </div>
  );
};

export default ProgressThermometer;
