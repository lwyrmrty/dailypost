import { db } from '@/lib/db';
import { generatedPosts, voiceProfiles } from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';

interface LearningPatterns {
  preferredPostTypes: Record<string, number>;
  preferredTopics: Record<string, number>;
  avoidedTypes: string[];
  editingPatterns: EditingPattern[];
  engagementByType: Record<string, { total: number; posted: number }>;
}

interface EditingPattern {
  lengthChange: number;
  madeMoreConcise: boolean;
  removedHashtags: boolean;
  addedData: boolean;
}

export async function updateLearningModel(userId: string): Promise<LearningPatterns> {
  // Get last 30 days of posts
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentPosts = await db.query.generatedPosts.findMany({
    where: and(
      eq(generatedPosts.userId, userId),
      gte(generatedPosts.generatedAt, thirtyDaysAgo)
    ),
  });

  // Analyze patterns
  const patterns: LearningPatterns = {
    preferredPostTypes: {},
    preferredTopics: {},
    avoidedTypes: [],
    editingPatterns: [],
    engagementByType: {},
  };

  recentPosts.forEach(post => {
    const postType = post.postType || 'unknown';
    const topic = post.topic || 'unknown';

    // Track engagement by type
    if (!patterns.engagementByType[postType]) {
      patterns.engagementByType[postType] = { total: 0, posted: 0 };
    }
    patterns.engagementByType[postType].total++;

    if (post.status === 'posted' || post.status === 'posted_edited') {
      // Strong positive signal
      patterns.preferredPostTypes[postType] = 
        (patterns.preferredPostTypes[postType] || 0) + 2;
      patterns.preferredTopics[topic] = 
        (patterns.preferredTopics[topic] || 0) + 2;
      patterns.engagementByType[postType].posted++;
    }

    if (post.status === 'posted_edited' && post.userEditedContent) {
      // Analyze what changed
      const changes = analyzeEdit(post.content, post.userEditedContent);
      patterns.editingPatterns.push(changes);
    }

    if (post.status === 'saved') {
      // Mild positive signal
      patterns.preferredPostTypes[postType] = 
        (patterns.preferredPostTypes[postType] || 0) + 1;
      patterns.preferredTopics[topic] = 
        (patterns.preferredTopics[topic] || 0) + 1;
    }

    if (post.status === 'skipped') {
      // Mild negative signal
      patterns.preferredPostTypes[postType] = 
        (patterns.preferredPostTypes[postType] || 0) - 1;
    }

    if (post.status === 'rejected') {
      // Strong negative signal - user never wants this type
      if (!patterns.avoidedTypes.includes(postType)) {
        patterns.avoidedTypes.push(postType);
      }
    }
  });

  // Update voice profile with learned preferences
  await db.update(voiceProfiles)
    .set({
      engagementPreferences: patterns,
      updatedAt: new Date(),
    })
    .where(eq(voiceProfiles.userId, userId));

  return patterns;
}

function analyzeEdit(original: string, edited: string): EditingPattern {
  return {
    lengthChange: edited.length - original.length,
    madeMoreConcise: edited.length < original.length * 0.9,
    removedHashtags: (original.match(/#/g)?.length || 0) > (edited.match(/#/g)?.length || 0),
    addedData: /\d+%/.test(edited) && !/\d+%/.test(original),
  };
}

export function getPreferenceInsights(patterns: LearningPatterns): string[] {
  const insights: string[] = [];

  // Find top post types
  const sortedTypes = Object.entries(patterns.preferredPostTypes)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a);
  
  if (sortedTypes.length > 0) {
    insights.push(`Your most successful post types: ${sortedTypes.slice(0, 3).map(([type]) => type.replace('_', ' ')).join(', ')}`);
  }

  // Find top topics
  const sortedTopics = Object.entries(patterns.preferredTopics)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a);
  
  if (sortedTopics.length > 0) {
    insights.push(`Topics with highest engagement: ${sortedTopics.slice(0, 3).map(([topic]) => topic).join(', ')}`);
  }

  // Editing patterns
  if (patterns.editingPatterns.length > 5) {
    const avgLengthChange = patterns.editingPatterns.reduce((sum, p) => sum + p.lengthChange, 0) / patterns.editingPatterns.length;
    
    if (avgLengthChange < -50) {
      insights.push('You tend to make posts more concise. Consider generating shorter posts.');
    } else if (avgLengthChange > 50) {
      insights.push('You tend to expand posts. Consider generating longer drafts.');
    }

    const removedHashtagsCount = patterns.editingPatterns.filter(p => p.removedHashtags).length;
    if (removedHashtagsCount > patterns.editingPatterns.length / 2) {
      insights.push('You often remove hashtags. Consider fewer hashtags in generated posts.');
    }
  }

  // Avoided types
  if (patterns.avoidedTypes.length > 0) {
    insights.push(`Avoid generating: ${patterns.avoidedTypes.map(t => t.replace('_', ' ')).join(', ')}`);
  }

  return insights;
}

export async function getPostTypeSuccessRates(userId: string): Promise<Record<string, number>> {
  const patterns = await updateLearningModel(userId);
  
  const successRates: Record<string, number> = {};
  
  for (const [type, data] of Object.entries(patterns.engagementByType)) {
    if (data.total > 0) {
      successRates[type] = Math.round((data.posted / data.total) * 100);
    }
  }
  
  return successRates;
}






