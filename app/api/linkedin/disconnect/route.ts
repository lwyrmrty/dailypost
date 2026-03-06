import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { linkedinAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/linkedin/disconnect
 * Removes the stored LinkedIn connection for the current user.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await db.delete(linkedinAccounts).where(eq(linkedinAccounts.userId, session.user.id));

  return NextResponse.json({ success: true });
}
