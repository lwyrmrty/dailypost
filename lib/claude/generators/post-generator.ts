import { generateWithClaude } from '../client';
import { buildLinkedInPostPrompt, buildXPostPrompt } from '../prompts/post-generation';
import { VoiceProfile } from '@/lib/db/schema';

interface NewsStory {
  title: string;
  summary: string;
  url: string;
  topic?: string;
}

interface GeneratedPost {
  content: string;
  threadBreakdown?: string[];
  topic: string;
  postType: string;
  tone: string;
  engagementPrediction: string;
}

export async function generateLinkedInPost(
  story: NewsStory,
  profile: Partial<VoiceProfile>
): Promise<GeneratedPost> {
  const prompt = buildLinkedInPostPrompt(story, profile);
  const content = await generateWithClaude(prompt);

  return {
    content,
    topic: story.topic || 'General',
    postType: inferPostType(content),
    tone: (profile.tonePreferences as Record<string, string>)?.primary || 'professional',
    engagementPrediction: predictEngagement(content, story.topic || '', profile),
  };
}

export async function generateXPost(
  story: NewsStory,
  profile: Partial<VoiceProfile>
): Promise<GeneratedPost> {
  const prompt = buildXPostPrompt(story, profile);
  const response = await generateWithClaude(prompt);

  try {
    const parsed = JSON.parse(response);
    
    return {
      content: parsed.content,
      threadBreakdown: parsed.isThread ? parsed.threadBreakdown : undefined,
      topic: story.topic || 'General',
      postType: parsed.isThread ? 'thread' : 'quick_take',
      tone: 'conversational',
      engagementPrediction: predictEngagement(parsed.content, story.topic || '', profile),
    };
  } catch {
    // Fallback if JSON parsing fails
    return {
      content: response.slice(0, 280), // Truncate to tweet length
      topic: story.topic || 'General',
      postType: 'quick_take',
      tone: 'conversational',
      engagementPrediction: 'medium',
    };
  }
}

export function inferPostType(content: string): string {
  const lowerContent = content.toLowerCase();
  
  // Check for poll/question patterns
  if (content.includes('?') && content.split('?').length > 2) {
    return 'poll';
  }
  
  // Check for list patterns
  if (lowerContent.match(/\d+\s+(lessons|tips|ways|reasons|things|steps)/i)) {
    return 'curated_list';
  }
  
  // Check for hot take patterns
  if (lowerContent.match(/everyone('s| is)|unpopular opinion|controversial|here's the thing/i)) {
    return 'hot_take';
  }
  
  // Check for data-driven patterns
  if (lowerContent.match(/data|study|research|report|%|percent|statistics/i)) {
    return 'data_analysis';
  }
  
  // Check for personal story patterns
  if (lowerContent.match(/years ago|my journey|i remember|story time|when i/i)) {
    return 'personal_story';
  }
  
  // Check for advice patterns
  if (lowerContent.match(/advice|lesson|learned|mistake|don't|should|must/i)) {
    return 'founder_advice';
  }
  
  // Default to news commentary
  return 'news_commentary';
}

export function predictEngagement(
  content: string, 
  topic: string, 
  profile: Partial<VoiceProfile>
): 'low' | 'medium' | 'high' {
  let score = 0;
  
  // Length check (optimal range for LinkedIn)
  if (content.length > 1200 && content.length < 2000) {
    score += 1;
  }
  
  // Has question/CTA (engagement driver)
  if (content.includes('?')) {
    score += 1;
  }
  
  // Topic match with user's interests
  if ((profile.primaryTopics || []).some(t => 
    topic.toLowerCase().includes(t.toLowerCase()) ||
    t.toLowerCase().includes(topic.toLowerCase())
  )) {
    score += 1;
  }
  
  // Strong opening (short first line grabs attention)
  const firstLine = content.split('\n')[0];
  if (firstLine && firstLine.length < 100 && firstLine.length > 20) {
    score += 1;
  }
  
  // Has hashtags (discoverability)
  if (content.includes('#')) {
    score += 0.5;
  }
  
  // Has line breaks (readability)
  if (content.split('\n').length > 3) {
    score += 0.5;
  }
  
  if (score >= 4) return 'high';
  if (score >= 2.5) return 'medium';
  return 'low';
}

export async function generateMultiplePosts(
  stories: NewsStory[],
  profile: Partial<VoiceProfile>,
  linkedInCount: number = 3,
  xCount: number = 3
): Promise<{
  linkedin: GeneratedPost[];
  x: GeneratedPost[];
}> {
  const linkedInPosts: GeneratedPost[] = [];
  const xPosts: GeneratedPost[] = [];

  // Generate LinkedIn posts
  for (let i = 0; i < Math.min(linkedInCount, stories.length); i++) {
    try {
      const post = await generateLinkedInPost(stories[i], profile);
      linkedInPosts.push(post);
    } catch (error) {
      console.error(`Failed to generate LinkedIn post for story ${i}:`, error);
    }
  }

  // Generate X posts
  for (let i = linkedInCount; i < Math.min(linkedInCount + xCount, stories.length); i++) {
    try {
      const post = await generateXPost(stories[i], profile);
      xPosts.push(post);
    } catch (error) {
      console.error(`Failed to generate X post for story ${i}:`, error);
    }
  }

  return { linkedin: linkedInPosts, x: xPosts };
}






