import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupWebSocket } from "./websocket";
import { db } from "@db";
import { tasks, chatMessages, analytics, users, businessInfo, businessInfoHistory } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { processAIMessage } from "./services/ai";

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

const VALID_SECTIONS = [
  "Business Overview",
  "Financial Overview",
  "Market Intelligence",
  "Human Capital",
  "Operations"
] as const;

const businessInfoSchema = z.object({
  section: z.enum(VALID_SECTIONS),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  metadata: z.record(z.any()).optional().default({})
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

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

      // Verify task belongs to user
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

      // Verify task belongs to user
      const [existingTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (!existingTask) return res.status(404).send("Task not found");
      if (existingTask.userId !== req.user.id) return res.status(403).send("Unauthorized");

      await db
        .delete(tasks)
        .where(eq(tasks.id, taskId));

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

      // Update user profile
      await db
        .update(users)
        .set({
          businessName,
          businessDescription,
          businessObjectives: objectives
        })
        .where(eq(users.id, req.user.id));

      // Create initial business info entries
      const sections = [
        {
          section: "Business Overview",
          title: "Business Overview",
          content: `${businessName}\n\n${businessDescription}\n\nKey Objectives:\n${objectives.map(obj => `- ${obj}`).join('\n')}`,
          metadata: { source: "initial-setup" }
        },
        {
          section: "Financial Overview",
          title: "Financial Overview",
          content: "Financial metrics and goals will be tracked here.",
          metadata: { source: "initial-setup" }
        },
        {
          section: "Market Intelligence",
          title: "Market Intelligence",
          content: "Market analysis and competitor insights will be documented here.",
          metadata: { source: "initial-setup" }
        },
        {
          section: "Human Capital",
          title: "Human Capital",
          content: "Team structure and organizational development plans will be outlined here.",
          metadata: { source: "initial-setup" }
        },
        {
          section: "Operations",
          title: "Operations",
          content: "Operational processes and improvement initiatives will be detailed here.",
          metadata: { source: "initial-setup" }
        }
      ];

      // Insert initial business info sections
      await db.insert(businessInfo).values(
        sections.map(section => ({
          ...section,
          userId: req.user.id
        }))
      );

      res.json({ message: "CEO configured successfully" });
    } catch (error) {
      console.error("Error configuring CEO:", error);
      res.status(500).send("Failed to configure CEO");
    }
  });


  // Business Info API
  app.get("/api/business-info", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const userBusinessInfo = await db.query.businessInfo.findMany({
        where: eq(businessInfo.userId, req.user.id),
      });
      console.log("Found business info sections:", userBusinessInfo.map(info => info.section));
      res.json(userBusinessInfo);
    } catch (error) {
      console.error("Error fetching business info:", error);
      res.status(500).send("Failed to fetch business information");
    }
  });

  app.post("/api/business-info", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      console.log("Creating new business info with data:", req.body);

      const result = businessInfoSchema.safeParse(req.body);
      if (!result.success) {
        console.error("Validation error:", result.error);
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }

      const { section, title, content, metadata } = result.data;

      // Check if section already exists for user
      const [existingSection] = await db
        .select()
        .from(businessInfo)
        .where(
          and(
            eq(businessInfo.userId, req.user.id),
            eq(businessInfo.section, section)
          )
        )
        .limit(1);

      if (existingSection) {
        console.error("Section already exists:", section);
        return res.status(400).send(`Section "${section}" already exists`);
      }

      const [newInfo] = await db.insert(businessInfo)
        .values({
          userId: req.user.id,
          section,
          title,
          content,
          metadata
        })
        .returning();

      console.log("Created new business info:", newInfo);
      res.json(newInfo);
    } catch (error) {
      console.error("Error creating business info:", error);
      res.status(500).send("Failed to create business information");
    }
  });

  app.get("/api/business-info/history/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const infoId = parseInt(req.params.id);
      if (isNaN(infoId)) return res.status(400).send("Invalid ID");

      const [info] = await db
        .select()
        .from(businessInfo)
        .where(eq(businessInfo.id, infoId))
        .limit(1);

      if (!info) return res.status(404).send("Business info not found");
      if (info.userId !== req.user.id) return res.status(403).send("Unauthorized");

      const history = await db.query.businessInfoHistory.findMany({
        where: eq(businessInfoHistory.businessInfoId, infoId),
        orderBy: (history, { desc }) => [desc(history.updatedAt)],
        limit: 10
      });

      res.json(history);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).send("Failed to fetch history");
    }
  });

  app.patch("/api/business-info/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const infoId = parseInt(req.params.id);
      console.log("Updating business info:", infoId, req.body);

      if (isNaN(infoId)) {
        console.error("Invalid business info ID:", req.params.id);
        return res.status(400).send("Invalid ID");
      }

      // Verify business info exists and belongs to user
      const [existingInfo] = await db
        .select()
        .from(businessInfo)
        .where(eq(businessInfo.id, infoId))
        .limit(1);

      console.log("Found existing info:", existingInfo);

      if (!existingInfo) {
        console.error("Business info not found:", infoId);
        return res.status(404).send("Business info not found");
      }

      if (existingInfo.userId !== req.user.id) {
        console.error("Unauthorized access to business info:", infoId);
        return res.status(403).send("Unauthorized");
      }

      // Save the previous version to history
      await db.insert(businessInfoHistory).values({
        businessInfoId: infoId,
        userId: req.user.id,
        content: existingInfo.content,
        metadata: existingInfo.metadata,
        updatedBy: "user",
      });

      // Update the business info
      const [updatedInfo] = await db
        .update(businessInfo)
        .set({
          content: req.body.content,
          updatedAt: new Date()
        })
        .where(eq(businessInfo.id, infoId))
        .returning();

      console.log("Updated business info:", updatedInfo);
      res.json(updatedInfo);
    } catch (error) {
      console.error("Error updating business info:", error);
      res.status(500).send("Failed to update business information");
    }
  });

  app.delete("/api/business-info/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const infoId = parseInt(req.params.id);
      if (isNaN(infoId)) return res.status(400).send("Invalid ID");

      // Verify business info exists and belongs to user
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

      // First delete history entries
      await db
        .delete(businessInfoHistory)
        .where(eq(businessInfoHistory.businessInfoId, infoId));

      // Then delete the main entry
      await db
        .delete(businessInfo)
        .where(eq(businessInfo.id, infoId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting business info:", error);
      res.status(500).send("Failed to delete business information");
    }
  });

  // Chat API with improved conversation handling and error protection
  app.get("/api/chat", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      // Get last 50 messages instead of all to maintain context
      const messages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.userId, req.user.id),
        orderBy: (messages, { desc }) => [desc(messages.createdAt)],
        limit: 50
      });

      // Reverse to maintain chronological order
      res.json(messages.reverse());
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

      // Get last 10 messages for context, excluding the message we just inserted
      const recentMessages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.userId, req.user.id),
        orderBy: (messages, { desc }) => [desc(messages.createdAt)],
        limit: 10
      });

      const businessContext = user.businessName ? {
        name: user.businessName,
        description: user.businessDescription || '',
        objectives: user.businessObjectives as string[],
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

      // Save AI's response
      const [savedResponse] = await db.insert(chatMessages)
        .values({
          content: aiResponse,
          role: "assistant",
          userId: req.user.id,
          metadata: { timestamp: new Date().toISOString() }
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

  const httpServer = createServer(app);
  setupWebSocket(httpServer);

  return httpServer;
}