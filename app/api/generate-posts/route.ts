import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, generatedPosts, voiceProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { aggregateNews, getStoriesForTopics } from '@/lib/news/aggregator';
import { generateLinkedInPost, generateXPost } from '@/lib/claude/generators/post-generator';

export async function POST(req: Request) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users who completed onboarding
    const activeUsers = await db.query.users.findMany({
      where: eq(users.onboardingCompleted, true),
    });

    let totalGenerated = 0;
    const results: Array<{ userId: string; postsGenerated: number; error?: string }> = [];

    for (const user of activeUsers) {
      try {
        // Get voice profile
        const profile = await db.query.voiceProfiles.findFirst({
          where: eq(voiceProfiles.userId, user.id),
        });

        if (!profile) {
          results.push({ userId: user.id, postsGenerated: 0, error: 'No voice profile' });
          continue;
        }

        // Get today's news, prioritizing user's topics
        const stories = profile.primaryTopics && profile.primaryTopics.length > 0
          ? await getStoriesForTopics(user.id, profile.primaryTopics)
          : await aggregateNews(user.id);

        // Select best stories (avoiding topics user wants to avoid)
        const filteredStories = stories.filter(story => {
          if (!profile.avoidTopics || profile.avoidTopics.length === 0) return true;
          return !profile.avoidTopics.some(topic => 
            story.title.toLowerCase().includes(topic.toLowerCase()) ||
            story.summary.toLowerCase().includes(topic.toLowerCase())
          );
        });

        const selectedStories = filteredStories.slice(0, 8);
        const posts = [];
        const today = new Date().toISOString().split('T')[0];

        // Generate both LinkedIn AND X versions for each story (8 stories = 16 posts)
        for (let i = 0; i < Math.min(8, selectedStories.length); i++) {
          const story = selectedStories[i];
          
          // Generate LinkedIn version
          try {
            const linkedInPost = await generateLinkedInPost(story, profile);
            
            posts.push({
              userId: user.id,
              platform: 'linkedin',
              content: linkedInPost.content,
              sourceStoryUrl: story.url,
              sourceStoryTitle: story.title,
              topic: linkedInPost.topic,
              postType: linkedInPost.postType,
              tone: linkedInPost.tone,
              engagementPrediction: linkedInPost.engagementPrediction,
              batchDate: today,
            });
          } catch (error) {
            console.error(`Failed to generate LinkedIn post for story ${i}:`, error);
          }

          // Generate X version of the same story
          try {
            const xPost = await generateXPost(story, profile);
            
            posts.push({
              userId: user.id,
              platform: 'x',
              content: xPost.content,
              threadBreakdown: xPost.threadBreakdown,
              sourceStoryUrl: story.url,
              sourceStoryTitle: story.title,
              topic: xPost.topic,
              postType: xPost.postType,
              tone: xPost.tone,
              engagementPrediction: xPost.engagementPrediction,
              batchDate: today,
            });
          } catch (error) {
            console.error(`Failed to generate X post for story ${i}:`, error);
          }
        }

        // Save to database
        if (posts.length > 0) {
          await db.insert(generatedPosts).values(posts);
          totalGenerated += posts.length;
        }

        results.push({ userId: user.id, postsGenerated: posts.length });
        console.log(`Generated ${posts.length} posts for user ${user.id}`);
      } catch (error) {
        console.error(`Failed for user ${user.id}:`, error);
        results.push({ 
          userId: user.id, 
          postsGenerated: 0, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      processedUsers: activeUsers.length,
      totalPosts: totalGenerated,
      results,
    });
  } catch (error) {
    console.error('Post generation failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also allow GET for manual triggering with auth
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Redirect to POST handler
  return POST(req);
}





