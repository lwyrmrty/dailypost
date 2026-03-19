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
import { buildTranscriptExtractionPrompt } from '@/lib/claude/prompts/transcript-extraction';

function parseJsonResponse(response: string): unknown {
  let jsonString = response.trim();
  if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(jsonString);
}

/**
 * POST /api/admin/enrich-voice
 *
 * Admin endpoint to enrich a user's voice profile with new content
 * (e.g. podcast transcripts, articles, past writing).
 *
 * Auth: Bearer token using CRON_SECRET
 *
 * Body:
 *   userId: string — target user's ID
 *   content: string[] — new writing/transcript samples to add
 *   contentType: 'written' | 'transcript' — whether the content is spoken or written
 *   speakerName?: string — for transcripts with multiple speakers, the name to isolate
 *   replace?: boolean — if true, replaces existing uploadedContent instead of merging
 *   regenerateStyleBible?: boolean — default true, re-runs voice analysis + Style Bible
 */
export async function POST(req: Request) {
  try {
    // Auth check — same pattern as generate-posts cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      userId,
      content,
      contentType = 'written',
      speakerName,
      replace = false,
      regenerateStyleBible = true,
    } = await req.json() as {
      userId: string;
      content: string[];
      contentType?: 'written' | 'transcript';
      speakerName?: string;
      replace?: boolean;
      regenerateStyleBible?: boolean;
    };

    if (!userId || !content || content.length === 0) {
      return NextResponse.json(
        { error: 'userId and content[] are required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get existing voice profile
    const existingProfile = await getVoiceProfile(userId);

    // If content is transcript, run extraction to pull out usable voice samples
    let processedContent: string[];
    if (contentType === 'transcript') {
      const extractionPrompt = buildTranscriptExtractionPrompt(content, speakerName);
      const extractionResponse = await generateWithClaude(extractionPrompt);
      const extracted = parseJsonResponse(extractionResponse) as { passages: string[] };
      processedContent = extracted.passages;

      if (processedContent.length === 0) {
        return NextResponse.json(
          { error: 'Could not extract usable voice passages from transcripts' },
          { status: 422 }
        );
      }
    } else {
      processedContent = content;
    }

    // Merge or replace uploaded content
    const existingContent = existingProfile?.uploadedContent || [];
    const mergedContent = replace
      ? processedContent
      : [...existingContent, ...processedContent];

    // Update uploadedContent on the profile
    await upsertVoiceProfile(userId, { uploadedContent: mergedContent });

    // Optionally regenerate voice analysis and Style Bible
    let analysis: Record<string, unknown> | null = null;
    let styleBible: string | null = null;

    if (regenerateStyleBible && mergedContent.length >= 5) {
      const rewritePairs = (existingProfile?.rewriteExercises as RewritePair[]) || undefined;
      const voiceDiscovery = (existingProfile?.voiceDiscovery as VoiceDiscoveryData) || undefined;

      // Add transcript context to the analysis prompt
      const transcriptNote = contentType === 'transcript'
        ? '\n\nIMPORTANT: Some of these writing samples were extracted from spoken transcripts (podcasts, interviews, talks). The spoken samples reveal the person\'s natural voice, opinions, and thinking patterns — but do NOT replicate verbal tics, filler words, or spoken-only structures (e.g., "you know", "um", "like I said"). Extract the UNDERLYING voice: their word choices, how they frame arguments, their humor, their conviction level, their storytelling instincts. Translate spoken naturalness into written naturalness.\n'
        : '';

      // Structured analysis
      const analysisPrompt = buildVoiceAnalysisPrompt(
        mergedContent,
        rewritePairs,
        voiceDiscovery
      ) + transcriptNote;

      try {
        const analysisResponse = await generateWithClaude(analysisPrompt);
        analysis = parseJsonResponse(analysisResponse) as Record<string, unknown>;
      } catch (parseError) {
        console.error('Voice analysis JSON parse error:', parseError);
        // Continue without structured analysis — Style Bible can still work
      }

      // Style Bible
      try {
        const styleBiblePrompt = buildStyleBiblePrompt(
          mergedContent,
          rewritePairs,
          existingProfile?.jobDescription || undefined,
          analysis || undefined,
          voiceDiscovery
        ) + transcriptNote;

        styleBible = await generateWithClaude(styleBiblePrompt);
      } catch (error) {
        console.error('Style Bible generation error:', error);
      }

      // Save the regenerated analysis and Style Bible
      await upsertVoiceProfile(userId, {
        uploadedContent: mergedContent,
        ...(analysis ? { voiceAnalysis: analysis } : {}),
        ...(styleBible ? { styleBible } : {}),
      });
    }

    return NextResponse.json({
      success: true,
      userId,
      samplesAdded: processedContent.length,
      totalSamples: mergedContent.length,
      contentType,
      regenerated: regenerateStyleBible && mergedContent.length >= 5,
      hasAnalysis: !!analysis,
      hasStyleBible: !!styleBible,
      ...(styleBible ? { styleBiblePreview: styleBible.substring(0, 500) + '...' } : {}),
    });
  } catch (error) {
    console.error('Enrich voice error:', error);
    return NextResponse.json(
      { error: 'Failed to enrich voice profile' },
      { status: 500 }
    );
  }
}
