import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupWebSocket } from "./websocket";
import { db } from "@db";
import { tasks, chatMessages, analytics, users, businessInfo, businessInfoHistory } from "@db/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { processAIMessage, type BusinessSection, businessSections } from "./services/ai";
import { type FieldType, type FieldValue, type Field, type BusinessInfoFields } from "@db/types";

// Define field validation schema
const fieldValueSchema = z.object({
  value: z.union([z.string(), z.number(), z.array(z.string()), z.date()]),
  type: z.enum(['text', 'number', 'currency', 'percentage', 'date', 'list'])
});

const fieldUpdateSchema = z.record(z.string(), fieldValueSchema);

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "inProgress", "completed"]).default("todo")
});

const configureCEOSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessDescription: z.string().min(1, "Business description is required"),
  objectives: z.array(z.string()).min(1, "At least one objective is required")
});

export function registerRoutes(app: Express): Server {
  // Tasks API
  app.get("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const userTasks = await db.query.tasks.findMany({
        where: eq(tasks.userId, req.user.id),
        orderBy: (tasks, { desc }) => [desc(tasks.createdAt)]
      });
      res.json(userTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).send("Failed to fetch tasks");
    }
  });

  app.post("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const result = taskSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }

      const [task] = await db.insert(tasks)
        .values({
          ...result.data,
          userId: req.user.id
        })
        .returning();
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).send("Failed to create task");
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) return res.status(400).send("Invalid task ID");

      const [existingTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (!existingTask) return res.status(404).send("Task not found");
      if (existingTask.userId !== req.user.id) return res.status(403).send("Unauthorized");

      const result = taskSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }

      const [updatedTask] = await db
        .update(tasks)
        .set({ ...result.data, updatedAt: new Date() })
        .where(eq(tasks.id, taskId))
        .returning();

      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).send("Failed to update task");
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) return res.status(400).send("Invalid task ID");

      const [existingTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (!existingTask) return res.status(404).send("Task not found");
      if (existingTask.userId !== req.user.id) return res.status(403).send("Unauthorized");

      await db.delete(tasks).where(eq(tasks.id, taskId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).send("Failed to delete task");
    }
  });

  // Configure CEO endpoint
  app.post("/api/configure-ceo", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const result = configureCEOSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }

      const { businessName, businessDescription, objectives } = result.data;

      await db
        .update(users)
        .set({
          businessName,
          businessDescription,
          businessObjectives: objectives
        })
        .where(eq(users.id, req.user.id));

      const initialFields: BusinessInfoFields = {
        company_name: {
          value: businessName,
          type: "text",
          updatedAt: new Date().toISOString(),
          updatedBy: "system"
        }
      };

      const sections = [
        {
          section: "Business Overview",
          title: "Business Overview",
          content: `Company Profile:\n- Company Name: ${businessName}\n- Description: ${businessDescription}\n\nObjectives:\n${objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}`,
          userId: req.user.id,
          fields: initialFields,
          metadata: { source: "initial-setup" }
        },
        {
          section: "Market Intelligence",
          title: "Market Intelligence",
          content: "Initial market intelligence content",
          userId: req.user.id,
          fields: {} as BusinessInfoFields,
          metadata: { source: "initial-setup" }
        },
        {
          section: "Financial Overview",
          title: "Financial Overview",
          content: "Initial financial overview content",
          userId: req.user.id,
          fields: {} as BusinessInfoFields,
          metadata: { source: "initial-setup" }
        },
        {
          section: "Operations",
          title: "Operations",
          content: "Initial operations content",
          userId: req.user.id,
          fields: {} as BusinessInfoFields,
          metadata: { source: "initial-setup" }
        },
        {
          section: "Human Capital",
          title: "Human Capital",
          content: "Initial human capital content",
          userId: req.user.id,
          fields: {} as BusinessInfoFields,
          metadata: { source: "initial-setup" }
        }
      ] as const;

      await db.insert(businessInfo).values(sections);

      res.json({ message: "CEO configured successfully" });
    } catch (error) {
      console.error("Error configuring CEO:", error);
      res.status(500).send("Failed to configure CEO");
    }
  });

  // Update the initialization endpoint
  app.post("/api/business-info/initialize", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      // Get current user's business info
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (!user.businessName) {
        return res.status(400).send("Please configure your business first");
      }


      // Create initial fields with proper typing
      const initialFields: BusinessInfoFields = {
        company_name: {
          value: user.businessName,
          type: "text",
          updatedAt: new Date().toISOString(),
          updatedBy: "system"
        }
      };

      // Create sections with properly typed fields
      const sectionsToCreate = [
        {
          section: "Business Overview",
          title: "Business Overview",
          content: `Initial content for Business Overview`,
          userId: req.user.id,
          fields: initialFields,
          metadata: { source: "auto-init" }
        },
        {
          section: "Market Intelligence",
          title: "Market Intelligence",
          content: `Initial content for Market Intelligence`,
          userId: req.user.id,
          fields: {} as BusinessInfoFields,
          metadata: { source: "auto-init" }
        },
        {
          section: "Financial Overview",
          title: "Financial Overview",
          content: `Initial content for Financial Overview`,
          userId: req.user.id,
          fields: {} as BusinessInfoFields,
          metadata: { source: "auto-init" }
        },
        {
          section: "Operations",
          title: "Operations",
          content: `Initial content for Operations`,
          userId: req.user.id,
          fields: {} as BusinessInfoFields,
          metadata: { source: "auto-init" }
        },
        {
          section: "Human Capital",
          title: "Human Capital",
          content: `Initial content for Human Capital`,
          userId: req.user.id,
          fields: {} as BusinessInfoFields,
          metadata: { source: "auto-init" }
        }
      ] as const;

      const createdSections = await db
        .insert(businessInfo)
        .values(sectionsToCreate)
        .returning();

      res.json({
        message: "Sections initialized successfully",
        sections: createdSections
      });
    } catch (error) {
      console.error("Error initializing business sections:", error);
      res.status(500).send("Failed to initialize business sections");
    }
  });

  // Get field templates
  app.get("/api/business-info/templates", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    res.json(businessSections);
  });

  // Update specific fields
  app.patch("/api/business-info/:id/fields", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const infoId = parseInt(req.params.id);
      if (isNaN(infoId)) {
        return res.status(400).send("Invalid business info ID");
      }

      // Get existing business info
      const [existingInfo] = await db
        .select()
        .from(businessInfo)
        .where(eq(businessInfo.id, infoId))
        .limit(1);

      if (!existingInfo) {
        return res.status(404).send("Business info not found");
      }
      if (existingInfo.userId !== req.user.id) {
        return res.status(403).send("Unauthorized");
      }

      // Validate field updates
      const result = fieldUpdateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid fields: " + result.error.issues.map(i => i.message).join(", ")
        );
      }

      // Save to history first
      await db.insert(businessInfoHistory).values({
        businessInfoId: infoId,
        userId: req.user.id,
        content: existingInfo.content,
        fields: existingInfo.fields || {},
        updatedBy: 'user',
        reason: 'Manual field update',
        metadata: { source: 'field-update' }
      });

      // Update only the specified fields
      const updatedFields = {
        ...(existingInfo.fields || {}),
        ...Object.entries(result.data).reduce((acc, [key, value]) => ({
          ...acc,
          [key]: {
            value: value.value,
            type: value.type,
            updatedAt: new Date().toISOString(),
            updatedBy: 'user'
          }
        }), {})
      };

      // Update the business info
      const [updatedInfo] = await db
        .update(businessInfo)
        .set({
          fields: updatedFields,
          updatedAt: new Date()
        })
        .where(eq(businessInfo.id, infoId))
        .returning();

      if (!updatedInfo) {
        throw new Error('Failed to update business info fields');
      }

      res.json(updatedInfo);
    } catch (error) {
      console.error("Error updating business info fields:", error);
      res.status(500).send(error instanceof Error ? error.message : "Failed to update business info fields");
    }
  });

  // Chat API
  app.get("/api/chat", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      // Get all messages to maintain context
      const messages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.userId, req.user.id),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)]
      });

      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).send("Failed to fetch chat messages");
    }
  });

  app.post("/api/chat", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      if (!req.body.content) {
        return res.status(400).send("Message content is required");
      }

      // First save the user's message
      const [userMessage] = await db.insert(chatMessages)
        .values({
          content: req.body.content,
          role: "user",
          userId: req.user.id,
          metadata: { timestamp: new Date().toISOString() }
        })
        .returning();

      // Get business context for AI
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      // Get recent messages for context
      const recentMessages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.userId, req.user.id),
        orderBy: (messages, { desc }) => [desc(messages.createdAt)],
        limit: 10
      });

      const businessContext = user.businessName ? {
        name: user.businessName,
        description: user.businessDescription || '',
        objectives: user.businessObjectives || [],
        recentMessages: recentMessages
          .filter(msg => msg.id !== userMessage.id) // Exclude current message
          .reverse()
          .map(msg => ({
            role: msg.role,
            content: msg.content
          }))
      } : undefined;

      // Process with AI and get response
      const aiResponse = await processAIMessage(
        req.user.id,
        req.body.content,
        businessContext
      );

      // Save AI's response with metadata including suggested actions
      const [savedResponse] = await db.insert(chatMessages)
        .values({
          content: aiResponse.content,
          role: "assistant",
          userId: req.user.id,
          metadata: {
            timestamp: new Date().toISOString(),
            suggestedActions: aiResponse.suggestedActions
          }
        })
        .returning();

      res.json(savedResponse);
    } catch (error) {
      console.error("Chat error:", error);
      next(error);
    }
  });

  // Analytics API
  app.get("/api/analytics", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    const userAnalytics = await db.query.analytics.findMany({
      where: eq(analytics.userId, req.user.id)
    });
    res.json(userAnalytics);
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const allUsers = await db
        .select()
        .from(users);
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/business-info", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const allBusinessInfo = await db
        .select()
        .from(businessInfo);
      res.json(allBusinessInfo);
    } catch (error) {
      console.error("Error fetching business info:", error);
      res.status(500).json({ message: "Failed to fetch business info" });
    }
  });

  app.get("/api/admin/tasks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const allTasks = await db
        .select()
        .from(tasks);
      res.json(allTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/admin/chat-messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const allMessages = await db
        .select()
        .from(chatMessages);
      res.json(allMessages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.get("/api/admin/analytics", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const allAnalytics = await db
        .select()
        .from(analytics);
      res.json(allAnalytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Add these routes before the end of registerRoutes function
  app.post("/api/settings/clear-data", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      // Delete all user data in order of dependencies
      await Promise.all([
        db.delete(tasks).where(eq(tasks.userId, req.user.id)),
        db.delete(chatMessages).where(eq(chatMessages.userId, req.user.id)),
        db.delete(analytics).where(eq(analytics.userId, req.user.id)),
        db.delete(businessInfoHistory).where(eq(businessInfoHistory.userId, req.user.id)),
        db.delete(businessInfo).where(eq(businessInfo.userId, req.user.id))
      ]);

      // Reset user's business configuration
      await db
        .update(users)
        .set({
          businessName: null,
          businessDescription: null,
          businessObjectives: null
        })
        .where(eq(users.id, req.user.id));

      res.json({ message: "All data cleared successfully" });
    } catch (error) {
      console.error("Error clearing data:", error);
      res.status(500).send("Failed to clear data");
    }
  });

  app.get("/api/settings/export-data", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      // Fetch all user data
      const [
        userTasks,
        userChats,
        userAnalytics,
        userBusinessInfo,
        userBusinessInfoHistory,
        userData
      ] = await Promise.all([
        db.query.tasks.findMany({
          where: eq(tasks.userId, req.user.id)
        }),
        db.query.chatMessages.findMany({
          where: eq(chatMessages.userId, req.user.id)
        }),
        db.query.analytics.findMany({
          where: eq(analytics.userId, req.user.id)
        }),
        db.query.businessInfo.findMany({
          where: eq(businessInfo.userId, req.user.id)
        }),
        db.query.businessInfoHistory.findMany({
          where: eq(businessInfoHistory.userId, req.user.id)
        }),
        db.query.users.findFirst({
          where: eq(users.id, req.user.id),
          columns: {
            id: true,
            username: true,
            businessName: true,
            businessDescription: true,
            businessObjectives: true,
            createdAt: true
          }
        })
      ]);

      const exportData = {
        user: userData,
        tasks: userTasks,
        chats: userChats,
        analytics: userAnalytics,
        businessInfo: userBusinessInfo,
        businessInfoHistory: userBusinessInfoHistory,
        exportDate: new Date().toISOString()
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=ai-ceo-data.json');
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).send("Failed to export data");
    }
  });

  app.patch("/api/admin/:table/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { table, id } = req.params;
    const tableId = parseInt(id);
    if (isNaN(tableId)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    try {
      let result;
      switch (table) {
        case 'users':
          [result] = await db
            .update(users)
            .set(req.body)
            .where(eq(users.id, tableId))
            .returning();
          break;
        case 'business_info':
          [result] = await db
            .update(businessInfo)
            .set(req.body)
            .where(eq(businessInfo.id, tableId))
            .returning();
          break;
        case 'tasks':
          [result] = await db
            .update(tasks)
            .set(req.body)
            .where(eq(tasks.id, tableId))
            .returning();
          break;
        case 'chat_messages':
          [result] = await db
            .update(chatMessages)
            .set(req.body)
            .where(eq(chatMessages.id, tableId))
            .returning();
          break;
        case 'analytics':
          [result] = await db
            .update(analytics)
            .set(req.body)
            .where(eq(analytics.id, tableId))
            .returning();
          break;
        default:
          return res.status(400).json({ message: "Invalid table name" });
      }

      if (!result) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.json(result);
    } catch (error) {
      console.error(`Error updating ${table}:`, error);
      res.status(500).json({ message: `Failed to update ${table}` });
    }
  });

  app.delete("/api/admin/:table", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { table } = req.params;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Invalid or empty IDs array" });
    }

    try {
      let result;
      switch (table) {
        case 'users':
          // For users, first delete all related data
          await Promise.all([
            db.delete(tasks).where(inArray(tasks.userId, ids)),
            db.delete(chatMessages).where(inArray(chatMessages.userId, ids)),
            db.delete(analytics).where(inArray(analytics.userId, ids)),
            db.delete(businessInfoHistory).where(inArray(businessInfoHistory.userId, ids)),
            db.delete(businessInfo).where(inArray(businessInfo.userId, ids))
          ]);
          // Then delete the users
          result = await db
            .delete(users)
            .where(inArray(users.id, ids))
            .returning();
          break;
        case 'business_info':
          // First delete history
          await db
            .delete(businessInfoHistory)
            .where(inArray(businessInfoHistory.businessInfoId, ids));
          // Then delete business info
          result = await db
            .delete(businessInfo)
            .where(inArray(businessInfo.id, ids))
            .returning();
          break;
        case 'tasks':
          result = await db
            .delete(tasks)
            .where(inArray(tasks.id, ids))
            .returning();
          break;
        case 'chat_messages':
          result = await db
            .delete(chatMessages)
            .where(inArray(chatMessages.id, ids))
            .returning();
          break;
        case 'analytics':
          result = await db
            .delete(analytics)
            .where(inArray(analytics.id, ids))
            .returning();
          break;
        default:
          return res.status(400).json({ message: "Invalid table name" });
      }

      res.json({ message: "Items deleted successfully", deleted: result });
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error);
      res.status(500).json({ message: `Failed to delete from ${table}` });
    }
  });

  const httpServer = createServer(app);
  setupWebSocket(httpServer);

  return httpServer;
}