import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { teamMembers, linkedinAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createPost, refreshAccessToken } from '@/lib/linkedin/client';

interface MemberPost {
  userId: string;    // The team member to post on behalf of
  content: string;   // The post content (may include @mention annotations)
}

interface BatchPublishRequest {
  teamId: string;
  posts: MemberPost[];
}

interface PublishResult {
  userId: string;
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * POST /api/teams/batch-publish
 * Publish posts to LinkedIn on behalf of multiple team members at once.
 * The requester must be a member of the team, and all target users must
 * also be members of the same team with connected LinkedIn accounts.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as BatchPublishRequest;
  const { teamId, posts } = body;

  if (!teamId || !posts || posts.length === 0) {
    return NextResponse.json({ error: 'teamId and posts[] required' }, { status: 400 });
  }

  // Verify requester is a team member
  const requesterMembership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, session.user.id),
    ),
  });

  if (!requesterMembership) {
    return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
  }

  // Verify all target users are team members
  const targetUserIds = posts.map((p) => p.userId);
  const targetMemberships = await db.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, teamId),
  });
  const memberUserIds = new Set(targetMemberships.map((m) => m.userId));

  for (const userId of targetUserIds) {
    if (!memberUserIds.has(userId)) {
      return NextResponse.json(
        { error: `User ${userId} is not a member of this team` },
        { status: 400 }
      );
    }
  }

  // Publish each post concurrently
  const results: PublishResult[] = await Promise.all(
    posts.map(async ({ userId, content }): Promise<PublishResult> => {
      try {
        // Get the target user's LinkedIn account
        const account = await db.query.linkedinAccounts.findFirst({
          where: eq(linkedinAccounts.userId, userId),
        });

        if (!account) {
          return { userId, success: false, error: 'LinkedIn not connected' };
        }

        // Refresh token if expired
        let accessToken = account.accessToken;
        if (account.expiresAt < new Date()) {
          if (!account.refreshToken) {
            return { userId, success: false, error: 'Token expired, no refresh token' };
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
            accessToken = refreshed.accessToken;
          } catch {
            return { userId, success: false, error: 'Token refresh failed' };
          }
        }

        const postId = await createPost(accessToken, account.linkedinId, content);
        return { userId, success: true, postId };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return { userId, success: false, error: message };
      }
    })
  );

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({ results, summary: { succeeded, failed, total: results.length } });
}
