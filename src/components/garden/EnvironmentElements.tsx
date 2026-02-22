'use client';

import { getZoneState, ZoneState } from '@/lib/garden/zoneState';

interface EnvironmentElementsProps {
  completionRate14Days: number;
}

interface StateConfig {
  elements: string[];
  bgClass: string;
}

const stateConfigs: Record<ZoneState, StateConfig> = {
  thriving: {
    elements: ['🌳', '🌻', '🦋', '✨'],
    bgClass: 'bg-green-100',
  },
  healthy: {
    elements: ['🌿', '🌸', '🌼'],
    bgClass: 'bg-green-50',
  },
  okay: {
    elements: ['🌱', '🌾'],
    bgClass: 'bg-yellow-50',
  },
  struggling: {
    elements: ['🍂', '🥀'],
    bgClass: 'bg-orange-50',
  },
  neglected: {
    elements: ['🍂', '💨', '🕸️'],
    bgClass: 'bg-gray-100',
  },
};

export function EnvironmentElements({ completionRate14Days }: EnvironmentElementsProps) {
  const state = getZoneState(completionRate14Days);
  const config = stateConfigs[state];

  // Distribute elements at different positions
  const positions = [
    { left: '10%', bottom: '20%' },
    { left: '30%', bottom: '40%' },
    { left: '60%', bottom: '25%' },
    { left: '80%', bottom: '35%' },
  ];

  return (
    <div
      className={`absolute inset-0 rounded-xl transition-all duration-500 ${config.bgClass}`}
      aria-hidden="true"
    >
      {/* Render environment elements at fixed positions */}
      {config.elements.map((emoji, idx) => (
        <span
          key={idx}
          className="absolute text-xl animate-pulse"
          style={{
            left: positions[idx % positions.length].left,
            bottom: positions[idx % positions.length].bottom,
            animationDelay: `${idx * 0.5}s`,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}
