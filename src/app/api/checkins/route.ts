import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { checkIns, habits } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

// GET /api/checkins?habit_id=X&from=DATE&to=DATE
export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const habitId = searchParams.get('habit_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const userId = parseInt(session.user.id);

    // Build query conditions
    const conditions = [eq(checkIns.userId, userId)];

    if (habitId) {
      conditions.push(eq(checkIns.habitId, parseInt(habitId)));
    }

    if (from) {
      conditions.push(gte(checkIns.date, from));
    }

    if (to) {
      conditions.push(lte(checkIns.date, to));
    }

    const checkInsList = await db.query.checkIns.findMany({
      where: and(...conditions),
      orderBy: (checkIns, { desc }) => [desc(checkIns.date)],
    });

    return NextResponse.json(checkInsList);
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    return NextResponse.json({ error: 'Failed to fetch check-ins' }, { status: 500 });
  }
}

// POST /api/checkins - Create or update check-in for today
export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { habit_id, completed, value } = body;

    if (!habit_id) {
      return NextResponse.json({ error: 'habit_id is required' }, { status: 400 });
    }

    // Verify habit ownership
    const habit = await db.query.habits.findFirst({
      where: and(
        eq(habits.id, habit_id),
        eq(habits.userId, parseInt(session.user.id))
      ),
    });

    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Check if check-in already exists for today
    const existingCheckIn = await db.query.checkIns.findFirst({
      where: and(
        eq(checkIns.habitId, habit_id),
        eq(checkIns.date, today)
      ),
    });

    let result;

    if (existingCheckIn) {
      // Update existing check-in
      result = await db.update(checkIns)
        .set({
          completed: completed ?? existingCheckIn.completed,
          value: value ?? existingCheckIn.value,
          updatedAt: new Date(),
        })
        .where(eq(checkIns.id, existingCheckIn.id))
        .returning();
    } else {
      // Create new check-in
      result = await db.insert(checkIns).values({
        habitId: habit_id,
        userId: parseInt(session.user.id),
        date: today,
        completed: completed ?? false,
        value: value ?? null,
      }).returning();
    }

    return NextResponse.json(result[0], { status: existingCheckIn ? 200 : 201 });
  } catch (error) {
    console.error('Error creating/updating check-in:', error);
    return NextResponse.json({ error: 'Failed to create check-in' }, { status: 500 });
  }
}
