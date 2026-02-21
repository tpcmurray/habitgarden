import { db } from '@/lib/db';
import { checkIns, habits } from '@/lib/db/schema';
import { eq, and, desc, gte, lte, lt, or } from 'drizzle-orm';

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalCheckIns: number;
  completionRate: number;
  lastCheckInDate: string | null;
  isActiveToday: boolean;
}

/**
 * Calculate streak information for a habit
 * 
 * Rules:
 * - Current streak: consecutive days with check-in (or missed but within grace period)
 * - For 'build' habits: completed = true
 * - For 'break' habits: completed = false means progress
 */
export async function calculateStreak(
  habitId: number,
  userId: number
): Promise<StreakInfo> {
  // Get all check-ins for this habit, ordered by date desc
  const checkInsList = await db.query.checkIns.findMany({
    where: and(
      eq(checkIns.habitId, habitId),
      eq(checkIns.userId, userId)
    ),
    orderBy: [desc(checkIns.date)],
  });

  // Get habit info for direction
  const habit = await db.query.habits.findFirst({
    where: eq(habits.id, habitId),
  });

  if (!habit) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalCheckIns: 0,
      completionRate: 0,
      lastCheckInDate: null,
      isActiveToday: false,
    };
  }

  const isBuilding = habit.direction === 'build';
  const today = new Date().toISOString().split('T')[0];
  
  // Build a map of date -> completed
  const checkInMap = new Map<string, boolean>();
  checkInsList.forEach((ci) => {
    if (ci.completed !== null) {
      checkInMap.set(ci.date, ci.completed);
    }
  });

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date();
  
  // Start from today and go backwards
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const completed = checkInMap.get(dateStr);
    
    // Check if this day should count
    const shouldCheck = shouldCountDay(habit, dateStr);
    
    if (shouldCheck) {
      if (completed !== undefined) {
        const success = isBuilding ? completed : !completed;
        if (success) {
          currentStreak++;
        } else {
          // Streak broken - but allow today to not be completed yet
          if (dateStr !== today) {
            break;
          }
        }
      } else if (dateStr !== today) {
        // Missed day (not today) breaks streak
        break;
      }
    }
    
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  
  // Get all unique dates sorted asc
  const allDates = Array.from(checkInMap.keys()).sort();
  checkDate = new Date(allDates[0] || today);
  const endDate = new Date(today);
  
  while (checkDate <= endDate) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const completed = checkInMap.get(dateStr);
    const shouldCheck = shouldCountDay(habit, dateStr);
    
    if (shouldCheck) {
      if (completed !== undefined) {
        const success = isBuilding ? completed : !completed;
        if (success) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      } else {
        tempStreak = 0;
      }
    }
    
    checkDate.setDate(checkDate.getDate() + 1);
  }

  // Calculate total and completion rate
  const totalCheckIns = checkInsList.filter((ci) => {
    const success = isBuilding ? ci.completed : !ci.completed;
    return success;
  }).length;

  // Count expected days (days that should have been checked)
  let expectedDays = 0;
  checkDate = new Date(habit.createdAt);
  const todayDate = new Date(today);
  
  while (checkDate <= todayDate) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (shouldCountDay(habit, dateStr)) {
      expectedDays++;
    }
    checkDate.setDate(checkDate.getDate() + 1);
  }

  const completionRate = expectedDays > 0 ? (totalCheckIns / expectedDays) * 100 : 0;

  return {
    currentStreak,
    longestStreak,
    totalCheckIns,
    completionRate: Math.round(completionRate),
    lastCheckInDate: checkInsList[0]?.date || null,
    isActiveToday: checkInMap.has(today),
  };
}

/**
 * Check if a given date should count toward the streak
 * based on the habit's frequency settings
 */
function shouldCountDay(habit: typeof habits.$inferSelect, dateStr: string): boolean {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay(); // 0 = Sunday
  
  switch (habit.frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'custom':
      // customDays is [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
      const customDays = habit.customDays as boolean[] | null;
      return customDays?.[dayOfWeek] ?? false;
    default:
      return true;
  }
}

/**
 * Get streak info for multiple habits
 */
export async function calculateAllStreaks(
  userId: number
): Promise<Map<number, StreakInfo>> {
  const userHabits = await db.query.habits.findMany({
    where: and(
      eq(habits.userId, userId),
      eq(habits.active, true)
    ),
  });

  const streakMap = new Map<number, StreakInfo>();
  
  await Promise.all(
    userHabits.map(async (habit) => {
      const streakInfo = await calculateStreak(habit.id, userId);
      streakMap.set(habit.id, streakInfo);
    })
  );

  return streakMap;
}
