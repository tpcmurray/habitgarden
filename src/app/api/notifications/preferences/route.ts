import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = parseInt(session.user.id);
  
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  const preferences = user.notificationPreferences as Record<string, boolean> || {
    reminders: true,
    streakCelebrations: true,
    reengagement: true,
    weeklySummary: true,
  };
  
  return NextResponse.json({
    preferences,
    oneSignalPlayerId: user.onesignalPlayerId,
  });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = parseInt(session.user.id);
  const body = await request.json();
  const { preferences, oneSignalPlayerId } = body;
  
  const updateData: Record<string, unknown> = {};
  
  if (preferences) {
    updateData.notificationPreferences = preferences;
  }
  
  if (oneSignalPlayerId) {
    updateData.oneSignalPlayerId = oneSignalPlayerId;
  }
  
  await db.update(users)
    .set(updateData)
    .where(eq(users.id, userId));
  
  return NextResponse.json({ success: true });
}
