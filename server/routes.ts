import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupWebSocket } from "./websocket";
import { db } from "@db";
import { tasks, chatMessages, analytics } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  setupAuth(app);
  
  // Tasks API
  app.get("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");
    
    const userTasks = await db.query.tasks.findMany({
      where: eq(tasks.userId, req.user.id),
      orderBy: (tasks, { desc }) => [desc(tasks.createdAt)]
    });
    res.json(userTasks);
  });

  app.post("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");
    
    const task = await db.insert(tasks)
      .values({
        ...req.body,
        userId: req.user.id
      })
      .returning();
    res.json(task[0]);
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
    
    const message = await db.insert(chatMessages)
      .values({
        ...req.body,
        userId: req.user.id
      })
      .returning();
    res.json(message[0]);
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
