import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { linkedinAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { refreshAccessToken } from '@/lib/linkedin/client';

/**
 * GET /api/linkedin/status
 * Returns the current user's LinkedIn connection status.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const account = await db.query.linkedinAccounts.findFirst({
    where: eq(linkedinAccounts.userId, session.user.id),
  });

  if (!account) {
    return NextResponse.json({ connected: false });
  }

  if (account.expiresAt < new Date() && account.refreshToken) {
    try {
      const refreshed = await refreshAccessToken(account.refreshToken);
      const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);

      await db
        .update(linkedinAccounts)
        .set({
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(linkedinAccounts.userId, session.user.id));

      return NextResponse.json({
        connected: true,
        expired: false,
        displayName: account.displayName,
        profileUrl: account.profileUrl,
        expiresAt: expiresAt.toISOString(),
      });
    } catch {
      // Fall through to the expired response below.
    }
  }

  const isExpired = account.expiresAt < new Date();

  return NextResponse.json({
    connected: !isExpired,
    expired: isExpired,
    displayName: account.displayName,
    profileUrl: account.profileUrl,
    expiresAt: account.expiresAt.toISOString(),
  });
}
