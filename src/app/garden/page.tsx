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
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-green-50 pb-20">
      {/* Garden Container */}
      <div className="max-w-md mx-auto p-4 pb-24">
        {/* Visual Garden - Wireframe Style */}
        <div className="rounded-2xl overflow-hidden shadow-lg mb-6">
          {/* Sky Atmosphere */}
          <SkyAtmosphere
            averageCompletionRate={averageCompletionRate}
            habitCount={habitCount}
          />

          {/* Garden Zones - Horizontal Layout like Wireframes */}
          <div 
            className={`p-4 min-h-[280px] transition-all duration-500 ${
              averageCompletionRate >= 70 
                ? 'bg-gradient-to-b from-green-50/80 to-green-100/60' 
                : averageCompletionRate >= 40 
                  ? 'bg-gradient-to-b from-yellow-50/80 to-yellow-100/60'
                  : 'bg-gradient-to-b from-orange-50/80 to-orange-100/60'
            }`}
          >
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
              <>
                {/* Horizontal Garden Zones - matching wireframes */}
                <div className="flex gap-2 justify-center min-h-[200px]">
                  {zones.map((zone) => {
                    const zoneState = getZoneState(zone.completionRate14Days);
                    return (
                      <Link
                        key={zone.habitId}
                        href={`/habits/${zone.habitId}`}
                        className="flex-1 bg-white/40 backdrop-blur-sm rounded-xl p-2 flex flex-col items-center transition-all hover:bg-white/60 hover:shadow-md"
                      >
                        {/* Buddy with mood badge */}
                        <div className="relative mb-1">
                          <span className="text-4xl">{zone.emojiBuddy}</span>
                          <span className="absolute -bottom-1 -right-2 text-lg bg-white rounded-full w-6 h-6 flex items-center justify-center shadow">
                            {zone.mood.emoji}
                          </span>
                          {/* Hat */}
                          {zone.milestones?.hat && (
                            <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-lg">
                              {zone.milestones.hat}
                            </span>
                          )}
                        </div>

                        {/* Zone Name */}
                        <div className="text-xs font-semibold text-gray-700 text-center truncate w-full">
                          {zone.name}
                        </div>

                        {/* Cosmetics */}
                        <div className="text-sm mb-1">
                          {zone.milestones?.companion && <span>{zone.milestones.companion}</span>}
                          {zone.milestones?.landmark && <span>{zone.milestones.landmark}</span>}
                        </div>

                        {/* Zone Plants - based on state */}
                        <div className="text-sm flex gap-1 flex-wrap justify-center">
                          {zoneState === 'thriving' && <><span>🌳</span><span>🌻</span><span>🦋</span></>}
                          {zoneState === 'healthy' && <><span>🌿</span><span>🌸</span></>}
                          {zoneState === 'okay' && <><span>🌱</span><span>🌾</span></>}
                          {zoneState === 'struggling' && <><span>🍂</span><span>🥀</span></>}
                          {zoneState === 'neglected' && zone.completionRate14Days > 0 && <><span>🍂</span><span>🕸️</span></>}
                          {zoneState === 'neglected' && zone.completionRate14Days === 0 && <><span>💤</span></>}
                        </div>

                        {/* Empty zone placeholder */}
                        {zones.length < 3 && (
                          <div className="mt-auto pt-2">
                            <div className="text-2xl text-gray-300">+</div>
                          </div>
                        )}
                      </Link>
                    );
                  })}

                  {/* Add habit zone if less than 3 habits */}
                  {zones.length > 0 && zones.length < 3 && (
                    <Link
                      href="/habits/new"
                      className="flex-1 border-2 border-dashed border-gray-300 rounded-xl p-2 flex flex-col items-center justify-center hover:border-green-400 hover:bg-green-50/50 transition-all"
                    >
                      <span className="text-3xl text-gray-400 mb-1">🌱</span>
                      <span className="text-xs text-gray-400">Add habit</span>
                    </Link>
                  )}
                </div>

                {/* Garden Ground */}
                <div className="text-center text-lg mt-2">
                  {averageCompletionRate >= 70 && <span>🌿 · 🪨 · 🌿 · · 🍄 · 🌿</span>}
                  {averageCompletionRate >= 40 && averageCompletionRate < 70 && <span>🌿 · · 🌿 · · 🌾 · ·</span>}
                  {averageCompletionRate > 0 && averageCompletionRate < 40 && <span>🍂 · · 🍂 · · 🍂 · ·</span>}
                  {averageCompletionRate === 0 && <span>🕸️ · · · · · · ·</span>}
                </div>
              </>
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
