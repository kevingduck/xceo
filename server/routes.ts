import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupWebSocket } from "./websocket";
import { db } from "@db";
import { tasks, chatMessages, analytics, users, businessInfo, businessInfoHistory, teamMembers, positions, candidates } from "@db/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { processAIMessage, type BusinessSection, businessSections } from "./services/ai";

// Define team management schemas
const teamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  department: z.string().optional(),
  email: z.string().email("Invalid email address"),
  startDate: z.string().transform(str => new Date(str)),
  skills: z.array(z.string()).optional(),
  bio: z.string().optional(),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
  salary: z.number().optional()
});

const positionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().min(1, "Department is required"),
  description: z.string().min(1, "Description is required"),
  requirements: z.array(z.string()).min(1, "At least one requirement is required"),
  salary: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string()
  }).optional(),
  status: z.enum(["open", "closed", "on_hold"]).default("open"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  location: z.string().optional(),
  remoteAllowed: z.boolean().default(false)
});

const candidateSchema = z.object({
  positionId: z.number(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  resumeUrl: z.string().url().optional(),
  skills: z.array(z.string()).optional(),
  experience: z.object({
    years: z.number(),
    highlights: z.array(z.string())
  }).optional(),
  status: z.enum(["applied", "screening", "interviewing", "offered", "rejected", "hired"]).default("applied"),
  notes: z.string().optional(),
  rating: z.number().min(1).max(5).optional()
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
          fields: {
            company_name: {
              value: businessName,
              type: "text",
              updatedAt: new Date().toISOString(),
              updatedBy: "system"
            }
          },
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
          fields: {},
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
          fields: {},
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
          fields: {},
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
          fields: {},
          metadata: { source: "initial-setup" }
        }
      ];
      // Insert initial business info sections
      const fieldsWithType = {
        company_name: {
          value: businessName,
          type: "text" as const,
          updatedAt: new Date().toISOString(),
          updatedBy: "system" as const
        }
      };
      await db.insert(businessInfo).values(
        sections.map(section => ({
          section: section.section,
          title: section.title,
          content: section.content,
          userId: req.user.id,
          fields: section.section === "Business Overview" ? fieldsWithType : {},
          metadata: { source: "initial-setup" }
        }))
      );
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
      // Define required sections with default content
      const requiredSections = [
        {
          section: "Business Overview",
          title: "Business Overview",
          defaultFields: {
            company_name: {
              value: user.businessName,
              type: "text",
              updatedAt: new Date().toISOString(),
              updatedBy: "system"
            }
          }
        },
        {
          section: "Market Intelligence",
          title: "Market Intelligence",
          defaultFields: {}
        },
        {
          section: "Financial Overview",
          title: "Financial Overview",
          defaultFields: {}
        },
        {
          section: "Operations",
          title: "Operations",
          defaultFields: {}
        },
        {
          section: "Human Capital",
          title: "Human Capital",
          defaultFields: {}
        }
      ];
      // Get existing sections
      const existingSections = await db
        .select()
        .from(businessInfo)
        .where(eq(businessInfo.userId, req.user.id));
      // Group by section to get latest entries
      const latestSectionMap = existingSections.reduce((acc, curr) => {
        if (!acc[curr.section] || acc[curr.section].createdAt < curr.createdAt) {
          acc[curr.section] = curr;
        }
        return acc;
      }, {} as Record<string, typeof existingSections[0]>);
      // Create missing sections
      const sectionsToCreate = requiredSections
        .filter(required => !latestSectionMap[required.section])
        .map(section => ({
          section: section.section,
          title: section.title,
          content: `Initial content for ${section.section}`,
          userId: req.user.id,
          fields: section.defaultFields,
          metadata: { source: "auto-init" }
        }));
      let createdSections: typeof existingSections = [];
      if (sectionsToCreate.length > 0) {
        createdSections = await db
          .insert(businessInfo)
          .values(sectionsToCreate)
          .returning();
      }
      // Combine existing and newly created sections
      const allSections = [
        ...Object.values(latestSectionMap),
        ...createdSections
      ];
      res.json({
        message: sectionsToCreate.length > 0
          ? "Sections initialized successfully"
          : "All sections already exist",
        sections: allSections
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

  // Team Members API
  app.get("/api/team-members", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const members = await db.query.teamMembers.findMany({
        where: eq(teamMembers.userId, req.user.id),
        orderBy: (members, { desc }) => [desc(members.createdAt)]
      });
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).send("Failed to fetch team members");
    }
  });

  app.post("/api/team-members", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const result = teamMemberSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }

      const [member] = await db.insert(teamMembers)
        .values({
          ...result.data,
          userId: req.user.id
        })
        .returning();
      res.json(member);
    } catch (error) {
      console.error("Error creating team member:", error);
      res.status(500).send("Failed to create team member");
    }
  });

  app.patch("/api/team-members/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const teamMemberId = parseInt(req.params.id);
      if (isNaN(teamMemberId)) return res.status(400).send("Invalid team member ID");

      const [existingMember] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, teamMemberId))
        .limit(1);

      if (!existingMember) return res.status(404).send("Team member not found");
      if (existingMember.userId !== req.user.id) return res.status(403).send("Unauthorized");

      const result = teamMemberSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }

      const [updatedMember] = await db
        .update(teamMembers)
        .set({ ...result.data, updatedAt: new Date() })
        .where(eq(teamMembers.id, teamMemberId))
        .returning();

      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).send("Failed to update team member");
    }
  });


  app.delete("/api/team-members/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const teamMemberId = parseInt(req.params.id);
      if (isNaN(teamMemberId)) return res.status(400).send("Invalid team member ID");

      const [existingMember] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, teamMemberId))
        .limit(1);

      if (!existingMember) return res.status(404).send("Team member not found");
      if (existingMember.userId !== req.user.id) return res.status(403).send("Unauthorized");

      await db.delete(teamMembers).where(eq(teamMembers.id, teamMemberId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting team member:", error);
      res.status(500).send("Failed to delete team member");
    }
  });

  // Positions API
  app.get("/api/positions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const openPositions = await db.query.positions.findMany({
        where: eq(positions.userId, req.user.id),
        orderBy: (positions, { desc }) => [desc(positions.createdAt)]
      });
      res.json(openPositions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      res.status(500).send("Failed to fetch positions");
    }
  });

  app.post("/api/positions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const result = positionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }

      const [position] = await db.insert(positions)
        .values({
          ...result.data,
          userId: req.user.id
        })
        .returning();
      res.json(position);
    } catch (error) {
      console.error("Error creating position:", error);
      res.status(500).send("Failed to create position");
    }
  });

  app.patch("/api/positions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const positionId = parseInt(req.params.id);
      if (isNaN(positionId)) return res.status(400).send("Invalid position ID");

      const [existingPosition] = await db
        .select()
        .from(positions)
        .where(eq(positions.id, positionId))
        .limit(1);

      if (!existingPosition) return res.status(404).send("Position not found");
      if (existingPosition.userId !== req.user.id) return res.status(403).send("Unauthorized");

      const result = positionSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }

      const [updatedPosition] = await db
        .update(positions)
        .set({ ...result.data, updatedAt: new Date() })
        .where(eq(positions.id, positionId))
        .returning();

      res.json(updatedPosition);
    } catch (error) {
      console.error("Error updating position:", error);
      res.status(500).send("Failed to update position");
    }
  });

  app.delete("/api/positions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const positionId = parseInt(req.params.id);
      if (isNaN(positionId)) return res.status(400).send("Invalid position ID");

      const [existingPosition] = await db
        .select()
        .from(positions)
        .where(eq(positions.id, positionId))
        .limit(1);

      if (!existingPosition) return res.status(404).send("Position not found");
      if (existingPosition.userId !== req.user.id) return res.status(403).send("Unauthorized");

      await db.delete(positions).where(eq(positions.id, positionId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting position:", error);
      res.status(500).send("Failed to delete position");
    }
  });

  // Candidates API
  app.get("/api/candidates", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const allCandidates = await db.query.candidates.findMany({
        where: eq(candidates.userId, req.user.id),
        orderBy: (candidates, { desc }) => [desc(candidates.createdAt)]
      });
      res.json(allCandidates);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).send("Failed to fetch candidates");
    }
  });

  app.post("/api/candidates", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const result = candidateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }

      // Verify position exists and belongs to user
      const [position] = await db
        .select()
        .from(positions)
        .where(eq(positions.id, result.data.positionId))
        .limit(1);

      if (!position) return res.status(404).send("Position not found");
      if (position.userId !== req.user.id) return res.status(403).send("Unauthorized");

      const [candidate] = await db.insert(candidates)
        .values({
          ...result.data,
          userId: req.user.id
        })
        .returning();
      res.json(candidate);
    } catch (error) {
      console.error("Error creating candidate:", error);
      res.status(500).send("Failed to create candidate");
    }
  });

  app.patch("/api/candidates/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) return res.status(400).send("Invalid candidate ID");

      const [existingCandidate] = await db
        .select()
        .from(candidates)
        .where(eq(candidates.id, candidateId))
        .limit(1);

      if (!existingCandidate) return res.status(404).send("Candidate not found");
      if (existingCandidate.userId !== req.user.id) return res.status(403).send("Unauthorized");

      const result = candidateSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }

      const [updatedCandidate] = await db
        .update(candidates)
        .set({ ...result.data, updatedAt: new Date() })
        .where(eq(candidates.id, candidateId))
        .returning();

      res.json(updatedCandidate);
    } catch (error) {
      console.error("Error updating candidate:", error);
      res.status(500).send("Failed to update candidate");
    }
  });

  app.delete("/api/candidates/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const candidateId = parseInt(req.params.id);
      if (isNaN(candidateId)) return res.status(400).send("Invalid candidate ID");

      const [existingCandidate] = await db
        .select()
        .from(candidates)
        .where(eq(candidates.id, candidateId))
        .limit(1);

      if (!existingCandidate) return res.status(404).send("Candidate not found");
      if (existingCandidate.userId !== req.user.id) return res.status(403).send("Unauthorized");

      await db.delete(candidates).where(eq(candidates.id, candidateId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting candidate:", error);
      res.status(500).send("Failed to delete candidate");
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
        db.delete(businessInfo).where(eq(businessInfo.userId, req.user.id)),
        db.delete(teamMembers).where(eq(teamMembers.userId, req.user.id)),
        db.delete(positions).where(eq(positions.userId, req.user.id)),
        db.delete(candidates).where(eq(candidates.userId, req.user.id))
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
        userData,
        userTeamMembers,
        userPositions,
        userCandidates
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
        }),
        db.query.teamMembers.findMany({
          where: eq(teamMembers.userId, req.user.id)
        }),
        db.query.positions.findMany({
          where: eq(positions.userId, req.user.id)
        }),
        db.query.candidates.findMany({
          where: eq(candidates.userId, req.user.id)
        })
      ]);

      const exportData = {
        user: userData,
        tasks: userTasks,
        chats: userChats,
        analytics: userAnalytics,
        businessInfo: userBusinessInfo,
        businessInfoHistory: userBusinessInfoHistory,
        teamMembers: userTeamMembers,
        positions: userPositions,
        candidates: userCandidates,
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
        case 'team_members':
          [result] = await db
            .update(teamMembers)
            .set(req.body)
            .where(eq(teamMembers.id, tableId))
            .returning();
          break;
        case 'positions':
          [result] = await db
            .update(positions)
            .set(req.body)
            .where(eq(positions.id, tableId))
            .returning();
          break;
        case 'candidates':
          [result] = await db
            .update(candidates)
            .set(req.body)
            .where(eq(candidates.id, tableId))
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
            db.delete(businessInfo).where(inArray(businessInfo.userId, ids)),
            db.delete(teamMembers).where(inArray(teamMembers.userId, ids)),
            db.delete(positions).where(inArray(positions.userId, ids)),
            db.delete(candidates).where(inArray(candidates.userId, ids))
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
        case 'team_members':
          result = await db
            .delete(teamMembers)
            .where(inArray(teamMembers.id, ids))
            .returning();
          break;
        case 'positions':
          result = await db
            .delete(positions)
            .where(inArray(positions.id, ids))
            .returning();
          break;
        case 'candidates':
          result = await db
            .delete(candidates)
            .where(inArray(candidates.id, ids))
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