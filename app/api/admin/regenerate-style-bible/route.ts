import { NextResponse } from 'next/server';
import { generateWithClaude } from '@/lib/claude/client';
import { getVoiceProfile, upsertVoiceProfile } from '@/lib/db/queries';
import { getUserById } from '@/lib/db/queries';
import {
  buildVoiceAnalysisPrompt,
  buildStyleBiblePrompt,
  RewritePair,
  VoiceDiscoveryData,
} from '@/lib/claude/prompts/voice-analysis';

function parseJsonResponse(response: string): unknown {
  let jsonString = response.trim();
  if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(jsonString);
}

/**
 * POST /api/admin/regenerate-style-bible
 *
 * Re-runs voice analysis and Style Bible generation using the user's
 * existing uploadedContent and profile data. Useful after manually
 * editing content or adding samples via enrich-voice.
 *
 * Auth: Bearer token using CRON_SECRET
 *
 * Body:
 *   userId: string — target user's ID
 *   includeTranscriptNote?: boolean — adds spoken-content handling instructions
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, includeTranscriptNote = false } = await req.json() as {
      userId: string;
      includeTranscriptNote?: boolean;
    };

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profile = await getVoiceProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: 'No voice profile found for this user' }, { status: 404 });
    }

    const allContent = [
      ...(profile.uploadedContent || []),
      ...(profile.samplePosts || []),
    ].filter(s => s.trim().length > 30);

    if (allContent.length < 5) {
      return NextResponse.json(
        { error: `Need at least 5 samples to generate Style Bible (found ${allContent.length})` },
        { status: 400 }
      );
    }

    const rewritePairs = (profile.rewriteExercises as RewritePair[]) || undefined;
    const voiceDiscovery = (profile.voiceDiscovery as VoiceDiscoveryData) || undefined;

    const transcriptNote = includeTranscriptNote
      ? '\n\nIMPORTANT: Some of these writing samples were extracted from spoken transcripts (podcasts, interviews, talks). The spoken samples reveal the person\'s natural voice, opinions, and thinking patterns — but do NOT replicate verbal tics, filler words, or spoken-only structures (e.g., "you know", "um", "like I said"). Extract the UNDERLYING voice: their word choices, how they frame arguments, their humor, their conviction level, their storytelling instincts. Translate spoken naturalness into written naturalness.\n'
      : '';

    // Structured analysis
    let analysis: Record<string, unknown> | null = null;
    try {
      const analysisPrompt = buildVoiceAnalysisPrompt(
        allContent, rewritePairs, voiceDiscovery
      ) + transcriptNote;
      const analysisResponse = await generateWithClaude(analysisPrompt);
      analysis = parseJsonResponse(analysisResponse) as Record<string, unknown>;
    } catch (parseError) {
      console.error('Voice analysis JSON parse error:', parseError);
    }

    // Style Bible
    let styleBible: string | null = null;
    try {
      const styleBiblePrompt = buildStyleBiblePrompt(
        allContent,
        rewritePairs,
        profile.jobDescription || undefined,
        analysis || undefined,
        voiceDiscovery
      ) + transcriptNote;
      styleBible = await generateWithClaude(styleBiblePrompt);
    } catch (error) {
      console.error('Style Bible generation error:', error);
    }

    if (!analysis && !styleBible) {
      return NextResponse.json(
        { error: 'Both voice analysis and Style Bible generation failed' },
        { status: 502 }
      );
    }

    // Save results
    await upsertVoiceProfile(userId, {
      ...(analysis ? { voiceAnalysis: analysis } : {}),
      ...(styleBible ? { styleBible } : {}),
    });

    return NextResponse.json({
      success: true,
      userId,
      samplesUsed: allContent.length,
      hasAnalysis: !!analysis,
      hasStyleBible: !!styleBible,
      previousStyleBible: profile.styleBible ? profile.styleBible.substring(0, 200) + '...' : null,
      newStyleBible: styleBible ? styleBible.substring(0, 500) + '...' : null,
    });
  } catch (error) {
    console.error('Regenerate style bible error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate style bible' },
      { status: 500 }
    );
  }
}
