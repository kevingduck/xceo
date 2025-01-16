import { pgTable, text, serial, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Existing tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  githubToken: text("github_token"),
  businessName: text("business_name"),
  businessDescription: text("business_description"),
  businessObjectives: jsonb("business_objectives").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  role: text("role").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"),
  userId: integer("user_id").references(() => users.id).notNull(),
  githubIssueUrl: text("github_issue_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const businessInfo = pgTable("business_info", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  section: text("section").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  fields: jsonb("fields").$type<{
    [key: string]: {
      value: string | number | string[] | Date;
      type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'list';
      updatedAt: string;
      updatedBy: 'user' | 'ai';
      aiSuggestion?: string;
    };
  }>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const businessInfoHistory = pgTable("business_info_history", {
  id: serial("id").primaryKey(),
  businessInfoId: integer("business_info_id").references(() => businessInfo.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  fields: jsonb("fields").$type<{
    [key: string]: {
      value: string | number | string[] | Date;
      type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'list';
      updatedAt: string;
      updatedBy: 'user' | 'ai';
    };
  }>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by").notNull(),
  reason: text("reason")
});

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  data: jsonb("data").$type<Record<string, any>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// New team management tables
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  department: text("department"),
  email: text("email").notNull(),
  startDate: timestamp("start_date").notNull(),
  skills: jsonb("skills").$type<string[]>(),
  bio: text("bio"),
  status: text("status").notNull().default("active"),
  salary: integer("salary"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  department: text("department").notNull(),
  description: text("description").notNull(),
  requirements: jsonb("requirements").$type<string[]>(),
  salary: jsonb("salary").$type<{
    min: number;
    max: number;
    currency: string;
  }>(),
  status: text("status").notNull().default("open"),
  priority: text("priority").default("medium"),
  location: text("location"),
  remoteAllowed: boolean("remote_allowed").default(false),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  positionId: integer("position_id").references(() => positions.id).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  resumeUrl: text("resume_url"),
  skills: jsonb("skills").$type<string[]>(),
  experience: jsonb("experience").$type<{
    years: number;
    highlights: string[];
  }>(),
  status: text("status").notNull().default("applied"),
  notes: text("notes"),
  rating: integer("rating"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// File attachments for candidates and positions
export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  entityType: text("entity_type").notNull(), // 'candidate' or 'position'
  entityId: integer("entity_id").notNull(),
  filename: text("filename").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Add new table for conversation summaries
export const conversationSummaries = pgTable("conversation_summaries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  summary: text("summary").notNull(),
  keyTopics: jsonb("key_topics").$type<string[]>(),
  contextualData: jsonb("contextual_data").$type<Record<string, any>>(),
  messageRange: jsonb("message_range").$type<{
    firstMessageId: number;
    lastMessageId: number;
  }>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>()
});

// New tables for offerings management
export const offerings = pgTable("offerings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // 'product' or 'service'
  status: text("status").notNull().default("active"), // active, discontinued, planned
  price: jsonb("price").$type<{
    amount: number;
    currency: string;
    billingCycle?: string;
  }>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const offeringFeatures = pgTable("offering_features", {
  id: serial("id").primaryKey(),
  offeringId: integer("offering_id").references(() => offerings.id).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("available"), // available, deprecated, coming_soon
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const roadmapItems = pgTable("roadmap_items", {
  id: serial("id").primaryKey(),
  offeringId: integer("offering_id").references(() => offerings.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  plannedDate: timestamp("planned_date"),
  status: text("status").notNull().default("planned"), // planned, in_progress, completed, delayed
  priority: text("priority").notNull().default("medium"), // low, medium, high
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
  chatMessages: many(chatMessages),
  analytics: many(analytics),
  businessInfo: many(businessInfo),
  teamMembers: many(teamMembers),
  positions: many(positions),
  candidates: many(candidates),
  conversationSummaries: many(conversationSummaries),
  offerings: many(offerings)
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id]
  })
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id]
  })
}));

export const businessInfoRelations = relations(businessInfo, ({ one, many }) => ({
  user: one(users, {
    fields: [businessInfo.userId],
    references: [users.id]
  }),
  history: many(businessInfoHistory)
}));

export const businessInfoHistoryRelations = relations(businessInfoHistory, ({ one }) => ({
  businessInfo: one(businessInfo, {
    fields: [businessInfoHistory.businessInfoId],
    references: [businessInfo.id]
  }),
  user: one(users, {
    fields: [businessInfoHistory.userId],
    references: [users.id]
  })
}));

export const analyticsRelations = relations(analytics, ({ one }) => ({
  user: one(users, {
    fields: [analytics.userId],
    references: [users.id]
  })
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id]
  })
}));

export const positionsRelations = relations(positions, ({ one, many }) => ({
  user: one(users, {
    fields: [positions.userId],
    references: [users.id]
  }),
  candidates: many(candidates),
  attachments: many(attachments, {
    relationName: "positionAttachments"
  })
}));

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  user: one(users, {
    fields: [candidates.userId],
    references: [users.id]
  }),
  position: one(positions, {
    fields: [candidates.positionId],
    references: [positions.id]
  }),
  attachments: many(attachments, {
    relationName: "candidateAttachments"
  })
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  user: one(users, {
    fields: [attachments.userId],
    references: [users.id]
  })
}));

// Add relation to users table
export const conversationSummariesRelations = relations(conversationSummaries, ({ one }) => ({
  user: one(users, {
    fields: [conversationSummaries.userId],
    references: [users.id]
  })
}));

// Add relations for offerings
export const offeringsRelations = relations(offerings, ({ one, many }) => ({
  user: one(users, {
    fields: [offerings.userId],
    references: [users.id]
  }),
  features: many(offeringFeatures),
  roadmapItems: many(roadmapItems)
}));

export const offeringFeaturesRelations = relations(offeringFeatures, ({ one }) => ({
  offering: one(offerings, {
    fields: [offeringFeatures.offeringId],
    references: [offerings.id]
  })
}));

export const roadmapItemsRelations = relations(roadmapItems, ({ one }) => ({
  offering: one(offerings, {
    fields: [roadmapItems.offeringId],
    references: [offerings.id]
  })
}));

// Schemas
export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  githubToken: z.string().optional(),
  businessName: z.string().optional(),
  businessDescription: z.string().optional(),
  businessObjectives: z.array(z.string()).optional()
});

export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// New team management schemas with flexible validation
export const teamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  department: z.string().optional(),
  email: z.string().email("Invalid email address"),
  startDate: z.string(),
  skills: z.string().optional(),
  bio: z.string().optional(),
  salary: z.string().optional(),
});

export const positionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().min(1, "Department is required"),
  description: z.string().min(1, "Description is required"),
  requirements: z.string().optional(),
  salary: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string()
  }).optional(),
  location: z.string().optional(),
  remoteAllowed: z.boolean().default(false),
  status: z.enum(["open", "closed", "on_hold"]).default("open"),
  priority: z.enum(["low", "medium", "high"]).default("medium")
});

export const candidateSchema = z.object({
  positionId: z.number(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  resumeUrl: z.string().optional(),
  skills: z.string().optional(),
  experienceYears: z.string(),
  highlights: z.string(),
  notes: z.string().optional(),
  rating: z.string().optional()
});

export const attachmentSchema = z.object({
  entityType: z.enum(["candidate", "position"]),
  entityId: z.number(),
  filename: z.string(),
  fileUrl: z.string(),
  fileType: z.string(),
  fileSize: z.number()
});

// Add schema and type exports
export const conversationSummarySchema = z.object({
  summary: z.string().min(1, "Summary is required"),
  keyTopics: z.array(z.string()).optional(),
  contextualData: z.record(z.any()).optional(),
  messageRange: z.object({
    firstMessageId: z.number(),
    lastMessageId: z.number()
  })
});

// Add schemas for offerings management
export const offeringSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["product", "service"]),
  status: z.enum(["active", "discontinued", "planned"]).default("active"),
  price: z.object({
    amount: z.number(),
    currency: z.string(),
    billingCycle: z.string().optional()
  }).optional()
});

export const featureSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["available", "deprecated", "coming_soon"]).default("available")
});

export const roadmapItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  plannedDate: z.string().optional(),
  status: z.enum(["planned", "in_progress", "completed", "delayed"]).default("planned"),
  priority: z.enum(["low", "medium", "high"]).default("medium")
});


// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = typeof users.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Analytics = typeof analytics.$inferSelect;
export type BusinessInfo = typeof businessInfo.$inferSelect;
export type BusinessInfoHistory = typeof businessInfoHistory.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type ConversationSummary = typeof conversationSummaries.$inferSelect;
export type Offering = typeof offerings.$inferSelect;
export type InsertOffering = typeof offerings.$inferInsert;
export type OfferingFeature = typeof offeringFeatures.$inferSelect;
export type RoadmapItem = typeof roadmapItems.$inferSelect;