'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BottomNav } from '@/components/navigation/BottomNav';

interface Habit {
  id: number;
  name: string;
  emojiBuddy: string;
  frequency: string;
  active: boolean;
  createdAt: string;
}

export default function HabitsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchHabits();
    }
  }, [session]);

  async function fetchHabits() {
    try {
      const res = await fetch('/api/habits');
      if (res.ok) {
        const data = await res.json();
        setHabits(data);
      }
    } catch (error) {
      console.error('Failed to fetch habits:', error);
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
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">My Habits 🌱</h1>
          <Link
            href="/habits/new"
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            + New
          </Link>
        </div>
      </header>

      {/* Habits List */}
      <main className="max-w-md mx-auto px-4 py-6">
        {habits.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌱</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No habits yet</h2>
            <p className="text-gray-600 mb-6">Start your journey by adding your first habit!</p>
            <Link
              href="/habits/new"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Create Your First Habit
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {habits.map((habit) => (
              <Link
                key={habit.id}
                href={`/habits/${habit.id}`}
                className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{habit.emojiBuddy}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{habit.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{habit.frequency}</p>
                  </div>
                  <div className="text-gray-400">
                    →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Bottom Navigation */}
        <BottomNav />
      </main>
    </div>
  );
}
