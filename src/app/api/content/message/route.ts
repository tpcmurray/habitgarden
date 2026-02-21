import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { habits, checkIns } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { calculateStreak } from '@/lib/streaks/calculator';
import { 
  getContentMessage, 
  TriggerType, 
  ContextType 
} from '@/lib/content/selector';

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = parseInt(session.user.id);
  const { searchParams } = new URL(request.url);
  const habitId = searchParams.get('habit_id');
  const type = searchParams.get('type') as 'habit_science' | 'encouragement' || 'encouragement';
  const trigger = searchParams.get('trigger') as TriggerType | undefined;
  const context = searchParams.get('context') as ContextType | undefined;
  const justCheckedIn = searchParams.get('just_checked_in') === 'true';
  const wasBroken = searchParams.get('was_broken') === 'true';
  
  if (!habitId) {
    return NextResponse.json({ error: 'habit_id is required' }, { status: 400 });
  }
  
  const habitIdNum = parseInt(habitId);
  
  // Fetch habit
  const habit = await db.query.habits.findFirst({
    where: and(eq(habits.id, habitIdNum), eq(habits.userId, userId)),
  });
  
  if (!habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
  }
  
  // Calculate streak info
  const streakInfo = await calculateStreak(habitIdNum, userId);
  
  // Get completion rates
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  
  const monthAgo = new Date(today);
  monthAgo.setDate(today.getDate() - 30);
  
  const recentCheckIns = await db.query.checkIns.findMany({
    where: and(
      eq(checkIns.habitId, habitIdNum),
      eq(checkIns.userId, userId)
    ),
  });
  
  const weekCheckIns = recentCheckIns.filter(ci => {
    const ciDate = new Date(ci.createdAt || '');
    return ciDate >= weekAgo && ci.completed;
  });
  
  const monthCheckIns = recentCheckIns.filter(ci => {
    const ciDate = new Date(ci.createdAt || '');
    return ciDate >= monthAgo && ci.completed;
  });
  
  const completionRate7Days = Math.round((weekCheckIns.length / 7) * 100);
  const completionRate30Days = Math.round((monthCheckIns.length / 30) * 100);
  
  // Calculate days since start
  const createdAt = new Date(habit.createdAt || new Date());
  const daysSinceStart = Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  
  const habitInfo = {
    id: habit.id,
    name: habit.name,
    emojiBuddy: habit.emojiBuddy,
    direction: habit.direction as 'build' | 'break',
    createdAt: createdAt,
  };
  
  const streakInfoComplete = {
    ...streakInfo,
    completionRate7Days,
    completionRate30Days,
    daysSinceStart,
  };
  
  const contentMessage = getContentMessage(habitInfo, streakInfoComplete, type, {
    trigger,
    context,
    justCheckedIn,
    wasBroken,
  });
  
  return NextResponse.json(contentMessage);
}
