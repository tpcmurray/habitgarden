import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { habits } from '@/lib/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';

// GET /api/habits - List all habits for authenticated user
export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userHabits = await db.query.habits.findMany({
      where: eq(habits.userId, parseInt(session.user.id)),
      orderBy: [desc(habits.sortOrder), desc(habits.createdAt)],
    });

    return NextResponse.json(userHabits);
  } catch (error) {
    console.error('Error fetching habits:', error);
    return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 });
  }
}

// POST /api/habits - Create new habit
export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, emojiBuddy, direction, type, targetValue, targetUnit, frequency, customDays, reminderTime } = body;

    // Validate required fields
    if (!name || !emojiBuddy) {
      return NextResponse.json({ error: 'Name and emoji are required' }, { status: 400 });
    }

    // Enforce 3-active-habit limit
    const existingActiveHabits = await db.query.habits.findMany({
      where: and(
        eq(habits.userId, parseInt(session.user.id)),
        eq(habits.active, true)
      ),
    });

    if (existingActiveHabits.length >= 3) {
      return NextResponse.json(
        { error: 'Maximum of 3 active habits allowed. Archive an existing habit first.' },
        { status: 400 }
      );
    }

    // Create the habit
    const newHabit = await db.insert(habits).values({
      userId: parseInt(session.user.id),
      name,
      emojiBuddy,
      direction: direction || 'build',
      type: type || 'binary',
      targetValue: targetValue || null,
      targetUnit: targetUnit || null,
      frequency: frequency || 'daily',
      customDays: customDays || [false, false, false, false, false, false, false],
      reminderTime: reminderTime || null,
      sortOrder: existingActiveHabits.length,
    }).returning();

    return NextResponse.json(newHabit[0], { status: 201 });
  } catch (error) {
    console.error('Error creating habit:', error);
    return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 });
  }
}
