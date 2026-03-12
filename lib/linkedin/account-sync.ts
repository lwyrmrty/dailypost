import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { linkedinAccounts } from '@/lib/db/schema';

interface UpsertLinkedInAccountInput {
  userId: string;
  linkedinId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: Date;
  displayName?: string | null;
  profileUrl?: string | null;
}

export function normalizeLinkedInMemberId(linkedinId: string): string {
  return linkedinId.startsWith('urn:')
    ? linkedinId
    : `urn:li:person:${linkedinId}`;
}

export async function upsertLinkedInAccount({
  userId,
  linkedinId,
  accessToken,
  refreshToken,
  expiresAt,
  displayName,
  profileUrl,
}: UpsertLinkedInAccountInput) {
  const normalizedLinkedinId = normalizeLinkedInMemberId(linkedinId);

  const existing = await db.query.linkedinAccounts.findFirst({
    where: eq(linkedinAccounts.userId, userId),
  });

  if (existing) {
    await db
      .update(linkedinAccounts)
      .set({
        linkedinId: normalizedLinkedinId,
        accessToken,
        refreshToken,
        expiresAt,
        displayName: displayName ?? existing.displayName,
        profileUrl: profileUrl ?? existing.profileUrl,
        updatedAt: new Date(),
      })
      .where(eq(linkedinAccounts.userId, userId));

    return;
  }

  await db.insert(linkedinAccounts).values({
    userId,
    linkedinId: normalizedLinkedinId,
    accessToken,
    refreshToken,
    expiresAt,
    displayName,
    profileUrl,
  });
}
