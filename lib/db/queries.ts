import { db } from './index';
import { users, voiceProfiles, sources, generatedPosts, chatSessions } from './schema';
import { eq, and, gte, desc } from 'drizzle-orm';

// User queries
export async function getUserById(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function getUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

// Voice profile queries
export async function getVoiceProfile(userId: string) {
  return db.query.voiceProfiles.findFirst({
    where: eq(voiceProfiles.userId, userId),
  });
}

export async function upsertVoiceProfile(userId: string, data: Partial<typeof voiceProfiles.$inferInsert>) {
  const existing = await getVoiceProfile(userId);
  
  if (existing) {
    return db.update(voiceProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(voiceProfiles.userId, userId))
      .returning();
  }
  
  return db.insert(voiceProfiles)
    .values({ userId, ...data })
    .returning();
}

// Sources queries
export async function getUserSources(userId: string) {
  return db.query.sources.findMany({
    where: eq(sources.userId, userId),
    orderBy: [desc(sources.priority)],
  });
}

export async function getActiveSources(userId: string) {
  return db.query.sources.findMany({
    where: and(eq(sources.userId, userId), eq(sources.isActive, true)),
    orderBy: [desc(sources.priority)],
  });
}

// Generated posts queries
export async function getPostsByDate(userId: string, batchDate: string) {
  return db.query.generatedPosts.findMany({
    where: and(
      eq(generatedPosts.userId, userId),
      eq(generatedPosts.batchDate, batchDate)
    ),
    orderBy: [desc(generatedPosts.generatedAt)],
  });
}

export async function getPostById(id: string) {
  return db.query.generatedPosts.findFirst({
    where: eq(generatedPosts.id, id),
  });
}

export async function updatePostStatus(
  id: string, 
  status: string, 
  editedContent?: string
) {
  const updates: Record<string, unknown> = { status };
  
  if (editedContent) {
    updates.userEditedContent = editedContent;
  }
  
  if (status === 'posted' || status === 'posted_edited') {
    updates.postedAt = new Date();
  }
  
  return db.update(generatedPosts)
    .set(updates)
    .where(eq(generatedPosts.id, id))
    .returning();
}

export async function getRecentPosts(userId: string, days: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return db.query.generatedPosts.findMany({
    where: and(
      eq(generatedPosts.userId, userId),
      gte(generatedPosts.generatedAt, cutoffDate)
    ),
    orderBy: [desc(generatedPosts.generatedAt)],
  });
}

// Chat session queries
export async function createChatSession(userId: string, messages: unknown[]) {
  return db.insert(chatSessions)
    .values({ userId, messages })
    .returning();
}

export async function updateChatSession(id: string, messages: unknown[]) {
  return db.update(chatSessions)
    .set({ messages })
    .where(eq(chatSessions.id, id))
    .returning();
}

export async function getRecentChatSessions(userId: string, limit: number = 10) {
  return db.query.chatSessions.findMany({
    where: eq(chatSessions.userId, userId),
    orderBy: [desc(chatSessions.createdAt)],
    limit,
  });
}






