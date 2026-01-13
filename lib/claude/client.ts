import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateWithClaude(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const textContent = message.content.find(c => c.type === 'text');
  return textContent?.type === 'text' ? textContent.text : '';
}

export async function generateWithClaudeStreaming(
  prompt: string,
  systemPrompt?: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  let fullResponse = '';
  
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullResponse += event.delta.text;
      onChunk?.(event.delta.text);
    }
  }

  return fullResponse;
}

export { anthropic };






