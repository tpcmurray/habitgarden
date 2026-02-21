import { db } from '@/lib/db';
import { habits, checkIns } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export interface CompletionRate {
  rate: number;
  completed: number;
  total: number;
}

export interface HabitStats {
  habitId: number;
  completionRate7d: CompletionRate;
  completionRate30d: CompletionRate;
  completionRate90d: CompletionRate;
  completionRateAllTime: CompletionRate;
  averageValue?: number;
  targetValue?: number;
}

function getDateDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getCompletionRate(
  habitId: number,
  userId: number,
  days: number
): Promise<CompletionRate> {
  const startDate = getDateDaysAgo(days);
  const today = new Date();
  
  const checkInsList = await db.query.checkIns.findMany({
    where: and(
      eq(checkIns.habitId, habitId),
      eq(checkIns.userId, userId),
      gte(checkIns.createdAt, startDate),
      lte(checkIns.createdAt, today)
    ),
  });
  
  // For binary habits, count completed
  const completed = checkInsList.filter(ci => ci.completed).length;
  const total = days;
  
  return {
    rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    completed,
    total,
  };
}

export async function getCompletionRateForMeasured(
  habitId: number,
  userId: number,
  days: number
): Promise<{ rate: number; averageValue: number }> {
  const startDate = getDateDaysAgo(days);
  const today = new Date();
  
  const checkInsList = await db.query.checkIns.findMany({
    where: and(
      eq(checkIns.habitId, habitId),
      eq(checkIns.userId, userId),
      gte(checkIns.createdAt, startDate),
      lte(checkIns.createdAt, today)
    ),
  });
  
  // For measured habits, calculate average value vs target
  const completedCheckIns = checkInsList.filter(ci => ci.value !== null && ci.value !== undefined);
  
  if (completedCheckIns.length === 0) {
    return { rate: 0, averageValue: 0 };
  }
  
  const totalValue = completedCheckIns.reduce((sum, ci) => sum + (ci.value || 0), 0);
  const averageValue = totalValue / completedCheckIns.length;
  
  return {
    rate: Math.round(averageValue), // This will be compared to target
    averageValue: Math.round(averageValue * 10) / 10,
  };
}

export async function getAllTimeCompletionRate(
  habitId: number,
  userId: number
): Promise<CompletionRate> {
  const habit = await db.query.habits.findFirst({
    where: and(eq(habits.id, habitId), eq(habits.userId, userId)),
  });
  
  if (!habit) {
    return { rate: 0, completed: 0, total: 0 };
  }
  
  const createdAt = new Date(habit.createdAt || new Date());
  const today = new Date();
  
  const daysSinceCreation = Math.floor(
    (today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return getCompletionRate(habitId, userId, daysSinceCreation);
}

export async function getHabitStats(habitId: number, userId: number): Promise<HabitStats> {
  const habit = await db.query.habits.findFirst({
    where: and(eq(habits.id, habitId), eq(habits.userId, userId)),
  });
  
  if (!habit) {
    throw new Error('Habit not found');
  }
  
  const isBinary = habit.type === 'binary';
  
  const [completionRate7d, completionRate30d, completionRate90d, completionRateAllTime] = 
    await Promise.all([
      isBinary 
        ? getCompletionRate(habitId, userId, 7)
        : getCompletionRateForMeasured(habitId, userId, 7),
      isBinary 
        ? getCompletionRate(habitId, userId, 30)
        : getCompletionRateForMeasured(habitId, userId, 30),
      isBinary 
        ? getCompletionRate(habitId, userId, 90)
        : getCompletionRateForMeasured(habitId, userId, 90),
      isBinary 
        ? getAllTimeCompletionRate(habitId, userId)
        : getCompletionRateForMeasured(habitId, userId, 365), // Approximate all-time
    ]);
  
  const rate7d = isBinary ? completionRate7d : { rate: (completionRate7d as any).rate, completed: (completionRate7d as any).averageValue || 0, total: habit.targetValue || 0 };
  const rate30d = isBinary ? completionRate30d : { rate: (completionRate30d as any).rate, completed: (completionRate30d as any).averageValue || 0, total: habit.targetValue || 0 };
  const rate90d = isBinary ? completionRate90d : { rate: (completionRate90d as any).rate, completed: (completionRate90d as any).averageValue || 0, total: habit.targetValue || 0 };
  const rateAllTime = isBinary ? completionRateAllTime : { rate: (completionRateAllTime as any).rate, completed: (completionRateAllTime as any).averageValue || 0, total: habit.targetValue || 0 };

  return {
    habitId,
    completionRate7d: rate7d as CompletionRate,
    completionRate30d: rate30d as CompletionRate,
    completionRate90d: rate90d as CompletionRate,
    completionRateAllTime: rateAllTime as CompletionRate,
    averageValue: isBinary ? undefined : (completionRate30d as any).averageValue,
    targetValue: habit.targetValue || undefined,
  };
}

export async function getGlobalStats(userId: number) {
  const userHabits = await db.query.habits.findMany({
    where: and(eq(habits.userId, userId), eq(habits.active, true)),
  });
  
  if (userHabits.length === 0) {
    return {
      totalCheckIns: 0,
      overallCompletionRate: 0,
      combinedStreak: 0,
      totalMilestones: 0,
    };
  }
  
  // Get all check-ins for all habits
  const allCheckIns = await db.query.checkIns.findMany({
    where: eq(checkIns.userId, userId),
  });
  
  // Calculate total check-ins
  const totalCheckIns = allCheckIns.filter(ci => ci.completed).length;
  
  // Calculate overall completion rate (average across all habits)
  const today = new Date();
  const weekAgo = getDateDaysAgo(7);
  
  const weeklyCheckIns = allCheckIns.filter(ci => {
    const ciDate = new Date(ci.createdAt || new Date());
    return ciDate >= weekAgo && ciDate <= today && ci.completed;
  });
  
  const possibleCheckIns = userHabits.length * 7;
  const overallCompletionRate = possibleCheckIns > 0 
    ? Math.round((weeklyCheckIns.length / possibleCheckIns) * 100)
    : 0;
  
  // Calculate combined streak (days where ALL habits were completed)
  const checkInMap = new Map<string, number>();
  weeklyCheckIns.forEach(ci => {
    const date = ci.date;
    checkInMap.set(date, (checkInMap.get(date) || 0) + 1);
  });
  
  let combinedStreak = 0;
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    if (checkInMap.get(dateStr) === userHabits.length) {
      combinedStreak++;
    } else {
      break;
    }
  }
  
  return {
    totalCheckIns,
    overallCompletionRate,
    combinedStreak,
    habitCount: userHabits.length,
  };
}
