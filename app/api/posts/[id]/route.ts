import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { generatedPosts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const post = await db.query.generatedPosts.findFirst({
      where: and(
        eq(generatedPosts.id, id),
        eq(generatedPosts.userId, session.user.id)
      ),
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Failed to get post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status, editedContent } = await req.json();

    // Verify ownership
    const existingPost = await db.query.generatedPosts.findFirst({
      where: and(
        eq(generatedPosts.id, id),
        eq(generatedPosts.userId, session.user.id)
      ),
    });

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    if (status) {
      updates.status = status;
    }

    if (editedContent) {
      updates.userEditedContent = editedContent;
    }

    if (status === 'posted' || status === 'posted_edited') {
      updates.postedAt = new Date();
    }

    const [updatedPost] = await db.update(generatedPosts)
      .set(updates)
      .where(eq(generatedPosts.id, id))
      .returning();

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error('Failed to update post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existingPost = await db.query.generatedPosts.findFirst({
      where: and(
        eq(generatedPosts.id, id),
        eq(generatedPosts.userId, session.user.id)
      ),
    });

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    await db.delete(generatedPosts).where(eq(generatedPosts.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}






