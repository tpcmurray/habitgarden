import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { habits, milestones } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAllHabitMoods } from '@/lib/garden/moods';
import { calculate14DayRate, calculateAverageCompletionRate } from '@/lib/garden/calculations';
import { SkyAtmosphere } from '@/components/garden/SkyAtmosphere';
import { BuddyDisplay } from '@/components/garden/BuddyDisplay';
import { getZoneState } from '@/lib/garden/zoneState';
import Link from 'next/link';
import { BottomNav } from '@/components/navigation/BottomNav';
import { CheckInPrompts } from '@/components/garden/CheckInPrompts';

export default async function GardenPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

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

      // Get milestones for this habit
      const habitMilestones = await db.query.milestones.findMany({
        where: eq(milestones.habitId, habit.id),
      });

      // Separate milestones by type
      const hat = habitMilestones.find(m => (m.cosmetic as any)?.type === 'hat');
      const companion = habitMilestones.find(m => (m.cosmetic as any)?.type === 'companion');
      const landmark = habitMilestones.find(m => (m.cosmetic as any)?.type === 'landmark');

      return {
        habitId: habit.id,
        name: habit.name,
        emojiBuddy: habit.emojiBuddy,
        mood: moodInfo?.mood || {
          mood: 'dormant' as const,
          emoji: '😴',
          label: 'Waiting',
          animation: 'none' as const,
        },
        completionRate7Days: moodInfo?.completionRate7Days || 0,
        completionRate14Days,
        milestones: {
          hat: (hat?.cosmetic as any)?.value || null,
          companion: (companion?.cosmetic as any)?.value || null,
          landmark: (landmark?.cosmetic as any)?.value || null,
        },
      };
    })
  );

  // Calculate overall garden health
  const { average: averageCompletionRate, habitCount } = await calculateAverageCompletionRate(userId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-green-50">
      {/* Sky Atmosphere */}
      <SkyAtmosphere
        averageCompletionRate={averageCompletionRate}
        habitCount={habitCount}
      />

      {/* Garden Container */}
      <div className="max-w-md mx-auto p-4 pb-24">
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg overflow-hidden">
          {/* Garden Zones */}
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Garden</h2>

            <div className="space-y-3">
              {zones.length === 0 ? (
                // Empty state
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🌱</div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    Plant your first habit!
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Start your garden by adding a habit to track.
                  </p>
                  <Link
                    href="/habits/new"
                    className="btn btn-primary"
                  >
                    Add Habit 🌱
                  </Link>
                </div>
              ) : (
                zones.map((zone) => {
                  const zoneState = getZoneState(zone.completionRate14Days);
                  return (
                    <Link
                      key={zone.habitId}
                      href={`/habits/${zone.habitId}`}
                      className="block"
                    >
                      <div
                        className={`rounded-xl p-4 transition-all hover:shadow-md ${
                          zoneState === 'thriving' || zoneState === 'healthy'
                            ? 'bg-green-50'
                            : zoneState === 'okay'
                            ? 'bg-yellow-50'
                            : 'bg-orange-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Buddy */}
                          <BuddyDisplay
                            emoji={zone.emojiBuddy}
                            mood={zone.mood.mood}
                            showAnimation={zone.mood.animation === 'bounce' || zone.mood.animation === 'pulse'}
                            size="medium"
                            hat={zone.milestones?.hat}
                          />

                          {/* Info */}
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {zone.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {zone.mood.label} • {Math.round(zone.completionRate7Days)}% this week
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-16">
                            <div className="text-xs text-gray-500 text-right mb-1">
                              {Math.round(zone.completionRate14Days)}%
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  zoneState === 'thriving' || zoneState === 'healthy'
                                    ? 'bg-green-500'
                                    : zoneState === 'okay'
                                    ? 'bg-yellow-500'
                                    : 'bg-orange-500'
                                }`}
                                style={{ width: `${zone.completionRate14Days}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Environment elements */}
                        <div className="mt-3 flex gap-1 text-sm">
                          {/* Landmark */}
                          {zone.milestones?.landmark && (
                            <span className="mr-2">{zone.milestones.landmark}</span>
                          )}
                          {/* Companion */}
                          {zone.milestones?.companion && (
                            <span className="mr-2">{zone.milestones.companion}</span>
                          )}
                          {/* Zone state elements */}
                          {zoneState === 'thriving' && <span>🌳🌻🦋</span>}
                          {zoneState === 'healthy' && <span>🌿🌸</span>}
                          {zoneState === 'okay' && <span>🌱</span>}
                          {zoneState === 'struggling' && <span>🍂</span>}
                          {zoneState === 'neglected' && zone.completionRate14Days > 0 && <span>🥀</span>}
                          {zone.completionRate14Days === 0 && <span>💤</span>}
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            {/* Add habit button (if less than 3) */}
            {zones.length > 0 && zones.length < 3 && (
              <Link
                href="/habits/new"
                className="mt-4 w-full btn btn-secondary border-2 border-dashed border-gray-300"
              >
                + Add another habit
              </Link>
            )}
          </div>
        </div>

        {/* Encouragement message */}
        {zones.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-600">
            {averageCompletionRate >= 85 && (
              <p>🌟 Your garden is thriving! Keep up the amazing work!</p>
            )}
            {averageCompletionRate >= 70 && averageCompletionRate < 85 && (
              <p>💚 Your habits are growing strong!</p>
            )}
            {averageCompletionRate >= 50 && averageCompletionRate < 70 && (
              <p>🌱 Your garden needs some attention. You've got this!</p>
            )}
            {averageCompletionRate > 0 && averageCompletionRate < 50 && (
              <p>💧 Let's bring your garden back to life!</p>
            )}
            {averageCompletionRate === 0 && (
              <p>🌱 Time to start watering your habits!</p>
            )}
          </div>
        )}

        {/* Today's Check-in Prompts */}
        <CheckInPrompts />
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
