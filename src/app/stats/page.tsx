'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BottomNav } from '@/components/navigation/BottomNav';

interface HabitStats {
  id: number;
  name: string;
  emojiBuddy: string;
  currentStreak: number;
  bestStreak: number;
  completionRateWeek: number;
  completionRateMonth: number;
  totalCheckIns: number;
}

interface OverallStats {
  totalHabits: number;
  averageCompletionRate: number;
  totalCheckIns: number;
}

export default function StatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [habits, setHabits] = useState<HabitStats[]>([]);
  const [overall, setOverall] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchStats();
    }
  }, [session]);

  async function fetchStats() {
    try {
      // Get all habits with their stats
      const habitsRes = await fetch('/api/habits');
      if (habitsRes.ok) {
        const habitsData = await habitsRes.json();
        
        // Fetch stats for each habit
        const habitStatsPromises = habitsData.map(async (habit: any) => {
          const statsRes = await fetch(`/api/analytics/${habit.id}`);
          const stats = statsRes.ok ? await statsRes.json() : null;
          
          return {
            id: habit.id,
            name: habit.name,
            emojiBuddy: habit.emojiBuddy,
            currentStreak: stats?.currentStreak || 0,
            bestStreak: stats?.bestStreak || 0,
            completionRateWeek: stats?.completionRateWeek || 0,
            completionRateMonth: stats?.completionRateMonth || 0,
            totalCheckIns: stats?.totalCheckIns || 0,
          };
        });
        
        const habitStats = await Promise.all(habitStatsPromises);
        setHabits(habitStats);
        
        // Calculate overall stats
        if (habitStats.length > 0) {
          const avgRate = habitStats.reduce((sum, h) => sum + h.completionRateWeek, 0) / habitStats.length;
          const totalCheckIns = habitStats.reduce((sum, h) => sum + h.totalCheckIns, 0);
          setOverall({
            totalHabits: habitStats.length,
            averageCompletionRate: avgRate,
            totalCheckIns,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 to-green-50 flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-green-50 pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">📊 Statistics</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* Overall Stats */}
        {overall && (
          <div className="mb-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-green-600">{overall.totalHabits}</div>
                <div className="text-xs text-gray-500">Habits</div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-green-600">{Math.round(overall.averageCompletionRate)}%</div>
                <div className="text-xs text-gray-500">Avg. Rate</div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-green-600">{overall.totalCheckIns}</div>
                <div className="text-xs text-gray-500">Check-ins</div>
              </div>
            </div>
          </div>
        )}

        {/* Per-Habit Stats */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Habits</h2>
          
          {habits.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-600">No habits to show stats for yet.</p>
              <Link href="/habits/new" className="text-green-600 font-medium">
                Create your first habit →
              </Link>
            </div>
          ) : (
            habits.map((habit) => (
              <Link
                key={habit.id}
                href={`/habits/${habit.id}`}
                className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-3xl">{habit.emojiBuddy}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{habit.name}</h3>
                    <p className="text-sm text-gray-500">🔥 {habit.currentStreak} day streak</p>
                  </div>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-green-600">{habit.currentStreak}</div>
                    <div className="text-xs text-gray-500">Current</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-green-600">{habit.bestStreak}</div>
                    <div className="text-xs text-gray-500">Best</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-green-600">{Math.round(habit.completionRateWeek)}%</div>
                    <div className="text-xs text-gray-500">Week</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-green-600">{Math.round(habit.completionRateMonth)}%</div>
                    <div className="text-xs text-gray-500">Month</div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Heatmap for each habit - coming soon */}
        {/* {habits.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity</h2>
            {habits.map((habit) => (
              <div key={habit.id} className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{habit.emojiBuddy}</span>
                  <span className="font-medium text-gray-700">{habit.name}</span>
                </div>
                <CalendarHeatmap habitId={habit.id} />
              </div>
            ))}
          </div>
        )} */}
      </main>

      <BottomNav />
    </div>
  );
}
