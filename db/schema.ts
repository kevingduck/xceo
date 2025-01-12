import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

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

// Split the schemas for different use cases
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

export const businessInfo = pgTable("business_info", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  section: text("section").notNull(), // e.g., "Business Overview", "Financial Overview"
  title: text("title").notNull(),
  content: text("content").notNull(),
  fields: jsonb("fields").$type<Record<string, { value: string | number | string[]; type: string }>>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const businessInfoHistory = pgTable("business_info_history", {
  id: serial("id").primaryKey(),
  businessInfoId: integer("business_info_id").references(() => businessInfo.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  fields: jsonb("fields").$type<Record<string, { value: string | number | string[]; type: string }>>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by").notNull(), // "user" or "ai"
  reason: text("reason") // AI's reason for update if applicable
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

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  userId: integer("user_id").references(() => users.id).notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  data: jsonb("data").$type<Record<string, any>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
  chatMessages: many(chatMessages),
  analytics: many(analytics),
  businessInfo: many(businessInfo)
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

export const insertBusinessInfoSchema = createInsertSchema(businessInfo);
export const selectBusinessInfoSchema = createSelectSchema(businessInfo);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = typeof users.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Analytics = typeof analytics.$inferSelect;
export type BusinessInfo = typeof businessInfo.$inferSelect;
export type BusinessInfoHistory = typeof businessInfoHistory.$inferSelect;