import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, voiceProfiles, sources } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profile = await db.query.voiceProfiles.findFirst({
      where: eq(voiceProfiles.userId, userId),
    });

    const userSources = await db.query.sources.findMany({
      where: eq(sources.userId, userId),
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        onboardingProgress: user.onboardingProgress,
        onboardingCompleted: user.onboardingCompleted,
      },
      profile,
      sources: userSources,
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}


