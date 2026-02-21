import { db } from '@/lib/db';
import { milestones, habits } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export type MilestoneType = 'streak_7' | 'streak_30' | 'streak_100';
export type MilestoneCosmetic = 
  | 'hat' 
  | 'companion' 
  | 'landmark';

export interface Milestone {
  type: MilestoneType;
  cosmetic: {
    type: MilestoneCosmetic;
    value: string;
  };
  streakSnapshot: number;
}

// Tier cosmetics
const TIER_COSMETICS: Record<MilestoneCosmetic, string[]> = {
  hat: ['🎩', '🕶️', '👑', '🎀', '🧢', '🎪', '🌸', '🌺'],
  companion: ['🐕', '🐈', '🐦', '🐿️', '🦊', '🐸', '🐢', '🦋'],
  landmark: ['🏰', '🌈', '⛲', '🎪', '🗿', '🎠', '🌻', '🌲'],
};

// Message templates
const MILESTONE_MESSAGES: Record<MilestoneType, (buddy: string, cosmetic: string) => string> = {
  streak_7: (buddy, cosmetic) => `🔥 7 days straight! ${buddy} earned a ${cosmetic}!`,
  streak_30: (buddy, cosmetic) => `⭐ 30 days! ${buddy} made a new friend: ${cosmetic}!`,
  streak_100: (buddy, cosmetic) => `🏆 100 DAYS! ${buddy} built something amazing: ${cosmetic}!`,
};

/**
 * Check if a new milestone has been reached
 */
export async function checkMilestones(
  habitId: number,
  userId: number,
  currentStreak: number
): Promise<Milestone[]> {
  const earnedMilestones: Milestone[] = [];

  // Get habit info
  const habit = await db.query.habits.findFirst({
    where: eq(habits.id, habitId),
  });

  if (!habit) return [];

  // Get existing milestones for this habit
  const existingMilestones = await db.query.milestones.findMany({
    where: and(
      eq(milestones.habitId, habitId),
      eq(milestones.userId, userId),
    ),
  });

  const earnedTypes = new Set(existingMilestones.map((m) => m.type));

  // Check 7-day milestone
  if (currentStreak >= 7 && !earnedTypes.has('streak_7')) {
    const cosmetic = await getRandomCosmetic(habitId, userId, 'hat', TIER_COSMETICS.hat);
    
    const milestone: Milestone = {
      type: 'streak_7',
      cosmetic: { type: 'hat', value: cosmetic },
      streakSnapshot: currentStreak,
    };

    // Save to database
    await db.insert(milestones).values({
      habitId,
      userId,
      type: 'streak_7',
      cosmetic: { type: 'hat', value: cosmetic },
      streakSnapshot: currentStreak,
    });

    earnedMilestones.push(milestone);
  }

  // Check 30-day milestone
  if (currentStreak >= 30 && !earnedTypes.has('streak_30')) {
    const cosmetic = await getRandomCosmetic(habitId, userId, 'companion', TIER_COSMETICS.companion);
    
    const milestone: Milestone = {
      type: 'streak_30',
      cosmetic: { type: 'companion', value: cosmetic },
      streakSnapshot: currentStreak,
    };

    await db.insert(milestones).values({
      habitId,
      userId,
      type: 'streak_30',
      cosmetic: { type: 'companion', value: cosmetic },
      streakSnapshot: currentStreak,
    });

    earnedMilestones.push(milestone);
  }

  // Check 100-day milestone
  if (currentStreak >= 100 && !earnedTypes.has('streak_100')) {
    const cosmetic = await getRandomCosmetic(habitId, userId, 'landmark', TIER_COSMETICS.landmark);
    
    const milestone: Milestone = {
      type: 'streak_100',
      cosmetic: { type: 'landmark', value: cosmetic },
      streakSnapshot: currentStreak,
    };

    await db.insert(milestones).values({
      habitId,
      userId,
      type: 'streak_100',
      cosmetic: { type: 'landmark', value: cosmetic },
      streakSnapshot: currentStreak,
    });

    earnedMilestones.push(milestone);
  }

  return earnedMilestones;
}

/**
 * Get a random cosmetic that hasn't been earned at this tier yet
 */
async function getRandomCosmetic(
  habitId: number,
  userId: number,
  type: MilestoneCosmetic,
  options: string[]
): Promise<string> {
  // Get all cosmetics of this type already earned by user
  const existing = await db.query.milestones.findMany({
    where: and(
      eq(milestones.userId, userId),
    ),
  });

  const earnedValues = existing
    .filter((m) => {
      const c = m.cosmetic as { type?: string; value?: string } | null;
      return c?.type === type;
    })
    .map((m) => {
      const c = m.cosmetic as { type?: string; value?: string } | null;
      return c?.value;
    })
    .filter(Boolean) as string[];

  // Filter out already earned
  const available = options.filter((o) => !earnedValues.includes(o));

  // If all earned, pick random
  if (available.length === 0) {
    return options[Math.floor(Math.random() * options.length)];
  }

  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Get all milestones for a habit
 */
export async function getHabitMilestones(habitId: number, userId: number) {
  return db.query.milestones.findMany({
    where: and(
      eq(milestones.habitId, habitId),
      eq(milestones.userId, userId),
    ),
    orderBy: (milestones, { asc }) => [asc(milestones.earnedAt)],
  });
}

/**
 * Get milestone message for a type
 */
export function getMilestoneMessage(type: MilestoneType, buddy: string): string {
  const cosmeticOptions = type === 'streak_7' 
    ? TIER_COSMETICS.hat 
    : type === 'streak_30' 
    ? TIER_COSMETICS.companion 
    : TIER_COSMETICS.landmark;
  
  const cosmetic = cosmeticOptions[Math.floor(Math.random() * cosmeticOptions.length)];
  return MILESTONE_MESSAGES[type](buddy, cosmetic);
}
