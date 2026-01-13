import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { voiceProfiles, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const profile = await db.query.voiceProfiles.findFirst({
      where: eq(voiceProfiles.userId, userId),
    });

    if (!profile) {
      return NextResponse.json(null);
    }

    // Transform database fields to match frontend structure
    return NextResponse.json({
      foundation: {
        jobDescription: profile.jobDescription,
        primaryTopics: profile.primaryTopics,
        avoidTopics: profile.avoidTopics,
        postingGoals: profile.postingGoals,
      },
      samplePosts: profile.samplePosts,
      uploadedContent: profile.uploadedContent,
      voiceAnalysis: profile.voiceAnalysis,
      inspirationAccounts: profile.inspirationAccounts,
      postTypeRatings: profile.postTypeRatings,
      tonePreferences: profile.tonePreferences,
      topicPerspectives: profile.topicPerspectives,
    });
  } catch (error) {
    console.error('Failed to get onboarding data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const userId = data.userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Check if voice profile exists, create if not
    const existingProfile = await db.query.voiceProfiles.findFirst({
      where: eq(voiceProfiles.userId, userId),
    });

    if (!existingProfile) {
      // Create new voice profile
      await db.insert(voiceProfiles).values({
        userId,
        jobDescription: data.foundation?.jobDescription,
        postingGoals: data.foundation?.postingGoals,
        primaryTopics: data.foundation?.primaryTopics,
        avoidTopics: data.foundation?.avoidTopics,
        samplePosts: data.samplePosts,
        uploadedContent: data.uploadedContent,
        voiceAnalysis: data.voiceAnalysis,
        inspirationAccounts: data.inspirationAccounts,
        postTypeRatings: data.postTypeRatings,
        tonePreferences: data.tonePreferences,
        topicPerspectives: data.topicPerspectives,
      });
    } else {
      // Update voice profile
      await db.update(voiceProfiles)
        .set({
          jobDescription: data.foundation?.jobDescription,
          postingGoals: data.foundation?.postingGoals,
          primaryTopics: data.foundation?.primaryTopics,
          avoidTopics: data.foundation?.avoidTopics,
          samplePosts: data.samplePosts,
          uploadedContent: data.uploadedContent,
          voiceAnalysis: data.voiceAnalysis,
          inspirationAccounts: data.inspirationAccounts,
          postTypeRatings: data.postTypeRatings,
          tonePreferences: data.tonePreferences,
          topicPerspectives: data.topicPerspectives,
          updatedAt: new Date(),
        })
        .where(eq(voiceProfiles.userId, userId));
    }

    // Update user progress
    await db.update(users)
      .set({
        onboardingProgress: data.progress || 0,
      })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save onboarding data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
