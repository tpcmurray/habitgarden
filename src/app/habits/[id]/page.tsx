import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { habits, checkIns } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { calculateStreak } from '@/lib/streaks/calculator';
import { CheckInButton } from '@/components/habits/CheckInButton';
import Link from 'next/link';

// Helper to get mood emoji based on streak
function getMoodEmoji(streak: number): { emoji: string; label: string } {
  if (streak >= 30) return { emoji: '🤩', label: 'On Fire!' };
  if (streak >= 14) return { emoji: '😊', label: 'Thriving' };
  if (streak >= 7) return { emoji: '🙂', label: 'Growing' };
  if (streak >= 3) return { emoji: '😐', label: 'Starting' };
  if (streak >= 1) return { emoji: '😴', label: 'Waking Up' };
  return { emoji: '💤', label: 'Dormant' };
}

// Get last 14 days of check-ins for calendar
async function getCheckInHistory(habitId: number, userId: number) {
  const today = new Date();
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(today.getDate() - 13);

  const checkInsList = await db.query.checkIns.findMany({
    where: and(
      eq(checkIns.habitId, habitId),
      eq(checkIns.userId, userId),
    ),
  });

  const checkInMap = new Map<string, boolean>();
  checkInsList.forEach((ci) => {
    if (ci.completed !== null && ci.completed !== undefined) {
      checkInMap.set(ci.date, ci.completed);
    }
  });

  // Generate last 14 days
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
      completed: checkInMap.get(dateStr) || false,
    });
  }

  return days;
}

export default async function HabitDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="p-4 text-center">
        <p>Please sign in to view your habits.</p>
      </div>
    );
  }

  const habitId = parseInt(params.id);
  const userId = parseInt(session.user.id);

  // Fetch habit
  const habit = await db.query.habits.findFirst({
    where: and(eq(habits.id, habitId), eq(habits.userId, userId)),
  });

  if (!habit) {
    notFound();
  }

  // Calculate streak
  const streakInfo = await calculateStreak(habitId, userId);
  const mood = getMoodEmoji(streakInfo.currentStreak);

  // Get check-in history
  const history = await getCheckInHistory(habitId, userId);

  return (
    <div className="p-4">
      {/* Back button */}
      <Link
        href="/garden"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        ← Back to Garden
      </Link>

      {/* Hero Section */}
      <div className="text-center py-6">
        <div className="relative inline-block">
          <span className="text-7xl">{habit.emojiBuddy}</span>
          <span className="absolute -bottom-2 -right-2 text-3xl bg-white rounded-full p-1">
            {mood.emoji}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mt-3">{habit.name}</h1>
        <p className="text-gray-500 mt-1">
          {streakInfo.currentStreak} day streak • {mood.label}
        </p>
        {streakInfo.longestStreak > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            Best: {streakInfo.longestStreak} days
          </p>
        )}
      </div>

      {/* Check-in Button */}
      <div className="mb-6">
        <CheckInButton
          habitId={habit.id}
          emojiBuddy={habit.emojiBuddy}
          habitName={habit.name}
          type={habit.type as 'binary' | 'measured'}
          targetValue={habit.targetValue || undefined}
          targetUnit={habit.targetUnit || undefined}
          completed={streakInfo.isActiveToday}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{streakInfo.currentStreak}</div>
          <div className="text-xs text-gray-500">Current</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{streakInfo.totalCheckIns}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600">{streakInfo.completionRate}%</div>
          <div className="text-xs text-gray-500">Rate</div>
        </div>
      </div>

      {/* 14-Day Calendar */}
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Last 14 Days</h3>
        <div className="flex gap-1 justify-between">
          {history.map((day) => (
            <div key={day.date} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  day.completed
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {day.completed ? '✓' : '×'}
              </div>
              <span className="text-[10px] text-gray-400 mt-1">{day.dayLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Habit Settings */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Settings</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Type</span>
            <span className="text-gray-900">
              {habit.type === 'binary' ? 'Yes/No' : `${habit.targetValue} ${habit.targetUnit}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Frequency</span>
            <span className="text-gray-900 capitalize">{habit.frequency}</span>
          </div>
          {habit.reminderTime && (
            <div className="flex justify-between">
              <span className="text-gray-500">Reminder</span>
              <span className="text-gray-900">{habit.reminderTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* Archive Button */}
      <div className="mt-6">
        <form
          action={async () => {
            'use server';
            // This would be a server action to archive
          }}
        >
          <button
            type="submit"
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Archive this habit
          </button>
        </form>
      </div>
    </div>
  );
}
