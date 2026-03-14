import 'server-only';

import { randomUUID } from 'crypto';
import { mkdir, rm, writeFile } from 'fs/promises';
import path from 'path';

const COMPOSER_IMAGE_UPLOAD_ROOT = path.join(
  process.cwd(),
  'public',
  'uploads',
  'dashboard-composer'
);

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

function normalizeStorageKey(storageKey: string) {
  return storageKey.replace(/^\/+/, '');
}

function resolveStoragePath(storageKey: string) {
  const normalizedStorageKey = normalizeStorageKey(storageKey);
  return path.join(COMPOSER_IMAGE_UPLOAD_ROOT, normalizedStorageKey);
}

function getFileExtension(fileName: string, mimeType: string) {
  const explicitExtension = path.extname(fileName).toLowerCase();

  if (explicitExtension) {
    return explicitExtension;
  }

  return MIME_TO_EXTENSION[mimeType] || '';
}

export async function storeComposerImageFile(userId: string, file: File) {
  const extension = getFileExtension(file.name, file.type);
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const storageKey = `${userId}/${fileName}`;
  const absolutePath = resolveStoragePath(storageKey);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return {
    absolutePath,
    publicUrl: `/uploads/dashboard-composer/${storageKey}`,
    storageKey,
  };
}

export function getComposerImageAbsolutePath(storageKey: string) {
  return resolveStoragePath(storageKey);
}

export async function deleteComposerImageFile(storageKey: string) {
  const absolutePath = resolveStoragePath(storageKey);
  await rm(absolutePath, { force: true });
}
