import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, date } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash'),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  onboardingProgress: integer('onboarding_progress').default(0).notNull(),
});

// Voice profiles table
export const voiceProfiles = pgTable('voice_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Foundation data
  jobDescription: text('job_description'),
  postingGoals: text('posting_goals').array(),
  primaryTopics: text('primary_topics').array(),
  avoidTopics: text('avoid_topics').array(),
  
  // Voice training data
  samplePosts: text('sample_posts').array(),
  uploadedContent: text('uploaded_content').array(),
  inspirationAccounts: jsonb('inspiration_accounts'), // {platform: 'linkedin', url: '', what_you_like: ''}[]
  postTypeRatings: jsonb('post_type_ratings'), // {type: 'hot_take', rating: 4}[]
  tonePreferences: jsonb('tone_preferences'), // {professional: 70, conversational: 30}
  topicPerspectives: jsonb('topic_perspectives'), // {topic: 'AI in startups', perspective: '...'}[]
  
  // Learned patterns
  voiceAnalysis: jsonb('voice_analysis'), // Claude's analysis of their writing
  engagementPreferences: jsonb('engagement_preferences'), // What they actually select
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sources table
export const sources = pgTable('sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  sourceType: text('source_type').notNull(), // 'rss' | 'linkedin_account' | 'x_account'
  sourceUrl: text('source_url').notNull(),
  sourceName: text('source_name'),
  priority: integer('priority').default(3).notNull(), // 1-5 scale
  keywords: text('keywords').array(),
  
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Generated posts table
export const generatedPosts = pgTable('generated_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  platform: text('platform').notNull(), // 'linkedin' | 'x'
  content: text('content').notNull(),
  threadBreakdown: text('thread_breakdown').array(), // For X threads
  
  // Metadata
  sourceStoryUrl: text('source_story_url'),
  sourceStoryTitle: text('source_story_title'),
  topic: text('topic'),
  postType: text('post_type'), // 'hot_take', 'news_commentary', 'poll', etc.
  tone: text('tone'),
  engagementPrediction: text('engagement_prediction'), // 'low' | 'medium' | 'high'
  
  // User action
  status: text('status').default('suggested').notNull(), // 'suggested' | 'posted' | 'posted_edited' | 'saved' | 'skipped' | 'rejected'
  userEditedContent: text('user_edited_content'),
  postedAt: timestamp('posted_at'),
  
  // Learning
  actualEngagement: jsonb('actual_engagement'), // {likes: 0, comments: 0, shares: 0}
  
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  batchDate: date('batch_date').notNull(), // Which day's batch this belongs to
});

// Chat sessions table
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  messages: jsonb('messages').notNull(), // Array of {role: 'user'|'assistant', content: ''}
  generatedPostId: uuid('generated_post_id').references(() => generatedPosts.id),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// NextAuth required tables
export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expires: timestamp('expires').notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires').notNull(),
});

// Type exports for use in the application
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type VoiceProfile = typeof voiceProfiles.$inferSelect;
export type NewVoiceProfile = typeof voiceProfiles.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type GeneratedPost = typeof generatedPosts.$inferSelect;
export type NewGeneratedPost = typeof generatedPosts.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;





