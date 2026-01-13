import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generatedPosts, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get user info
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get posts for the date
    const posts = await db.query.generatedPosts.findMany({
      where: and(
        eq(generatedPosts.userId, userId),
        eq(generatedPosts.batchDate, date)
      ),
      orderBy: (posts, { desc }) => [desc(posts.generatedAt)],
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
      },
      posts,
      selectedDate: date,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
