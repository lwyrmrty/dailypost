import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { linkedinAccounts, generatedPosts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  createPost,
  createComment,
  reactToPost,
  resharePost,
  refreshAccessToken,
} from '@/lib/linkedin/client';

type PublishAction = 'post' | 'comment' | 'react' | 'reshare';
type ReactionType = 'LIKE' | 'CELEBRATE' | 'SUPPORT' | 'LOVE' | 'INSIGHTFUL' | 'FUNNY';

interface PublishRequest {
  action: PublishAction;
  content: string;
  postUrn?: string; // Required for comment, react, reshare
  reactionType?: ReactionType;
  generatedPostId?: string; // If publishing a generated post, mark it as posted
}

/**
 * Ensure the token is still valid; refresh if expired and a refresh token exists.
 */
async function getValidToken(userId: string) {
  const account = await db.query.linkedinAccounts.findFirst({
    where: eq(linkedinAccounts.userId, userId),
  });

  if (!account) {
    return null;
  }

  // If token is expired, try refreshing
  if (account.expiresAt < new Date()) {
    if (!account.refreshToken) {
      return null; // Can't refresh — user needs to reconnect
    }

    try {
      const refreshed = await refreshAccessToken(account.refreshToken);
      const newExpiry = new Date(Date.now() + refreshed.expiresIn * 1000);

      await db.update(linkedinAccounts)
        .set({
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          expiresAt: newExpiry,
          updatedAt: new Date(),
        })
        .where(eq(linkedinAccounts.userId, userId));

      return { accessToken: refreshed.accessToken, linkedinId: account.linkedinId };
    } catch {
      return null; // Refresh failed — user needs to reconnect
    }
  }

  return { accessToken: account.accessToken, linkedinId: account.linkedinId };
}

/**
 * POST /api/linkedin/publish
 * Publishes content to LinkedIn (post, comment, react, or reshare).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as PublishRequest;
  const { action, content, postUrn, reactionType, generatedPostId } = body;

  if (!action) {
    return NextResponse.json({ error: 'Action required' }, { status: 400 });
  }

  // Get valid LinkedIn token
  const tokenData = await getValidToken(session.user.id);
  if (!tokenData) {
    return NextResponse.json(
      { error: 'LinkedIn not connected or token expired. Please reconnect.' },
      { status: 403 }
    );
  }

  const { accessToken, linkedinId } = tokenData;

  try {
    let resultId = '';

    switch (action) {
      case 'post': {
        if (!content) {
          return NextResponse.json({ error: 'Content required for post' }, { status: 400 });
        }
        resultId = await createPost(accessToken, linkedinId, content);
        break;
      }

      case 'comment': {
        if (!content || !postUrn) {
          return NextResponse.json({ error: 'Content and postUrn required for comment' }, { status: 400 });
        }
        resultId = await createComment(accessToken, linkedinId, postUrn, content);
        break;
      }

      case 'react': {
        if (!postUrn) {
          return NextResponse.json({ error: 'postUrn required for reaction' }, { status: 400 });
        }
        await reactToPost(accessToken, linkedinId, postUrn, reactionType || 'LIKE');
        break;
      }

      case 'reshare': {
        if (!postUrn) {
          return NextResponse.json({ error: 'postUrn required for reshare' }, { status: 400 });
        }
        resultId = await resharePost(accessToken, linkedinId, postUrn, content || '');
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // If this was a generated post, mark it as posted
    if (generatedPostId && (action === 'post' || action === 'reshare')) {
      await db.update(generatedPosts)
        .set({
          status: 'posted',
          postedAt: new Date(),
        })
        .where(eq(generatedPosts.id, generatedPostId));
    }

    return NextResponse.json({ success: true, id: resultId });
  } catch (err) {
    console.error('LinkedIn publish error:', err);
    const message = err instanceof Error ? err.message : 'Failed to publish';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
