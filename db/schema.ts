import { pgTable, text, serial, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users Table
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

// Business Info Table
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

// Business Info History Table
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

// Tasks Table
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

// Chat Messages Table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  role: text("role").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Analytics Table
export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  data: jsonb("data").$type<Record<string, any>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// New tables for team management
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
  requirements: jsonb("requirements").$type<string[]>().notNull(),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
  chatMessages: many(chatMessages),
  analytics: many(analytics),
  businessInfo: many(businessInfo),
  teamMembers: many(teamMembers),
  positions: many(positions),
  candidates: many(candidates)
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

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
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
  candidates: many(candidates)
}));

export const candidatesRelations = relations(candidates, ({ one }) => ({
  user: one(users, {
    fields: [candidates.userId],
    references: [users.id]
  }),
  position: one(positions, {
    fields: [candidates.positionId],
    references: [positions.id]
  })
}));

// Schemas
export const insertBusinessInfoSchema = createInsertSchema(businessInfo);
export const selectBusinessInfoSchema = createSelectSchema(businessInfo);
export const insertTeamMemberSchema = createInsertSchema(teamMembers);
export const selectTeamMemberSchema = createSelectSchema(teamMembers);
export const insertPositionSchema = createInsertSchema(positions);
export const selectPositionSchema = createSelectSchema(positions);
export const insertCandidateSchema = createInsertSchema(candidates);
export const selectCandidateSchema = createSelectSchema(candidates);


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

// Additional schemas
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

export const selectUserSchema = createSelectSchema(users);