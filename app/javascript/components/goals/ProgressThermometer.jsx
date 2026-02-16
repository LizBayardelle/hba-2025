import React from 'react';

// Full thermometer outline: tube (rounded top) flowing seamlessly into bulb circle.
// Returns a single closed path with no junction gap.
const thermometerOutline = (tubeX, tubeY, tubeW, bulbCx, bulbCy, bulbR) => {
  const topR = Math.min(tubeW / 2, 999);
  const halfW = tubeW / 2;
  // Y where tube sides are tangent to the bulb circle
  const tangentY = bulbCy - Math.sqrt(bulbR * bulbR - halfW * halfW);

  return [
    `M ${tubeX} ${tangentY}`,
    `L ${tubeX} ${tubeY + topR}`,
    `A ${topR} ${topR} 0 0 1 ${tubeX + topR} ${tubeY}`,
    `L ${tubeX + tubeW - topR} ${tubeY}`,
    `A ${topR} ${topR} 0 0 1 ${tubeX + tubeW} ${tubeY + topR}`,
    `L ${tubeX + tubeW} ${tangentY}`,
    `A ${bulbR} ${bulbR} 0 1 1 ${tubeX} ${tangentY}`,
    'Z',
  ].join(' ');
};

// Meniscus fill: a rectangle with a slight concave dip at the top edge.
const meniscusFillPath = (x, y, w, h, dip) => {
  if (h <= 0) return '';
  return [
    `M ${x} ${y}`,
    `Q ${x + w / 2} ${y + dip} ${x + w} ${y}`,
    `L ${x + w} ${y + h}`,
    `L ${x} ${y + h}`,
    'Z',
  ].join(' ');
};

const ProgressThermometer = ({ progress = 0, color = '#8E8E93', size = 'normal', countLabel = '' }) => {
  const isComplete = progress >= 100;
  const fillColor = isComplete ? '#22C55E' : color;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  if (size === 'card') {
    const tubeWidth = 28;
    const bulbRadius = 22;
    const svgWidth = 60;
    const tubeHeight = 120 - bulbRadius * 2 + 10;
    const tubeX = (svgWidth - tubeWidth) / 2;
    const bulbCx = svgWidth / 2;
    const bulbCy = 120 - bulbRadius;
    const fillH = (clampedProgress / 100) * tubeHeight;
    const fillY = tubeHeight - fillH;
    const dip = clampedProgress < 100 && clampedProgress > 0 ? 4 : 0;
    const clipId = `therm-clip-card-${Math.random().toString(36).slice(2, 8)}`;
    const outline = thermometerOutline(tubeX, 0, tubeWidth, bulbCx, bulbCy, bulbRadius);

    return (
      <div className="flex flex-col items-center justify-between h-full py-3" style={{ width: svgWidth }}>
        <div className="text-center mb-1" style={{ fontSize: '0.75rem', fontWeight: 700, color: fillColor }}>
          {isComplete ? (
            <i className="fa-solid fa-trophy" style={{ fontSize: '1rem', color: '#F59E0B' }}></i>
          ) : (
            `${clampedProgress}%`
          )}
        </div>
        <div className="flex-1 flex items-center justify-center" style={{ minHeight: 60 }}>
          <svg width={svgWidth} height="100%" viewBox={`0 0 ${svgWidth} 120`} preserveAspectRatio="xMidYMid meet">
            <defs>
              <clipPath id={clipId}>
                <path d={outline} />
              </clipPath>
            </defs>
            {/* Thermometer background — single seamless shape */}
            <path d={outline} fill={`${fillColor}18`} />
            {/* Fill clipped to thermometer shape */}
            {fillH > 0 && (
              <path
                d={meniscusFillPath(tubeX, fillY, tubeWidth, fillH, dip)}
                fill={fillColor}
                clipPath={`url(#${clipId})`}
              />
            )}
            {/* Glass shine */}
            <rect x={tubeX + 5} y={4} width={6} height={tubeHeight - 4} rx={3} fill="white" opacity={0.35} />
            {/* Bulb — always filled */}
            <circle cx={bulbCx} cy={bulbCy} r={bulbRadius} fill={fillColor} />
            <circle cx={bulbCx - 5} cy={bulbCy - 4} r={7} fill="white" opacity={0.2} />
          </svg>
        </div>
      </div>
    );
  }

  if (size === 'compact') {
    const tubeHeight = 40;
    const bulbSize = 18;
    const bulbR = bulbSize / 2;
    const tubeWidth = 10;
    const tubeX = (24 - tubeWidth) / 2;
    const bulbCx = 12;
    const bulbCy = tubeHeight + bulbR;
    const fillH = (clampedProgress / 100) * tubeHeight;
    const fillY = tubeHeight - fillH;
    const dip = clampedProgress < 100 && clampedProgress > 0 ? 2 : 0;
    const clipId = `therm-clip-compact-${Math.random().toString(36).slice(2, 8)}`;
    const outline = thermometerOutline(tubeX, 0, tubeWidth, bulbCx, bulbCy, bulbR);

    return (
      <div className="flex flex-col items-center" style={{ width: 24, height: 60 }}>
        <div className="text-center mb-0.5" style={{ fontSize: '0.5rem', fontWeight: 600, color: fillColor, lineHeight: 1 }}>
          {isComplete ? (
            <i className="fa-solid fa-trophy" style={{ fontSize: '0.5rem', color: '#F59E0B' }}></i>
          ) : (
            `${clampedProgress}%`
          )}
        </div>
        <svg width={24} height={tubeHeight + bulbSize} viewBox={`0 0 24 ${tubeHeight + bulbSize}`}>
          <defs>
            <clipPath id={clipId}>
              <path d={outline} />
            </clipPath>
          </defs>
          <path d={outline} fill="#E5E5E7" />
          {fillH > 0 && (
            <path
              d={meniscusFillPath(tubeX, fillY, tubeWidth, fillH, dip)}
              fill={fillColor}
              clipPath={`url(#${clipId})`}
            />
          )}
          <rect x={tubeX + 2} y={2} width={3} height={tubeHeight - 4} rx={1.5} fill="white" opacity={0.3} />
          <circle cx={bulbCx} cy={bulbCy} r={bulbR} fill={fillColor} />
          <circle cx={bulbCx - 2} cy={bulbCy - 2} r={3} fill="white" opacity={0.25} />
        </svg>
      </div>
    );
  }

  // Normal version for detail view (~120px tall)
  const tubeHeight = 80;
  const bulbSize = 28;
  const bulbR = bulbSize / 2;
  const tubeWidth = 14;
  const tubeX = (48 - tubeWidth) / 2;
  const bulbCx = 24;
  const bulbCy = 2 + tubeHeight + bulbR;
  const fillH = (clampedProgress / 100) * tubeHeight;
  const fillY = 2 + tubeHeight - fillH;
  const dip = clampedProgress < 100 && clampedProgress > 0 ? 3 : 0;
  const clipId = `therm-clip-normal-${Math.random().toString(36).slice(2, 8)}`;
  const outline = thermometerOutline(tubeX, 2, tubeWidth, bulbCx, bulbCy, bulbR);

  return (
    <div className="flex flex-col items-center" style={{ width: 48 }}>
      <div className="text-center mb-1" style={{ fontSize: '0.7rem', fontWeight: 700, color: fillColor }}>
        {isComplete ? (
          <i className="fa-solid fa-trophy" style={{ fontSize: '0.875rem', color: '#F59E0B' }}></i>
        ) : (
          `${clampedProgress}%`
        )}
      </div>
      <svg width={48} height={tubeHeight + bulbSize + 4} viewBox={`0 0 48 ${tubeHeight + bulbSize + 4}`}>
        <defs>
          <clipPath id={clipId}>
            <path d={outline} />
          </clipPath>
        </defs>
        <path d={outline} fill="#E5E5E7" />
        {fillH > 0 && (
          <path
            d={meniscusFillPath(tubeX, fillY, tubeWidth, fillH, dip)}
            fill={fillColor}
            clipPath={`url(#${clipId})`}
          />
        )}
        <rect x={tubeX + 3} y={4} width={4} height={tubeHeight - 4} rx={2} fill="white" opacity={0.3} />
        <circle cx={bulbCx} cy={bulbCy} r={bulbR} fill={fillColor} />
        <circle cx={bulbCx - 3} cy={bulbCy - 3} r={5} fill="white" opacity={0.2} />
      </svg>
      {countLabel && (
        <div className="text-center mt-1" style={{ fontSize: '0.625rem', fontWeight: 500, color: '#8E8E93', lineHeight: 1.2 }}>
          {countLabel}
        </div>
      )}
    </div>
  );
};

export default ProgressThermometer;
