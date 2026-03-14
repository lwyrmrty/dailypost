import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { reindexComposerImagesForUser } from '@/lib/composer-image-service';
import { deleteComposerImageFile } from '@/lib/composer-image-storage';
import { db } from '@/lib/db';
import { composerImages } from '@/lib/db/schema';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const image = await db.query.composerImages.findFirst({
    where: and(
      eq(composerImages.id, id),
      eq(composerImages.userId, session.user.id)
    ),
  });

  if (!image) {
    return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
  }

  await db.delete(composerImages)
    .where(and(
      eq(composerImages.id, id),
      eq(composerImages.userId, session.user.id)
    ));

  await deleteComposerImageFile(image.storageKey);
  await reindexComposerImagesForUser(session.user.id);

  return NextResponse.json({ success: true });
}
