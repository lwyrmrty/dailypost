import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getLinkedInAuthUrl } from '@/lib/linkedin/client';
import crypto from 'crypto';

/**
 * GET /api/linkedin/connect
 * Initiates LinkedIn OAuth flow — redirects user to LinkedIn authorization page.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // State parameter encodes the user ID + a random nonce for CSRF protection
  const nonce = crypto.randomBytes(16).toString('hex');
  const state = Buffer.from(JSON.stringify({ userId: session.user.id, nonce })).toString('base64url');

  const authUrl = getLinkedInAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
