import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { generatedPosts } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');

    let query = eq(generatedPosts.userId, session.user.id);

    if (date) {
      query = and(query, eq(generatedPosts.batchDate, date))!;
    }

    if (platform) {
      query = and(query, eq(generatedPosts.platform, platform))!;
    }

    if (status) {
      query = and(query, eq(generatedPosts.status, status))!;
    }

    const posts = await db.query.generatedPosts.findMany({
      where: query,
      orderBy: [desc(generatedPosts.generatedAt)],
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Failed to get posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}






