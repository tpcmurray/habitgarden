import { db } from '@/lib/db';
import { checkIns, habits } from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';

/**
 * Calculate completion rate for last 14 days (server-side)
 */
export async function calculate14DayRate(habitId: number, userId: number): Promise<number> {
  const today = new Date();
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(today.getDate() - 13);

  const fourteenDaysStr = fourteenDaysAgo.toISOString().split('T')[0];

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

/**
 * Calculate average completion rate across all habits (server-side)
 */
export async function calculateAverageCompletionRate(
  userId: number
): Promise<{ average: number; habitCount: number }> {
  const today = new Date();
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(today.getDate() - 13);
  const fourteenDaysStr = fourteenDaysAgo.toISOString().split('T')[0];

  const userHabits = await db.query.habits.findMany({
    where: and(eq(habits.userId, userId), eq(habits.active, true)),
  });

  if (userHabits.length === 0) {
    return { average: 0, habitCount: 0 };
  }

  let totalRate = 0;

  for (const habit of userHabits) {
    const checkInsList = await db.query.checkIns.findMany({
      where: and(
        eq(checkIns.habitId, habit.id),
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

    const rate = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
    totalRate += rate;
  }

  return {
    average: totalRate / userHabits.length,
    habitCount: userHabits.length,
  };
}
