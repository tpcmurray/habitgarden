import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { habits } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// PATCH /api/habits/[id] - Update habit details
// Note: Cannot change emoji_buddy, direction, type
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const habitId = parseInt(params.id);
    const body = await request.json();
    const { name, reminderTime, frequency, customDays, sortOrder } = body;

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

    // Prevent changing protected fields
    if (body.emojiBuddy || body.direction || body.type) {
      return NextResponse.json(
        { error: 'Cannot change emoji, direction, or type after creation' },
        { status: 400 }
      );
    }

    // Build update object with only allowed fields
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (reminderTime !== undefined) updateData.reminderTime = reminderTime;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (customDays !== undefined) updateData.customDays = customDays;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    updateData.updatedAt = new Date();

    const updatedHabit = await db.update(habits)
      .set(updateData)
      .where(and(eq(habits.id, habitId), eq(habits.userId, parseInt(session.user.id))))
      .returning();

    return NextResponse.json(updatedHabit[0]);
  } catch (error) {
    console.error('Error updating habit:', error);
    return NextResponse.json({ error: 'Failed to update habit' }, { status: 500 });
  }
}

// DELETE /api/habits/[id] - Hard delete habit + check-ins + milestones
export async function DELETE(
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

    // Delete the habit (cascades to check_ins and milestones due to FK)
    await db.delete(habits)
      .where(and(eq(habits.id, habitId), eq(habits.userId, parseInt(session.user.id))));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting habit:', error);
    return NextResponse.json({ error: 'Failed to delete habit' }, { status: 500 });
  }
}
