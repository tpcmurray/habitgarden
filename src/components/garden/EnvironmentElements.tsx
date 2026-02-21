'use client';

interface EnvironmentElementsProps {
  completionRate14Days: number;
}

type ZoneState = 'thriving' | 'healthy' | 'okay' | 'struggling' | 'neglected';

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

/**
 * Determine zone state based on 14-day consistency
 */
function getZoneState(rate: number): ZoneState {
  if (rate >= 90) return 'thriving';
  if (rate >= 70) return 'healthy';
  if (rate >= 50) return 'okay';
  if (rate >= 25) return 'struggling';
  return 'neglected';
}

/**
 * Calculate completion rate for last 14 days
 */
export async function calculate14DayRate(habitId: number, userId: number): Promise<number> {
  const { db } = await import('@/lib/db');
  const { checkIns, habits } = await import('@/lib/db/schema');
  const { eq, and, gte } = await import('drizzle-orm');

  const today = new Date();
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(today.getDate() - 13);

  const fourteenDaysStr = fourteenDaysAgo.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const habit = await db.query.habits.findFirst({
    where: eq(habits.id, habitId),
  });

  if (!habit) return 0;

  const checkInsList = await db.query.checkIns.findMany({
    where: and(
      eq(checkIns.habitId, habitId),
      eq(checkIns.userId, userId),
      gte(checkIns.date, fourteenDaysStr),
    ),
  });

  const checkInMap = new Map<string, boolean>();
  checkInsList.forEach((ci) => {
    if (ci.completed !== null) {
      checkInMap.set(ci.date, ci.completed);
    }
  });

  let completedDays = 0;
  let totalDays = 0;
  const createdDate = new Date(habit.createdAt);

  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    if (date >= createdDate) {
      totalDays++;
      if (checkInMap.get(dateStr)) {
        completedDays++;
      }
    }
  }

  return totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
}

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

/**
 * Determine zone state from completion rate
 */
export function getZoneStateFromRate(rate: number): ZoneState {
  return getZoneState(rate);
}
