import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, voiceProfiles, sources, SOURCE_TYPES, SourceType } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { detectSourceType } from '@/lib/news/aggregator';

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

// Add a new source
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, sourceUrl, sourceName, sourceType, priority, keywords } = body;

    if (!userId || !sourceUrl) {
      return NextResponse.json(
        { error: 'User ID and source URL are required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Auto-detect source type if not provided
    const detectedType: SourceType = sourceType && SOURCE_TYPES.includes(sourceType)
      ? sourceType
      : detectSourceType(sourceUrl);

    // Insert new source
    const [newSource] = await db.insert(sources).values({
      userId,
      sourceUrl,
      sourceName: sourceName || null,
      sourceType: detectedType,
      priority: priority || 3,
      keywords: keywords || null,
      isActive: true,
    }).returning();

    return NextResponse.json({
      success: true,
      source: newSource,
    });
  } catch (error) {
    console.error('Add source error:', error);
    return NextResponse.json(
      { error: 'Failed to add source' },
      { status: 500 }
    );
  }
}


