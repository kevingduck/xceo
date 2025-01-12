import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupWebSocket } from "./websocket";
import { db } from "@db";
import { tasks, chatMessages, analytics, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { processAIMessage } from "./services/ai";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "inProgress", "completed"]).default("todo")
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

      await db
        .update(users)
        .set({
          businessName,
          businessDescription,
          businessObjectives: objectives
        })
        .where(eq(users.id, req.user.id))
        .returning();

      res.json({ message: "CEO configured successfully" });
    } catch (error) {
      console.error("Error configuring CEO:", error);
      res.status(500).send("Failed to configure CEO");
    }
  });


  // Chat API
  app.get("/api/chat", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    const messages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.userId, req.user.id),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)]
    });
    res.json(messages);
  });

  app.post("/api/chat", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      // First save the user's message
      const [userMessage] = await db.insert(chatMessages)
        .values({
          content: req.body.content,
          role: "user",
          userId: req.user.id
        })
        .returning();

      // Get business context for AI
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      const businessContext = user.businessName ? {
        name: user.businessName,
        description: user.businessDescription || '', // Ensure it's always a string
        objectives: user.businessObjectives as string[]
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
          userId: req.user.id
        })
        .returning();

      res.json(savedResponse);
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).send("Failed to process message");
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

const configureCEOSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessDescription: z.string().min(1, "Business description is required"),
  objectives: z.array(z.string()).min(1, "At least one objective is required")
});