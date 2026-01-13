import { generateWithClaude } from '../client';
import { VoiceProfile } from '@/lib/db/schema';
import { buildVoiceGuidelines } from '../prompts/voice-analysis';

export async function generateLinkedInFromIdea(
  idea: string,
  profile: Partial<VoiceProfile>
): Promise<string> {
  const voiceGuidelines = buildVoiceGuidelines(
    profile.voiceAnalysis as Record<string, unknown> || {}
  );

  const prompt = `
Write a LinkedIn post for a ${profile.jobDescription || 'professional'}.

IDEA/TOPIC: ${idea}

VOICE GUIDELINES: ${voiceGuidelines}

LINKEDIN BEST PRACTICES:
- Length: 1300-2000 characters
- Hook: First 2 lines grab attention
- Use line breaks every 1-2 sentences
- Include 3-5 relevant hashtags at the end
- End with a question or CTA

Write in their authentic voice. Return ONLY the post content.
`.trim();

  return generateWithClaude(prompt);
}

export async function refineLinkedInPost(
  draft: string,
  feedback: string,
  profile: Partial<VoiceProfile>
): Promise<string> {
  const prompt = `
Refine this LinkedIn post based on the feedback.

ORIGINAL POST:
${draft}

FEEDBACK:
${feedback}

AUTHOR CONTEXT:
${profile.jobDescription || 'A professional'}

Refine the post while maintaining their voice. Return ONLY the revised post.
`.trim();

  return generateWithClaude(prompt);
}

export async function generateLinkedInVariations(
  post: string,
  count: number = 3
): Promise<string[]> {
  const prompt = `
Create ${count} variations of this LinkedIn post. Each should have a different angle/hook but convey similar insights.

ORIGINAL POST:
${post}

Return each variation separated by "---".
`.trim();

  const response = await generateWithClaude(prompt);
  return response.split('---').map(v => v.trim()).filter(v => v.length > 0);
}

export function validateLinkedInPost(content: string): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check length
  if (content.length < 500) {
    issues.push('Post is too short. Aim for 1300-2000 characters.');
  } else if (content.length > 3000) {
    issues.push('Post is too long. Consider trimming to under 2000 characters.');
  }

  // Check for hook
  const firstLine = content.split('\n')[0];
  if (firstLine && firstLine.length > 150) {
    suggestions.push('First line is long. Consider a shorter, punchier hook.');
  }

  // Check for engagement elements
  if (!content.includes('?')) {
    suggestions.push('Consider adding a question to drive engagement.');
  }

  // Check for hashtags
  const hashtagCount = (content.match(/#\w+/g) || []).length;
  if (hashtagCount === 0) {
    suggestions.push('Add 3-5 relevant hashtags for discoverability.');
  } else if (hashtagCount > 10) {
    issues.push('Too many hashtags. Keep it to 3-5 for best results.');
  }

  // Check for readability (line breaks)
  const lineBreaks = content.split('\n').length;
  if (lineBreaks < 3 && content.length > 500) {
    suggestions.push('Add more line breaks to improve readability.');
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
}






