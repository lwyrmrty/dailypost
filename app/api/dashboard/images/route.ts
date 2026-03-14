import { NextResponse } from 'next/server';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { auth } from '@/auth';
import {
  COMPOSER_IMAGE_MAX_COUNT,
  ComposerImageDto,
  getComposerImageValidationMessage,
} from '@/lib/composer-images';
import { db } from '@/lib/db';
import { composerImages } from '@/lib/db/schema';
import {
  clearComposerImagesForUser,
  listComposerImagesForUser,
} from '@/lib/composer-image-service';
import { deleteComposerImageFile, storeComposerImageFile } from '@/lib/composer-image-storage';

interface ReorderRequest {
  ids: string[];
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const images = await listComposerImagesForUser(session.user.id);
  return NextResponse.json({ images });
}

export async function DELETE() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await clearComposerImagesForUser(session.user.id);
  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData
    .getAll('images')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: 'At least one image is required.' }, { status: 400 });
  }

  const existingImages = await db.query.composerImages.findMany({
    where: eq(composerImages.userId, session.user.id),
    orderBy: [desc(composerImages.sortOrder)],
    limit: 1,
  });

  const existingCount = await db.query.composerImages.findMany({
    where: eq(composerImages.userId, session.user.id),
    columns: { id: true },
  });

  if (existingCount.length + files.length > COMPOSER_IMAGE_MAX_COUNT) {
    return NextResponse.json(
      { error: `LinkedIn supports up to ${COMPOSER_IMAGE_MAX_COUNT} images per post.` },
      { status: 400 }
    );
  }

  for (const file of files) {
    const validationMessage = getComposerImageValidationMessage(file.type, file.size);
    if (validationMessage) {
      return NextResponse.json({ error: validationMessage }, { status: 400 });
    }
  }

  const nextSortOrder = (existingImages[0]?.sortOrder ?? -1) + 1;
  const storedFiles: string[] = [];

  try {
    const uploads = await Promise.all(files.map(async (file, index) => {
      const stored = await storeComposerImageFile(session.user.id!, file);
      storedFiles.push(stored.storageKey);

      return {
        storageKey: stored.storageKey,
        publicUrl: stored.publicUrl,
        originalName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        width: null,
        height: null,
        sortOrder: nextSortOrder + index,
      };
    }));

    const inserted = await db.insert(composerImages)
      .values(uploads.map((upload) => ({
        ...upload,
        userId: session.user.id!,
      })))
      .returning();

    const images: ComposerImageDto[] = inserted.map((image) => ({
      id: image.id,
      publicUrl: image.publicUrl,
      originalName: image.originalName,
      mimeType: image.mimeType,
      fileSize: image.fileSize,
      width: image.width,
      height: image.height,
      sortOrder: image.sortOrder,
      linkedinImageUrn: image.linkedinImageUrn,
      createdAt: image.createdAt.toISOString(),
    }));

    return NextResponse.json({ images });
  } catch (error) {
    await Promise.all(storedFiles.map((storageKey) => deleteComposerImageFile(storageKey)));

    console.error('Failed to upload composer images:', error);
    return NextResponse.json({ error: 'Failed to upload image.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as ReorderRequest;
  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  const uniqueIds = [...new Set(ids)];

  if (ids.length === 0) {
    return NextResponse.json({ error: 'Image ids are required.' }, { status: 400 });
  }

  if (uniqueIds.length !== ids.length) {
    return NextResponse.json({ error: 'Image ids must be unique.' }, { status: 400 });
  }

  const existingImages = await db.query.composerImages.findMany({
    where: eq(composerImages.userId, session.user.id),
    columns: { id: true },
  });

  if (existingImages.length !== ids.length) {
    return NextResponse.json({ error: 'Reorder payload is out of sync.' }, { status: 400 });
  }

  const matchingImages = await db.query.composerImages.findMany({
    where: and(
      eq(composerImages.userId, session.user.id),
      inArray(composerImages.id, ids)
    ),
    columns: { id: true },
  });

  if (matchingImages.length !== ids.length) {
    return NextResponse.json({ error: 'One or more images could not be found.' }, { status: 404 });
  }

  await Promise.all(ids.map((id, index) => db.update(composerImages)
    .set({
      sortOrder: index,
      updatedAt: new Date(),
    })
    .where(and(
      eq(composerImages.id, id),
      eq(composerImages.userId, session.user.id!)
    ))));

  const images = await listComposerImagesForUser(session.user.id);
  return NextResponse.json({ images });
}
