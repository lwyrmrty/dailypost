import 'server-only';

import { asc, eq } from 'drizzle-orm';
import { ComposerImageDto } from './composer-images';
import { deleteComposerImageFile } from './composer-image-storage';
import { db } from './db';
import { composerImages, ComposerImageRecord } from './db/schema';

export function serializeComposerImage(record: ComposerImageRecord): ComposerImageDto {
  return {
    id: record.id,
    publicUrl: record.publicUrl,
    originalName: record.originalName,
    mimeType: record.mimeType,
    fileSize: record.fileSize,
    width: record.width,
    height: record.height,
    sortOrder: record.sortOrder,
    linkedinImageUrn: record.linkedinImageUrn,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function listComposerImageRecordsForUser(userId: string) {
  return db.query.composerImages.findMany({
    where: eq(composerImages.userId, userId),
    orderBy: [asc(composerImages.sortOrder), asc(composerImages.createdAt)],
  });
}

export async function listComposerImagesForUser(userId: string) {
  const records = await listComposerImageRecordsForUser(userId);
  return records.map(serializeComposerImage);
}

export async function reindexComposerImagesForUser(userId: string) {
  const records = await listComposerImageRecordsForUser(userId);

  await Promise.all(records.map((record, index) => db.update(composerImages)
    .set({
      sortOrder: index,
      updatedAt: new Date(),
    })
    .where(eq(composerImages.id, record.id))));
}

export async function clearComposerImagesForUser(userId: string) {
  const records = await listComposerImageRecordsForUser(userId);

  if (records.length === 0) {
    return;
  }

  await db.delete(composerImages).where(eq(composerImages.userId, userId));
  await Promise.all(records.map((record) => deleteComposerImageFile(record.storageKey)));
}
