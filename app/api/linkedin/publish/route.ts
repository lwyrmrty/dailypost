import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import {
  composerImages,
  linkedinAccounts,
  generatedPosts,
  type ComposerImageRecord,
} from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import {
  createPost,
  createComment,
  reactToPost,
  resharePost,
  refreshAccessToken,
  uploadImage,
} from '@/lib/linkedin/client';
import { reindexComposerImagesForUser } from '@/lib/composer-image-service';
import { deleteComposerImageFile, getComposerImageAbsolutePath } from '@/lib/composer-image-storage';

type PublishAction = 'post' | 'comment' | 'react' | 'reshare';
type ReactionType = 'LIKE' | 'CELEBRATE' | 'SUPPORT' | 'LOVE' | 'INSIGHTFUL' | 'FUNNY';

interface PublishRequest {
  action: PublishAction;
  content: string;
  postUrn?: string; // Required for comment, react, reshare
  reactionType?: ReactionType;
  generatedPostId?: string; // If publishing a generated post, mark it as posted
  composerImageIds?: string[];
  clearComposerImages?: boolean;
}

function buildAltText(originalName: string) {
  return originalName.replace(/\.[^.]+$/, '').trim() || undefined;
}

/**
 * Ensure the token is still valid; refresh if expired and a refresh token exists.
 */
async function getValidToken(userId: string) {
  const account = await db.query.linkedinAccounts.findFirst({
    where: eq(linkedinAccounts.userId, userId),
  });

  if (!account) {
    return null;
  }

  // If token is expired, try refreshing
  if (account.expiresAt < new Date()) {
    if (!account.refreshToken) {
      return null; // Can't refresh — user needs to reconnect
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

      return { accessToken: refreshed.accessToken, linkedinId: account.linkedinId };
    } catch {
      return null; // Refresh failed — user needs to reconnect
    }
  }

  return { accessToken: account.accessToken, linkedinId: account.linkedinId };
}

/**
 * POST /api/linkedin/publish
 * Publishes content to LinkedIn (post, comment, react, or reshare).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as PublishRequest;
  const {
    action,
    content,
    postUrn,
    reactionType,
    generatedPostId,
    composerImageIds,
    clearComposerImages,
  } = body;

  if (!action) {
    return NextResponse.json({ error: 'Action required' }, { status: 400 });
  }

  // Get valid LinkedIn token
  const tokenData = await getValidToken(session.user.id);
  if (!tokenData) {
    return NextResponse.json(
      { error: 'LinkedIn not connected or token expired. Please reconnect.' },
      { status: 403 }
    );
  }

  const { accessToken, linkedinId } = tokenData;

  try {
    let resultId = '';

    switch (action) {
      case 'post': {
        if (!content) {
          return NextResponse.json({ error: 'Content required for post' }, { status: 400 });
        }

        const imageIds = Array.isArray(composerImageIds)
          ? composerImageIds.filter(Boolean)
          : [];

        if (imageIds.length > 20) {
          return NextResponse.json({ error: 'LinkedIn supports up to 20 images per post.' }, { status: 400 });
        }

        let orderedImages: ComposerImageRecord[] = [];

        if (imageIds.length > 0) {
          const records = await db.query.composerImages.findMany({
            where: and(
              eq(composerImages.userId, session.user.id),
              inArray(composerImages.id, imageIds)
            ),
          });

          if (records.length !== imageIds.length) {
            return NextResponse.json({ error: 'One or more images could not be found.' }, { status: 404 });
          }

          const recordsById = new Map(records.map((record) => [record.id, record]));
          orderedImages = imageIds
            .map((id) => recordsById.get(id))
            .filter((image): image is ComposerImageRecord => Boolean(image));
        }

        const linkedinImages = await Promise.all(orderedImages.map(async (image) => {
          if (image.linkedinImageUrn) {
            return {
              id: image.linkedinImageUrn,
              altText: buildAltText(image.originalName),
            };
          }

          const absolutePath = getComposerImageAbsolutePath(image.storageKey);
          const fileBuffer = await readFile(absolutePath);
          const linkedinImageUrn = await uploadImage(accessToken, linkedinId, fileBuffer, image.mimeType);

          await db.update(composerImages)
            .set({
              linkedinImageUrn,
              linkedinAssetStatus: 'uploaded',
              updatedAt: new Date(),
            })
            .where(eq(composerImages.id, image.id));

          return {
            id: linkedinImageUrn,
            altText: buildAltText(image.originalName),
          };
        }));

        resultId = await createPost(accessToken, linkedinId, content, linkedinImages);
        break;
      }

      case 'comment': {
        if (!content || !postUrn) {
          return NextResponse.json({ error: 'Content and postUrn required for comment' }, { status: 400 });
        }
        resultId = await createComment(accessToken, linkedinId, postUrn, content);
        break;
      }

      case 'react': {
        if (!postUrn) {
          return NextResponse.json({ error: 'postUrn required for reaction' }, { status: 400 });
        }
        await reactToPost(accessToken, linkedinId, postUrn, reactionType || 'LIKE');
        break;
      }

      case 'reshare': {
        if (!postUrn) {
          return NextResponse.json({ error: 'postUrn required for reshare' }, { status: 400 });
        }
        resultId = await resharePost(accessToken, linkedinId, postUrn, content || '');
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // If this was a generated post, mark it as posted
    if (generatedPostId && (action === 'post' || action === 'reshare')) {
      await db.update(generatedPosts)
        .set({
          status: 'posted',
          postedAt: new Date(),
        })
        .where(eq(generatedPosts.id, generatedPostId));
    }

    if (action === 'post' && clearComposerImages && Array.isArray(composerImageIds) && composerImageIds.length > 0) {
      const records = await db.query.composerImages.findMany({
        where: and(
          eq(composerImages.userId, session.user.id),
          inArray(composerImages.id, composerImageIds)
        ),
      });

      await db.delete(composerImages)
        .where(and(
          eq(composerImages.userId, session.user.id),
          inArray(composerImages.id, composerImageIds)
        ));

      await Promise.all(records.map((record) => deleteComposerImageFile(record.storageKey)));
      await reindexComposerImagesForUser(session.user.id);
    }

    return NextResponse.json({ success: true, id: resultId });
  } catch (err) {
    console.error('LinkedIn publish error:', err);
    const message = err instanceof Error ? err.message : 'Failed to publish';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
