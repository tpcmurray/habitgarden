import { db } from '@/lib/db';
import { checkIns, habits } from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';

export type Mood =
  | 'ecstatic'
  | 'happy'
  | 'content'
  | 'neutral'
  | 'sad'
  | 'very_sad'
  | 'dormant';

export interface MoodResult {
  mood: Mood;
  emoji: string;
  label: string;
  animation: 'bounce' | 'pulse' | 'none';
}

export interface HabitMoodInfo {
  habitId: number;
  mood: MoodResult;
  completionRate7Days: number;
  daysTracked: number;
}

/**
 * Get mood for a single habit based on trailing 7 days of check-ins
 */
export async function getHabitMood(
  habitId: number,
  userId: number
): Promise<HabitMoodInfo> {
  // Get habit info
  const habit = await db.query.habits.findFirst({
    where: eq(habits.id, habitId),
  });

  if (!habit) {
    return {
      habitId,
      mood: getDefaultMood(),
      completionRate7Days: 0,
      daysTracked: 0,
    };
  }

  // Get check-ins for last 7 days
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);

  const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const checkInsList = await db.query.checkIns.findMany({
    where: and(
      eq(checkIns.habitId, habitId),
      eq(checkIns.userId, userId),
      gte(checkIns.date, sevenDaysStr),
    ),
  });

  // Build check-in map
  const checkInMap = new Map<string, boolean>();
  checkInsList.forEach((ci) => {
    if (ci.completed !== null) {
      checkInMap.set(ci.date, ci.completed);
    }
  });

  // Calculate completion rate for trailing 7 days
  let completedDays = 0;
  let totalDays = 0;
  const createdDate = new Date(habit.createdAt);

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Only count days after habit creation
    if (date >= createdDate) {
      totalDays++;
      if (checkInMap.get(dateStr)) {
        completedDays++;
      }
    }
  }

  const completionRate7Days = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
  const daysTracked = totalDays;

  // Grace period: First 3 days always show 😊 regardless of check-ins
  const daysSinceCreation = Math.floor(
    (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  let mood: MoodResult;
  if (daysSinceCreation < 3) {
    mood = {
      mood: 'content',
      emoji: '😊',
      label: 'Settling In',
      animation: 'pulse',
    };
  } else {
    mood = calculateMoodFromRate(completionRate7Days);
  }

  return {
    habitId,
    mood,
    completionRate7Days,
    daysTracked,
  };
}

/**
 * Calculate mood from completion rate percentage
 */
export function calculateMoodFromRate(rate: number): MoodResult {
  if (rate >= 100) {
    return {
      mood: 'ecstatic',
      emoji: '🤩',
      label: 'On Fire!',
      animation: 'bounce',
    };
  }
  if (rate >= 85) {
    return {
      mood: 'happy',
      emoji: '😄',
      label: 'Thriving',
      animation: 'pulse',
    };
  }
  if (rate >= 70) {
    return {
      mood: 'content',
      emoji: '😊',
      label: 'Growing',
      animation: 'pulse',
    };
  }
  if (rate >= 50) {
    return {
      mood: 'neutral',
      emoji: '😐',
      label: 'Getting There',
      animation: 'none',
    };
  }
  if (rate >= 25) {
    return {
      mood: 'sad',
      emoji: '😟',
      label: 'Struggling',
      animation: 'none',
    };
  }
  if (rate > 0) {
    return {
      mood: 'very_sad',
      emoji: '😢',
      label: 'Needs Love',
      animation: 'none',
    };
  }
  return {
    mood: 'dormant',
    emoji: '😴',
    label: 'Dormant',
    animation: 'none',
  };
}

/**
 * Get default mood for new habits
 */
function getDefaultMood(): MoodResult {
  return {
    mood: 'dormant',
    emoji: '😴',
    label: 'Waiting',
    animation: 'none',
  };
}

/**
 * Get mood info for all active habits of a user
 */
export async function getAllHabitMoods(userId: number): Promise<HabitMoodInfo[]> {
  const userHabits = await db.query.habits.findMany({
    where: and(eq(habits.userId, userId), eq(habits.active, true)),
  });

  const moodInfos: HabitMoodInfo[] = [];

  for (const habit of userHabits) {
    const moodInfo = await getHabitMood(habit.id, userId);
    moodInfos.push(moodInfo);
  }

  return moodInfos;
}
