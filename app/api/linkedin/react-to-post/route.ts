import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { voiceProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateWithClaude } from '@/lib/claude/client';
import { buildReactionPrompt } from '@/lib/claude/prompts/reaction-generation';

/**
 * POST /api/linkedin/react-to-post
 * Generate a voice-matched reaction (comment, reshare, or original post) to a LinkedIn post.
 *
 * Body: { postContent, postAuthor?, reactionType: 'comment' | 'reshare' | 'original_post' }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { postContent, postAuthor, reactionType } = await req.json();

  if (!postContent || !reactionType) {
    return NextResponse.json(
      { error: 'postContent and reactionType are required' },
      { status: 400 }
    );
  }

  // Load voice profile
  const profile = await db.query.voiceProfiles.findFirst({
    where: eq(voiceProfiles.userId, session.user.id),
  });

  if (!profile) {
    return NextResponse.json(
      { error: 'No voice profile found. Complete onboarding first.' },
      { status: 400 }
    );
  }

  try {
    const prompt = buildReactionPrompt({
      postContent,
      postAuthor,
      reactionType,
      profile,
    });

    const generated = await generateWithClaude(prompt);

    return NextResponse.json({
      content: generated.trim(),
      reactionType,
    });
  } catch (err) {
    console.error('Reaction generation error:', err);
    return NextResponse.json(
      { error: 'Failed to generate reaction' },
      { status: 500 }
    );
  }
}
