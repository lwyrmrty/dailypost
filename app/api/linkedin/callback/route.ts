import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { linkedinAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { exchangeCodeForTokens, getLinkedInProfile } from '@/lib/linkedin/client';

/**
 * GET /api/linkedin/callback
 * OAuth callback — exchanges code for tokens, stores them, redirects to settings.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const settingsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings`;

  if (error) {
    return NextResponse.redirect(`${settingsUrl}?linkedin=error&reason=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}?linkedin=error&reason=missing_params`);
  }

  // Decode state to get userId
  let userId: string;
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString());
    userId = parsed.userId;
    if (!userId) throw new Error('No userId in state');
  } catch {
    return NextResponse.redirect(`${settingsUrl}?linkedin=error&reason=invalid_state`);
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Fetch LinkedIn profile info
    const profile = await getLinkedInProfile(tokens.accessToken);

    // Build the author URN (needed for publishing)
    const authorUrn = profile.linkedinId.startsWith('urn:')
      ? profile.linkedinId
      : `urn:li:person:${profile.linkedinId}`;

    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    // Upsert — replace existing connection for this user
    const existing = await db.query.linkedinAccounts.findFirst({
      where: eq(linkedinAccounts.userId, userId),
    });

    if (existing) {
      await db.update(linkedinAccounts)
        .set({
          linkedinId: authorUrn,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt,
          displayName: profile.name,
          profileUrl: profile.profileUrl,
          updatedAt: new Date(),
        })
        .where(eq(linkedinAccounts.userId, userId));
    } else {
      await db.insert(linkedinAccounts).values({
        userId,
        linkedinId: authorUrn,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        displayName: profile.name,
        profileUrl: profile.profileUrl,
      });
    }

    return NextResponse.redirect(`${settingsUrl}?linkedin=connected`);
  } catch (err) {
    console.error('LinkedIn OAuth callback error:', err);
    return NextResponse.redirect(`${settingsUrl}?linkedin=error&reason=token_exchange`);
  }
}
