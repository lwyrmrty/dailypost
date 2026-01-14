import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sources, SOURCE_TYPES, SourceType } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Update a source
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userId, sourceUrl, sourceName, sourceType, priority, isActive, keywords } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Verify source exists and belongs to user
    const existingSource = await db.query.sources.findFirst({
      where: and(eq(sources.id, id), eq(sources.userId, userId)),
    });

    if (!existingSource) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Build update object
    const updateData: Partial<{
      sourceUrl: string;
      sourceName: string | null;
      sourceType: SourceType;
      priority: number;
      isActive: boolean;
      keywords: string[] | null;
    }> = {};

    if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl;
    if (sourceName !== undefined) updateData.sourceName = sourceName;
    if (sourceType !== undefined && SOURCE_TYPES.includes(sourceType)) {
      updateData.sourceType = sourceType;
    }
    if (priority !== undefined) updateData.priority = priority;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (keywords !== undefined) updateData.keywords = keywords;

    // Update source
    const [updatedSource] = await db
      .update(sources)
      .set(updateData)
      .where(and(eq(sources.id, id), eq(sources.userId, userId)))
      .returning();

    return NextResponse.json({
      success: true,
      source: updatedSource,
    });
  } catch (error) {
    console.error('Update source error:', error);
    return NextResponse.json(
      { error: 'Failed to update source' },
      { status: 500 }
    );
  }
}

// Delete a source
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Verify source exists and belongs to user
    const existingSource = await db.query.sources.findFirst({
      where: and(eq(sources.id, id), eq(sources.userId, userId)),
    });

    if (!existingSource) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Delete source
    await db
      .delete(sources)
      .where(and(eq(sources.id, id), eq(sources.userId, userId)));

    return NextResponse.json({
      success: true,
      message: 'Source deleted',
    });
  } catch (error) {
    console.error('Delete source error:', error);
    return NextResponse.json(
      { error: 'Failed to delete source' },
      { status: 500 }
    );
  }
}

// Get a single source
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const source = await db.query.sources.findFirst({
      where: and(eq(sources.id, id), eq(sources.userId, userId)),
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    return NextResponse.json({ source });
  } catch (error) {
    console.error('Get source error:', error);
    return NextResponse.json(
      { error: 'Failed to get source' },
      { status: 500 }
    );
  }
}
