import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { habits } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// POST /api/habits/[id]/archive - Soft delete (set active=false)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const habitId = parseInt(params.id);

    // Check ownership
    const existingHabit = await db.query.habits.findFirst({
      where: and(
        eq(habits.id, habitId),
        eq(habits.userId, parseInt(session.user.id))
      ),
    });

    if (!existingHabit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    // Archive the habit
    const archivedHabit = await db.update(habits)
      .set({ 
        active: false,
        updatedAt: new Date()
      })
      .where(and(eq(habits.id, habitId), eq(habits.userId, parseInt(session.user.id))))
      .returning();

    return NextResponse.json(archivedHabit[0]);
  } catch (error) {
    console.error('Error archiving habit:', error);
    return NextResponse.json({ error: 'Failed to archive habit' }, { status: 500 });
  }
}
