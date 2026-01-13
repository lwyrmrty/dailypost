import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { voiceProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateWithClaude } from '@/lib/claude/client';
import { buildChatSystemPrompt, buildChatContextPrompt } from '@/lib/claude/prompts/chat-assistant';
import { buildQuickPostPrompt } from '@/lib/claude/prompts/post-generation';

interface PostBlock {
  type: 'post';
  platform: 'linkedin' | 'x';
  content: string;
  isThread?: boolean;
  threadParts?: string[];
}

interface TextBlock {
  type: 'text';
  content: string;
}

type ContentBlock = PostBlock | TextBlock;

export async function POST(req: Request) {
  try {
    const { messages, userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1].content;
    const lowerMessage = lastMessage.toLowerCase();

    // Get user's voice profile
    const profile = await db.query.voiceProfiles.findFirst({
      where: eq(voiceProfiles.userId, userId),
    });

    // Detect intent and route accordingly
    const isCreateRequest = /create|write|generate|draft|make/.test(lowerMessage);
    const isLinkedIn = /linkedin/i.test(lowerMessage);
    const isX = /\bx\b|twitter|tweet|thread/i.test(lowerMessage);

    if (isCreateRequest && (isLinkedIn || isX)) {
      // Direct content creation
      const platform = isLinkedIn ? 'linkedin' : 'x';
      const prompt = buildQuickPostPrompt(lastMessage, profile || {}, platform);
      
      const content = await generateWithClaude(prompt);
      
      const blocks: ContentBlock[] = [];
      
      if (platform === 'x') {
        try {
          const parsed = JSON.parse(content);
          blocks.push({ type: 'text', content: parsed.isThread ? "Here's an X thread:" : "Here's your tweet:" });
          
          if (parsed.isThread && parsed.threadBreakdown) {
            blocks.push({
              type: 'post',
              platform: 'x',
              content: parsed.threadBreakdown.join('\n\n'),
              isThread: true,
              threadParts: parsed.threadBreakdown,
            });
          } else {
            blocks.push({
              type: 'post',
              platform: 'x',
              content: parsed.content || content,
            });
          }
        } catch {
          blocks.push({ type: 'text', content: "Here's your tweet:" });
          blocks.push({ type: 'post', platform: 'x', content });
        }
      } else {
        blocks.push({ type: 'text', content: "Here's your LinkedIn post:" });
        blocks.push({ type: 'post', platform: 'linkedin', content });
      }
      
      blocks.push({ type: 'text', content: "Would you like me to refine this or create a version for another platform?" });

      return NextResponse.json({ blocks });
    }

    if (isCreateRequest) {
      // General creation request - create LinkedIn version
      const linkedInPrompt = buildQuickPostPrompt(lastMessage, profile || {}, 'linkedin');
      const linkedInContent = await generateWithClaude(linkedInPrompt);
      
      const blocks: ContentBlock[] = [
        { type: 'text', content: "Here's a LinkedIn post based on your request:" },
        { type: 'post', platform: 'linkedin', content: linkedInContent },
        { type: 'text', content: "Want me to also create an X version? Or would you like me to refine this?" },
      ];

      return NextResponse.json({ blocks });
    }

    // General conversation - return as simple reply
    const systemPrompt = buildChatSystemPrompt(profile ?? null);
    const contextPrompt = buildChatContextPrompt(lastMessage, messages.slice(0, -1));
    
    const reply = await generateWithClaude(contextPrompt, systemPrompt);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
