import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupWebSocket } from "./websocket";
import { db } from "@db";
import { tasks, chatMessages, analytics, users, businessInfo, businessInfoHistory, teamMembers, positions, candidates, conversationSummaries, offerings, offeringFeatures, roadmapItems, offeringSchema, featureSchema, roadmapItemSchema, pricingTiers, pricingFeatures, packages, packageOfferings, pricingTierSchema, pricingFeatureSchema, packageSchema, packageOfferingSchema, taskSchema, updateTaskSchema } from "@db/schema";
import { eq, inArray, desc, and } from "drizzle-orm";
import { z } from "zod";
import { processAIMessage, type BusinessSection, businessSections } from "./services/ai";

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

      const result = updateTaskSchema.safeParse(req.body);
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

  // Add or update the business info GET route
  app.get("/api/business-info", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    try {
      // Get all business info records
      const businessInfoRecords = await db.query.businessInfo.findMany({
        where: eq(businessInfo.userId, req.user.id),
        orderBy: (info, { desc }) => [desc(info.updatedAt)]
      });

      // Group by section to get latest entries and preserve all fields
      const latestSectionMap = businessInfoRecords.reduce((acc, curr) => {
        const existingRecord = acc[curr.section];
        if (!existingRecord || new Date(existingRecord.updatedAt) < new Date(curr.updatedAt)) {
          // Ensure we preserve fields object even if it's empty
          acc[curr.section] = {
            ...curr,
            fields: curr.fields || {}
          };
        }
        return acc;
      }, {} as Record<string, typeof businessInfoRecords[0]>);

      // Convert map to array and sort by section
      const sections = Object.values(latestSectionMap).sort((a, b) =>
        a.section.localeCompare(b.section)
      );

      // Log the response for debugging
      console.log("Returning business info sections:",
        sections.map(s => ({
          section: s.section,
          hasFields: Object.keys(s.fields || {}).length > 0,
          hasContent: Boolean(s.content)
        }))
      );

      res.json(sections);
    } catch (error) {
      console.error("Error fetching business info:", error);
      res.status(500).send("Failed to fetch business info");
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

      // If summarization is needed and we have enough messages
      const shouldSummarize = req.body.metadata?.shouldSummarize;
      if (shouldSummarize) {
        const [lastSummary] = await db
          .select()
          .from(conversationSummaries)
          .where(eq(conversationSummaries.userId, req.user.id))
          .orderBy(desc(conversationSummaries.createdAt))
          .limit(1);

        const summaryStartId = lastSummary?.messageRange.lastMessageId || 0;
        await summarizeAndStoreConversation(
          req.user.id,
          summaryStartId,
          savedResponse.id
        );
      }

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

  // Remove existing candidates first when deleting a position
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

      // First delete any candidates associated with this position
      await db.delete(candidates).where(eq(candidates.positionId, positionId));
      // Then delete the position
      await db.delete(positions).where(eq(positions.id, positionId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting position:", error);
      res.status(500).send("Failed to delete position");
    }
  });

  // Candidates API
  app.get("/api/candidates", async (req, res) =>{
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try{
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

  // Fix PUT methods for updates
  app.put("/api/team-members/:id", async (req, res) => {
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
        .set({
          ...result.data,
          updatedAt: new Date(),
          skills: Array.isArray(result.data.skills) ? result.data.skills : result.data.skills?.split(',').map(s => s.trim()),
        })
        .where(eq(teamMembers.id, teamMemberId))
        .returning();

      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).send("Failed to update team member");
    }
  });

  app.put("/api/positions/:id", async (req, res) => {
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
        .set({
          ...result.data,
          updatedAt: new Date(),
          requirements: Array.isArray(result.data.requirements) ? result.data.requirements : result.data.requirements?.split(',').map(r => r.trim()),
          salary: result.data.minSalary && result.data.maxSalary ? {
            min: parseInt(result.data.minSalary),
            max: parseInt(result.data.maxSalary),
            currency: "USD"
          } : undefined
        })
        .where(eq(positions.id, positionId))
        .returning();

      res.json(updatedPosition);
    } catch (error) {
      console.error("Error updating position:", error);
      res.status(500).send("Failed to update position");
    }
  });

  app.put("/api/candidates/:id", async (req, res) => {
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
        .set({
          ...result.data,
          updatedAt: new Date(),
          skills: Array.isArray(result.data.skills) ? result.data.skills : result.data.skills?.split(',').map(s => s.trim()),
          experience: result.data.experienceYears ? {
            years: parseInt(result.data.experienceYears),
            highlights: result.data.highlights?.split(',').map(h => h.trim()) || []
          } : undefined,
          rating: result.data.rating ? parseInt(result.data.rating) : undefined
        })
        .where(eq(candidates.id, candidateId))
        .returning();

      res.json(updatedCandidate);
    } catch (error) {
      console.error("Error updating candidate:", error);
      res.status(500).send("Failed to update candidate");
    }
  });

  // Offerings API
  app.get("/api/offerings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const userOfferings = await db.query.offerings.findMany({
        where: eq(offerings.userId, req.user.id),
        orderBy: (offerings, { desc }) => [desc(offerings.createdAt)]
      });
      res.json(userOfferings);
    } catch (error) {
      console.error("Error fetching offerings:", error);
      res.status(500).send("Failed to fetch offerings");
    }
  });

  app.post("/api/offerings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const result = offeringSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }

      const [offering] = await db.insert(offerings)
        .values({
          ...result.data,
          userId: req.user.id
        })
        .returning();
      res.json(offering);
    } catch (error) {
      console.error("Error creating offering:", error);
      res.status(500).send("Failed to create offering");
    }
  });

  app.put("/api/offerings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const offeringId = parseInt(req.params.id);
      if (isNaN(offeringId)) return res.status(400).send("Invalid offering ID");

      const [existingOffering] = await db
        .select()
        .from(offerings)
        .where(eq(offerings.id, offeringId))
        .limit(1);

      if (!existingOffering) return res.status(404).send("Offering not found");
      if (existingOffering.userId !== req.user.id) return res.status(403).send("Unauthorized");

      const result = offeringSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }

      const [updatedOffering] = await db
        .update(offerings)
        .set({
          ...result.data,
          updatedAt: new Date()
        })
        .where(eq(offerings.id, offeringId))
        .returning();

      res.json(updatedOffering);
    } catch (error) {
      console.error("Error updating offering:", error);
      res.status(500).send("Failed to update offering");
    }
  });

  app.delete("/api/offerings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const offeringId = parseInt(req.params.id);
      if (isNaN(offeringId)) return res.status(400).send("Invalid offering ID");

      const [existingOffering] = await db
        .select()
        .from(offerings)
        .where(eq(offerings.id, offeringId))
        .limit(1);

      if (!existingOffering) return res.status(404).send("Offering not found");
      if (existingOffering.userId !== req.user.id) return res.status(403).send("Unauthorized");

      // First delete related features and roadmap items
      await db.delete(offeringFeatures).where(eq(offeringFeatures.offeringId, offeringId));
      await db.delete(roadmapItems).where(eq(roadmapItems.offeringId, offeringId));

      // Then delete the offering
      await db.delete(offerings).where(eq(offerings.id, offeringId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting offering:", error);
      res.status(500).send("Failed to delete offering");
    }
  });

  // Features API
  app.get("/api/offerings/:id/features", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const offeringId = parseInt(req.params.id);
      if (isNaN(offeringId)) return res.status(400).send("Invalid offering ID");

      const [offering] = await db
        .select()
        .from(offerings)
        .where(eq(offerings.id, offeringId))
        .limit(1);

      if (!offering) return res.status(404).send("Offering not found");
      if (offering.userId !== req.user.id) return res.status(403).send("Unauthorized");

      const features = await db.query.offeringFeatures.findMany({
        where: eq(offeringFeatures.offeringId, offeringId),
        orderBy: (features, { desc }) => [desc(features.createdAt)]
      });

      res.json(features);
    } catch (error) {
      console.error("Error fetching features:", error);
      res.status(500).send("Failed to fetch features");
    }
  });

  app.post("/api/offerings/:id/features", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const offeringId = parseInt(req.params.id);
      if (isNaN(offeringId)) return res.status(400).send("Invalid offering ID");

      const [offering] = await db
        .select()
        .from(offerings)
        .where(eq(offerings.id, offeringId))
        .limit(1);

      if (!offering) return res.status(404).send("Offering not found");
      if (offering.userId !== req.user.id) return res.status(403).send("Unauthorized");

      const result = featureSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }

      const [feature] = await db.insert(offeringFeatures)
        .values({
          ...result.data,
          offeringId
        })
        .returning();

      res.json(feature);
    } catch (error) {
      console.error("Error creating feature:", error);
      res.status(500).send("Failed to create feature");
    }
  });

  // Roadmap API
  app.get("/api/offerings/:id/roadmap", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const offeringId = parseInt(req.params.id);
      if (isNaN(offeringId)) return res.status(400).send("Invalid offering ID");

      const [offering] = await db
        .select()
        .from(offerings)
        .where(eq(offerings.id, offeringId))
        .limit(1);

      if (!offering) return res.status(404).send("Offering not found");
      if (offering.userId !== req.user.id) return res.status(403).send("Unauthorized");

      const roadmap = await db.query.roadmapItems.findMany({
        where: eq(roadmapItems.offeringId, offeringId),
        orderBy: (items, { desc }) => [desc(items.createdAt)]
      });

      res.json(roadmap);
    } catch (error) {
      console.error("Error fetching roadmap:", error);
      res.status(500).send("Failed to fetch roadmap");
    }
  });

  app.post("/api/offerings/:id/roadmap", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const offeringId = parseInt(req.params.id);
      if (isNaN(offeringId)) return res.status(400).send("Invalid offering ID");

      const [offering] = await db
        .select()
        .from(offerings)
        .where(eq(offerings.id, offeringId))
        .limit(1);

      if (!offering) return res.status(404).send("Offering not found");
      if (offering.userId !== req.user.id) return res.status(403).send("Unauthorized");

      const result = roadmapItemSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }

      const [roadmapItem] = await db.insert(roadmapItems)
        .values({
          ...result.data,
          offeringId
        })
        .returning();

      res.json(roadmapItem);
    } catch (error) {
      console.error("Error creating roadmap item:", error);
      res.status(500).send("Failed to create roadmap item");
    }
  });

  // Pricing Tiers API
  app.get("/api/pricing-tiers", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const tiers = await db.query.pricingTiers.findMany({
        where: eq(pricingTiers.userId, req.user.id),
        with: {
          features: true
        }
      });
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching pricing tiers:", error);
      res.status(500).send("Failed to fetch pricing tiers");
    }
  });

  app.post("/api/pricing-tiers", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const result = pricingTierSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }

      // Verify offering exists and belongs to user
      const [offering] = await db
        .select()
        .from(offerings)
        .where(eq(offerings.id, req.body.offeringId))
        .limit(1);

      if (!offering) return res.status(404).send("Offering not found");
      if (offering.userId !== req.user.id) return res.status(403).send("Unauthorized");

      const [tier] = await db.insert(pricingTiers)
        .values({
          ...result.data,
          userId: req.user.id,
          offeringId: offering.id
        })
        .returning();

      res.json(tier);
    } catch (error) {
      console.error("Error creating pricing tier:", error);
      res.status(500).send("Failed to create pricing tier");
    }
  });

  app.patch("/api/pricing-tiers/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const tierId = parseInt(req.params.id);
      if (isNaN(tierId)) return res.status(400).send("Invalid pricing tier ID");

      const [existingTier] = await db
        .select()
        .from(pricingTiers)
        .where(eq(pricingTiers.id, tierId))
        .limit(1);

      if (!existingTier) return res.status(404).send("Pricing tier not found");
      if (existingTier.userId !== req.user.id) return res.status(403).send("Unauthorized");

      const result = pricingTierSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }

      const [updatedTier] = await db
        .update(pricingTiers)
        .set({
          ...result.data,
          updatedAt: new Date()
        })
        .where(eq(pricingTiers.id, tierId))
        .returning();

      res.json(updatedTier);
    } catch (error) {
      console.error("Error updating pricing tier:", error);
      res.status(500).send("Failed to update pricing tier");
    }
  });

  app.delete("/api/pricing-tiers/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");

    try {
      const tierId = parseInt(req.params.id);
      if (isNaN(tierId)) return res.status(400).send("Invalid pricing tier ID");

      const [existingTier] = await db
        .select()
        .from(pricingTiers)
        .where(eq(pricingTiers.id, tierId))
        .limit(1);

      if (!existingTier) return res.status(404).send("Pricing tier not found");
      if (existingTier.userId !== req.user.id) return res.status(403).send("Unauthorized");

      // First delete associated features
      await db.delete(pricingFeatures).where(eq(pricingFeatures.tierId, tierId));
      // Then delete the tier
      await db.delete(pricingTiers).where(eq(pricingTiers.id, tierId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting pricing tier:", error);
      res.status(500).send("Failed to delete pricing tier");
    }
  });

  // Pricing Features API
  app.get("/api/pricing-tiers/:tierId/features", async (req, res) => {
    if (!req.isAuthenticated) return res.status(401).send("Not authenticated");
    
    try {
      const tierId = parseInt(req.params.tierId);
      if (isNaN(tierId)) return res.status(400).send("Invalid pricing tier ID");
      
      const [tier] = await db
        .select()
        .from(pricingTiers)
        .where(eq(pricingTiers.id, tierId))
        .limit(1);
      
      if (!tier) return res.status(404).send("Pricing tier not found");
      if (tier.userId !== req.user.id) return res.status(403).send("Unauthorized");
      
      const features = await db.query.pricingFeatures.findMany({
        where: eq(pricingFeatures.tierId, tierId),
        orderBy: (features, { asc }) => [asc(features.sortOrder)]
      });
      res.json(features);
    } catch (error) {
      console.error("Error fetching pricing features:", error);
      res.status(500).send("Failed to fetch pricing features");
    }
  });
  
  app.post("/api/pricing-tiers/:tierId/features", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");
    
    try {
      const tierId = parseInt(req.params.tierId);
      if (isNaN(tierId)) return res.status(400).send("Invalid pricing tier ID");
      
      const [tier] = await db
        .select()
        .from(pricingTiers)
        .where(eq(pricingTiers.id, tierId))
        .limit(1);
      
      if (!tier) return res.status(404).send("Pricing tier not found");
      if (tier.userId !== req.user.id) return res.status(403).send("Unauthorized");
      
      const result = pricingFeatureSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }
      
      const [feature] = await db.insert(pricingFeatures)
        .values({
          ...result.data,
          tierId
        })
        .returning();
      
      res.json(feature);
    } catch (error) {
      console.error("Error creating pricing feature:", error);
      res.status(500).send("Failed to create pricing feature");
    }
  });
  
  // Packages API
  app.get("/api/packages", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");
    
    try {
      const userPackages = await db.query.packages.findMany({
        where: eq(packages.userId, req.user.id),
        with: {
          packageOfferings: {
            with: {
              offering: true,
              tier: true
            }
          }
        }
      });
      res.json(userPackages);
    } catch (error) {
      console.error("Error fetching packages:", error);
      res.status(500).send("Failed to fetch packages");
    }
  });
  
  app.post("/api/packages", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");
    
    try {
      const result = packageSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }
      
      const [pkg] = await db.insert(packages)
        .values({
          ...result.data,
          userId: req.user.id
        })
        .returning();
      
      res.json(pkg);
    } catch (error) {
      console.error("Error creating package:", error);
      res.status(500).send("Failed to create package");
    }
  });
  
  app.patch("/api/packages/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");
    
    try {
      const packageId = parseInt(req.params.id);
      if (isNaN(packageId)) return res.status(400).send("Invalid package ID");
      
      const [existingPackage] = await db
        .select()
        .from(packages)
        .where(eq(packages.id, packageId))
        .limit(1);
      
      if (!existingPackage) return res.status(404).send("Package not found");
      if (existingPackage.userId !== req.user.id) return res.status(403).send("Unauthorized");
      
      const result = packageSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }
      
      const [updatedPackage] = await db
        .update(packages)
        .set({
          ...result.data,
          updatedAt: new Date()
        })
        .where(eq(packages.id, packageId))
        .returning();
      
      res.json(updatedPackage);
    } catch (error) {
      console.error("Error updating package:", error);
      res.status(500).send("Failed to update package");
    }
  });
  
  app.delete("/api/packages/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");
    
    try {
      const packageId = parseInt(req.params.id);
      if (isNaN(packageId)) return res.status(400).send("Invalid package ID");
      
      const [existingPackage] = await db
        .select()
        .from(packages)
        .where(eq(packages.id, packageId))
        .limit(1);
      
      if (!existingPackage) return res.status(404).send("Package not found");
      if (existingPackage.userId !== req.user.id) return res.status(403).send("Unauthorized");
      
      // First delete package offerings
      await db.delete(packageOfferings).where(eq(packageOfferings.packageId, packageId));
      // Then delete the package
      await db.delete(packages).where(eq(packages.id, packageId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting package:", error);
      res.status(500).send("Failed to delete package");
    }
  });
  
  // Package Offerings API
  app.post("/api/packages/:packageId/offerings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");
    
    try {
      const packageId = parseInt(req.params.packageId);
      if (isNaN(packageId)) return res.status(400).send("Invalid package ID");
      
      const [pkg] = await db
        .select()
        .from(packages)
        .where(eq(packages.id, packageId))
        .limit(1);
      
      if (!pkg) return res.status(404).send("Package not found");
      if (pkg.userId !== req.user.id) return res.status(403).send("Unauthorized");
      
      const result = packageOfferingSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(
          "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        );
      }
      
      // Verify offering exists and belongs to user
      const [offering] = await db
        .select()
        .from(offerings)
        .where(eq(offerings.id, result.data.offeringId))
        .limit(1);
      
      if (!offering) return res.status(404).send("Offering not found");
      if (offering.userId !== req.user.id) return res.status(403).send("Unauthorized");
      
      // If tier is specified, verify it exists and belongs to the offering
      if (result.data.tierId) {
        const [tier] = await db
          .select()
          .from(pricingTiers)
          .where(eq(pricingTiers.id, result.data.tierId))
          .limit(1);
        
        if (!tier) return res.status(404).send("Pricing tier not found");
        if (tier.offeringId !== offering.id) return res.status(400).send("Pricing tier does not belong to the offering");
      }
      
      const [packageOffering] = await db.insert(packageOfferings)
        .values({
          ...result.data,
          packageId
        })
        .returning();
      
      res.json(packageOffering);
    } catch (error) {
      console.error("Error adding offering to package:", error);
      res.status(500).send("Failed to add offering to package");
    }
  });
  
  app.delete("/api/packages/:packageId/offerings/:offeringId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Not authenticated");
    
    try {
      const packageId = parseInt(req.params.packageId);
      const offeringId = parseInt(req.params.offeringId);
      if (isNaN(packageId) || isNaN(offeringId)) return res.status(400).send("Invalid IDs");
      
      const [pkg] = await db
        .select()
        .from(packages)
        .where(eq(packages.id, packageId))
        .limit(1);
      
      if (!pkg) return res.status(404).send("Package not found");
      if (pkg.userId !== req.user.id) return res.status(403).send("Unauthorized");
      
      await db.delete(packageOfferings)
        .where(and(
          eq(packageOfferings.packageId, packageId),
          eq(packageOfferings.offeringId, offeringId)
        ));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing offering from package:", error);
      res.status(500).send("Failed to remove offering from package");
    }
  });
  
  const httpServer = createServer(app);
  setupWebSocket(httpServer);
  
  return httpServer;
}