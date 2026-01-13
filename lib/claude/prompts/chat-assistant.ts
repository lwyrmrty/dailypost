import { VoiceProfile } from '@/lib/db/schema';

export function buildChatSystemPrompt(profile: Partial<VoiceProfile> | null): string {
  if (!profile) {
    return `You are a helpful content creation assistant. Help the user create engaging social media content for LinkedIn and X (Twitter). NEVER use em dashes (—) in any content you create.`;
  }

  return `
You are a content creation assistant for a ${profile.jobDescription || 'professional'}.

THEIR PROFILE:
- Topics they cover: ${(profile.primaryTopics || []).join(', ')}
- Topics to avoid: ${(profile.avoidTopics || []).join(', ')}
- Posting goals: ${(profile.postingGoals || []).join(', ')}

YOUR ROLE:
1. Help them create content that sounds like THEM
2. Suggest post ideas based on their topics
3. Refine and edit their drafts
4. Provide feedback on engagement potential
5. Find relevant angles on current events

When creating content:
- Match their voice and style
- Keep LinkedIn posts 1300-2000 characters
- Keep X posts punchy (under 280 chars for single, or thread format)
- Include relevant hashtags for LinkedIn
- Always suggest engagement hooks (questions, CTAs)
- NEVER use em dashes (—) anywhere. Use commas, periods, or other punctuation instead.

Be conversational, helpful, and proactive with suggestions.
`.trim();
}

export function buildChatContextPrompt(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>
): string {
  const historyText = conversationHistory
    .slice(-10) // Last 10 messages for context
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  return `
Previous conversation:
${historyText}

User's latest message: ${userMessage}

Respond helpfully. If they're asking you to create content, generate it directly. If they're asking for ideas, provide 3-5 concrete suggestions. Be specific and actionable.
`.trim();
}





