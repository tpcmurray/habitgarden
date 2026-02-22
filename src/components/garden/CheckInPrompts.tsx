'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Habit {
  id: number;
  name: string;
  emojiBuddy: string;
  targetValue?: number;
  targetUnit?: string;
  isMeasured: boolean;
}

interface CheckInPrompt {
  habit: Habit;
  completed: boolean;
  daysMissed: number;
}

export function CheckInPrompts() {
  const [prompts, setPrompts] = useState<CheckInPrompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrompts();
  }, []);

  async function fetchPrompts() {
    try {
      const habitsRes = await fetch('/api/habits');
      if (!habitsRes.ok) return;
      
      const habits: Habit[] = await habitsRes.json();
      
      // Get today's check-ins
      const today = new Date().toISOString().split('T')[0];
      const checkInsRes = await fetch('/api/checkins');
      let checkIns: any[] = [];
      if (checkInsRes.ok) {
        checkIns = await checkInsRes.json();
      }
      
      // Filter to today's check-ins
      const todayCheckIns = checkIns.filter((c: any) => c.date.startsWith(today));
      const completedHabitIds = new Set(todayCheckIns.map((c: any) => c.habitId));
      
      // Calculate missed days for each habit
      const promptsWithStatus: CheckInPrompt[] = habits.map((habit) => {
        const completed = completedHabitIds.has(habit.id);
        
        // Calculate days missed (simplified - just count consecutive days without check-in)
        let daysMissed = 0;
        const habitCheckIns = checkIns
          .filter((c: any) => c.habitId === habit.id)
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (!completed && habitCheckIns.length > 0) {
          const lastCheckIn = new Date(habitCheckIns[0].date);
          const todayDate = new Date(today);
          const diffTime = todayDate.getTime() - lastCheckIn.getTime();
          daysMissed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        } else if (!completed && habitCheckIns.length === 0) {
          daysMissed = 0;
        }
        
        return {
          habit,
          completed,
          daysMissed,
        };
      });
      
      // Sort: incomplete first, then completed
      promptsWithStatus.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return b.daysMissed - a.daysMissed;
      });
      
      setPrompts(promptsWithStatus);
    } catch (error) {
      console.error('Failed to fetch prompts:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return null;
  }

  if (prompts.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Check-ins</h2>
      <div className="space-y-3">
        {prompts.map((prompt) => (
          <Link
            key={prompt.habit.id}
            href={`/habits/${prompt.habit.id}`}
            className={`block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow ${
              prompt.completed ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{prompt.habit.emojiBuddy}</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{prompt.habit.name}</div>
                <div className="text-sm text-gray-500">
                  {prompt.completed 
                    ? 'Done today ✓' 
                    : prompt.daysMissed > 0 
                      ? `${prompt.daysMissed} day${prompt.daysMissed > 1 ? 's' : ''} missed`
                      : prompt.habit.isMeasured 
                        ? `Goal: ${prompt.habit.targetValue} ${prompt.habit.targetUnit}`
                        : 'Yes / No'
                  }
                </div>
              </div>
              <div 
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-lg ${
                  prompt.completed 
                    ? 'bg-green-600 border-green-600 text-white' 
                    : 'border-green-600 text-green-600'
                }`}
              >
                {prompt.completed ? '✓' : '○'}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
