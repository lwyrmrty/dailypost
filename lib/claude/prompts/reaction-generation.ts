import { VoiceProfile } from '@/lib/db/schema';

interface ReactionRequest {
  postContent: string;
  postAuthor?: string;
  reactionType: 'comment' | 'reshare' | 'original_post';
  profile: Partial<VoiceProfile>;
}

function buildVoiceSummary(profile: Partial<VoiceProfile>): string {
  const styleBible = profile.styleBible as string | null;
  if (styleBible) {
    // Trim to key sections to save tokens
    return `STYLE BIBLE:\n${styleBible.slice(0, 1500)}`;
  }

  return `Job: ${profile.jobDescription || 'Professional'}
Topics: ${(profile.primaryTopics || []).join(', ')}`;
}

export function buildReactionPrompt({ postContent, postAuthor, reactionType, profile }: ReactionRequest): string {
  const voiceSummary = buildVoiceSummary(profile);

  if (reactionType === 'comment') {
    return `
You are a ghostwriter. Write a LinkedIn comment in this person's voice.

ABOUT THE COMMENTER:
"${profile.jobDescription || 'A professional'}"

${voiceSummary}

POST BEING COMMENTED ON${postAuthor ? ` (by ${postAuthor})` : ''}:
${postContent}

COMMENT GUIDELINES:
- 2-5 sentences. Substantive, not fluff.
- Add value: a unique insight, relevant experience, thoughtful question, or respectful pushback
- Match the commenter's natural voice and personality
- Do NOT be sycophantic ("Great post!", "Love this!")
- Do NOT summarize the original post
- Start with substance, not compliments
- NEVER use em dashes (—)

Return ONLY the comment text.`.trim();
  }

  if (reactionType === 'reshare') {
    return `
You are a ghostwriter. Write commentary for a LinkedIn reshare in this person's voice.

ABOUT THE RESHARER:
"${profile.jobDescription || 'A professional'}"

${voiceSummary}

POST BEING RESHARED${postAuthor ? ` (by ${postAuthor})` : ''}:
${postContent}

RESHARE GUIDELINES:
- 3-6 sentences of your own take before the reshare
- Add YOUR perspective — why this matters, what it means, what others are missing
- Don't just summarize the original post
- Match the resharer's voice and tone
- End with a thought-provoking point or question
- NEVER use em dashes (—)

Return ONLY the reshare commentary text.`.trim();
  }

  // Original post reacting to someone else's content
  return `
You are a ghostwriter. Write an original LinkedIn post reacting to another person's content, in your client's voice.

ABOUT THE AUTHOR:
"${profile.jobDescription || 'A professional'}"

${voiceSummary}

CONTENT BEING REACTED TO${postAuthor ? ` (by ${postAuthor})` : ''}:
${postContent}

POST GUIDELINES:
- Write a full LinkedIn post (1000-1800 characters)
- Reference the original content naturally (e.g., "Saw [author]'s post about...")
- Add substantial original thinking — your take, your experience, your predictions
- Hook in first 2 lines
- Use line breaks for readability
- Include 2-3 relevant hashtags at the end
- NEVER use em dashes (—)

Return ONLY the post text.`.trim();
}
