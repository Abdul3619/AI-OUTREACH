import { pgTable, uuid, varchar, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  subscriptionTier: varchar('subscription_tier', { length: 50 }).default('free'),
  usageLimit: integer('usage_limit').default(100),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).default('member'),
  fullName: varchar('full_name', { length: 255 }),
  avatarUrl: varchar('avatar_url', { length: 512 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const businessProfiles = pgTable('business_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  industry: varchar('industry', { length: 255 }),
  services: text('services').array(),
  targetAudience: text('target_audience'),
  toneOfVoice: varchar('tone_of_voice', { length: 100 }).default('professional'),
  portfolioLinks: text('portfolio_links').array(),
  defaultTemplates: jsonb('default_templates').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  businessName: varchar('business_name', { length: 255 }).notNull(),
  industry: varchar('industry', { length: 100 }),
  website: varchar('website', { length: 512 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  linkedinUrl: varchar('linkedin_url', { length: 512 }),
  facebookUrl: varchar('facebook_url', { length: 512 }),
  instagramUrl: varchar('instagram_url', { length: 512 }),
  city: varchar('city', { length: 100 }),
  country: varchar('country', { length: 100 }),
  businessSize: varchar('business_size', { length: 50 }),
  languageCode: varchar('language_code', { length: 10 }).default('en'),
  scoreSeo: integer('score_seo').default(0),
  scorePerformance: integer('score_performance').default(0),
  scoreMobile: integer('score_mobile').default(0),
  scoreAccessibility: integer('score_accessibility').default(0),
  scoreBranding: integer('score_branding').default(0),
  scoreUx: integer('score_ux').default(0),
  scoreContent: integer('score_content').default(0),
  scoreSecurity: integer('score_security').default(0),
  scoreTrust: integer('score_trust').default(0),
  websiteHealthScore: integer('website_health_score').default(0),
  opportunityScore: integer('opportunity_score').default(0),
  opportunityPriority: varchar('opportunity_priority', { length: 50 }).default('Medium'),
  suggestedAction: varchar('suggested_action', { length: 512 }),
  status: varchar('status', { length: 50 }).notNull().default('discovered'),
  tags: text('tags').array(),
  leadSource: varchar('lead_source', { length: 100 }).default('manual'),
  aiAnalysisData: jsonb('ai_analysis_data').default({}),
  lastContactedAt: timestamp('last_contacted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const outreachMessages = pgTable('outreach_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  channel: varchar('channel', { length: 50 }).notNull(),
  subjectLine: varchar('subject_line', { length: 512 }),
  bodyContent: text('body_content').notNull(),
  originalAiContent: text('original_ai_content'),
  qaPersonalization: integer('qa_personalization').default(0),
  qaSpamRisk: integer('qa_spam_risk').default(0),
  qaNaturalTone: integer('qa_natural_tone').default(0),
  qaLanguageAccuracy: integer('qa_language_accuracy').default(0),
  qaConfidence: varchar('qa_confidence', { length: 50 }).default('Medium'),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  dueDate: timestamp('due_date'),
  isCompleted: boolean('is_completed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  actionType: varchar('action_type', { length: 100 }).notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const backgroundJobs = pgTable('background_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('queued'),
  progress: integer('progress').default(0),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  logs: text('logs').array().default([]),
  payload: jsonb('payload').default({}),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at').defaultNow(),
  finishedAt: timestamp('finished_at'),
  error: text('error'),
});
