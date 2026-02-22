/**
 * Garden zone state types and utilities
 */

export type ZoneState = 'thriving' | 'healthy' | 'okay' | 'struggling' | 'neglected';

/**
 * Determine zone state based on 14-day consistency
 * 
 * @param rate - Completion rate percentage (0-100)
 * @returns Zone state based on consistency
 */
export function getZoneState(rate: number): ZoneState {
  if (rate >= 90) return 'thriving';
  if (rate >= 70) return 'healthy';
  if (rate >= 50) return 'okay';
  if (rate >= 25) return 'struggling';
  return 'neglected';
}

/**
 * Get configuration for a zone state
 */
export function getZoneStateConfig(state: ZoneState) {
  const configs = {
    thriving: {
      elements: ['🌳', '🌻', '🦋', '✨'],
      bgClass: 'bg-green-100',
      label: 'Thriving',
    },
    healthy: {
      elements: ['🌿', '🌸', '🌼'],
      bgClass: 'bg-green-50',
      label: 'Healthy',
    },
    okay: {
      elements: ['🌱', '🌾'],
      bgClass: 'bg-yellow-50',
      label: 'Okay',
    },
    struggling: {
      elements: ['🍂', '🥀'],
      bgClass: 'bg-orange-50',
      label: 'Struggling',
    },
    neglected: {
      elements: ['🍂', '💨', '🕸️'],
      bgClass: 'bg-gray-100',
      label: 'Neglected',
    },
  };
  
  return configs[state];
}
