import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    // Get userId from request body (passed from client with session)
    const body = await req.json().catch(() => ({}));
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Mark onboarding as completed
    await db.update(users)
      .set({
        onboardingCompleted: true,
        onboardingProgress: 100,
      })
      .where(eq(users.id, userId));

    // Note: Sources are now explicitly added by user during onboarding Step 8
    // No default sources are auto-created

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to complete onboarding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
