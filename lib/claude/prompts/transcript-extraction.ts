/**
 * Prompt for extracting voice-rich passages from podcast/interview transcripts.
 *
 * The goal is to pull out segments where the speaker is expressing opinions,
 * telling stories, explaining concepts, or showing personality — the stuff
 * that reveals HOW they communicate, not just WHAT they said.
 *
 * Filters out filler, cross-talk, and low-signal segments.
 */
export function buildTranscriptExtractionPrompt(
  transcripts: string[],
  speakerName?: string
): string {
  const speakerInstruction = speakerName
    ? `IMPORTANT: This transcript has multiple speakers. You must ONLY extract passages from "${speakerName}". Ignore all other speakers' words entirely. If speaker labels are present (e.g., "${speakerName}:"), use those. If not, use context clues to identify which speaker is "${speakerName}".`
    : 'If there are multiple speakers and speaker labels are present, try to identify the primary/host speaker and focus on their passages.';

  return `
You are a voice analyst preparing raw transcript material for writing style analysis. Your job is to extract the most voice-revealing passages from these podcast/interview transcripts.

${speakerInstruction}

TRANSCRIPTS:
${transcripts.map((t, i) => `\n--- Transcript ${i + 1} ---\n${t}`).join('\n')}

EXTRACT passages that reveal the speaker's VOICE — how they think and communicate:

INCLUDE (high signal):
- Opinionated statements ("Here's what I think...", "The problem with X is...")
- Storytelling moments (anecdotes, personal experiences, case studies)
- Explanations of complex ideas (shows how they break things down)
- Humor, wit, sarcasm, self-deprecation
- Strong positions, hot takes, contrarian views
- Unique framings or metaphors
- Moments of vulnerability or candor

EXCLUDE (low signal):
- Pure filler ("um", "you know", "like", "so yeah")
- Agreeing with the other person ("Totally", "Right, exactly", "Yeah for sure")
- Procedural dialogue ("Let's move on to...", "Before we wrap up...")
- Reading from notes or quoting others at length
- Very short responses under 20 words that don't show personality

CLEANING RULES:
- Remove verbal filler (um, uh, like, you know, I mean) from within passages
- Clean up false starts and repetitions ("I think, I think the key" → "I think the key")
- Keep contractions and informal language — that IS their voice
- Keep sentence fragments if they're stylistic, not just stumbles
- Preserve their actual word choices, metaphors, and phrasing
- Each passage should be 50-300 words — long enough to show voice patterns

Return JSON:
{
  "passages": [
    "Cleaned passage text here...",
    "Another passage..."
  ],
  "speakerNotes": "Brief note about the speaker's overall communication style observed in these transcripts"
}

Aim for 10-20 high-quality passages that together paint a complete picture of how this person communicates. Quality over quantity — skip a passage if it doesn't reveal something about their voice.

Return ONLY valid JSON, no other text.
`.trim();
}
