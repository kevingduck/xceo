import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupWebSocket } from "./websocket";
import { db } from "@db";
import { tasks, chatMessages, analytics, users, businessInfo } from "@db/schema";
import { eq } from "drizzle-orm";
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

      // Update user profile
      await db
        .update(users)
        .set({
          businessName,
          businessDescription,
          businessObjectives: objectives
        })
        .where(eq(users.id, req.user.id));

      // Create initial business info entries with detailed templates
      const sections = [
        {
          section: "Business Overview",
          title: "Business Overview",
          content: `Company Profile:
- Company Name: ${businessName}
- Industry: To be defined
- Founded: To be defined
- Location: To be defined

Mission Statement:
${businessDescription}

Key Objectives:
${objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

Value Proposition:
To be defined based on market research and customer feedback`,
          metadata: { source: "initial-setup" }
        },
        {
          section: "Market Intelligence",
          title: "Market Intelligence",
          content: `Target Market:
- Total Addressable Market: To be researched
- Serviceable Obtainable Market: To be defined
- Primary Customer Segments: To be identified

Competitive Landscape:
1. Direct Competitors
   - To be researched and analyzed
   - Key differentiators to be identified
2. Indirect Competitors
   - Alternative solutions to be mapped
   - Market substitutes to be evaluated

Market Trends:
1. Industry trends to be analyzed
2. Technology trends to be evaluated
3. Consumer behavior patterns to be studied

Growth Opportunities:
1. Market expansion possibilities
2. Product development directions
3. Partnership potentials`,
          metadata: { source: "initial-setup" }
        },
        {
          section: "Financial Overview",
          title: "Financial Overview",
          content: `Current Financials:
- Revenue: To be tracked
- Expenses: To be monitored
- Profit Margins: To be calculated

Key Metrics:
1. Customer Acquisition Cost (CAC): To be measured
2. Lifetime Value (LTV): To be calculated
3. Monthly Recurring Revenue (MRR): To be tracked

Investment Status:
- Funding Round: To be determined
- Capital Raised: To be tracked
- Runway: To be calculated

Financial Goals:
1. Revenue targets to be set
2. Profitability milestones to be defined
3. Investment strategy to be developed`,
          metadata: { source: "initial-setup" }
        },
        {
          section: "Operations",
          title: "Operations",
          content: `Core Business Processes:
1. Product/Service Delivery
   - Standard operating procedures to be defined
   - Quality control measures to be implemented
   - Delivery timelines to be established

2. Customer Support
   - Service standards to be set
   - Response time targets to be defined
   - Customer satisfaction goals to be established

Infrastructure:
- Technology stack to be defined
- Tools and systems to be implemented
- Integration points to be identified

Operational Metrics:
1. Efficiency KPIs to be defined
2. Quality standards to be set
3. Cost optimization targets to be established`,
          metadata: { source: "initial-setup" }
        },
        {
          section: "Human Capital",
          title: "Human Capital",
          content: `Organizational Structure:
- Leadership team to be defined
- Departmental structure to be established
- Reporting lines to be clarified

Hiring Plan:
- Key positions to be identified
- Recruitment timeline to be set
- Skills requirements to be defined

Team Development:
1. Training needs to be assessed
2. Career paths to be defined
3. Performance metrics to be established

Culture & Values:
- Company values to be defined
- Team building activities to be planned
- Recognition programs to be developed`,
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