import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { habits } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAllHabitMoods } from '@/lib/garden/moods';
import { calculate14DayRate, calculateAverageCompletionRate } from '@/lib/garden/calculations';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = parseInt(session.user.id);

    // Get all active habits
    const userHabits = await db.query.habits.findMany({
      where: and(eq(habits.userId, userId), eq(habits.active, true)),
    });

    // Get moods for all habits
    const moodInfos = await getAllHabitMoods(userId);

    // Build zones data
    const zones = await Promise.all(
      userHabits.map(async (habit) => {
        const moodInfo = moodInfos.find((m) => m.habitId === habit.id);
        const completionRate14Days = await calculate14DayRate(habit.id, userId);

        return {
          habitId: habit.id,
          name: habit.name,
          emojiBuddy: habit.emojiBuddy,
          mood: moodInfo?.mood || {
            mood: 'dormant',
            emoji: '😴',
            label: 'Waiting',
            animation: 'none',
          },
          completionRate7Days: moodInfo?.completionRate7Days || 0,
          completionRate14Days,
          sortOrder: habit.sortOrder,
        };
      })
    );

    // Sort by sortOrder
    zones.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    // Calculate overall garden health
    const { average: averageCompletionRate, habitCount } = await calculateAverageCompletionRate(userId);

    // Determine overall atmosphere
    let atmosphere: 'sunny' | 'partly_cloudy' | 'cloudy' | 'overcast' | 'rainy';
    if (habitCount === 0) {
      atmosphere = 'cloudy';
    } else if (averageCompletionRate >= 85) {
      atmosphere = 'sunny';
    } else if (averageCompletionRate >= 70) {
      atmosphere = 'partly_cloudy';
    } else if (averageCompletionRate >= 50) {
      atmosphere = 'cloudy';
    } else if (averageCompletionRate >= 25) {
      atmosphere = 'overcast';
    } else {
      atmosphere = 'rainy';
    }

    return NextResponse.json({
      zones,
      atmosphere,
      averageCompletionRate,
      habitCount,
      totalHabits: userHabits.length,
    });
  } catch (error) {
    console.error('Error fetching garden:', error);
    return NextResponse.json({ error: 'Failed to fetch garden' }, { status: 500 });
  }
}
