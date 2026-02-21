import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getHabitStats } from '@/lib/analytics/calculations';

export async function GET(
  request: NextRequest,
  { params }: { params: { habitId: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = parseInt(session.user.id);
  const habitId = parseInt(params.habitId);
  
  if (isNaN(habitId)) {
    return NextResponse.json({ error: 'Invalid habit ID' }, { status: 400 });
  }
  
  try {
    const stats = await getHabitStats(habitId, userId);
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
