import Anthropic from '@anthropic-ai/sdk';
import { db } from '@db';
import { tasks, chatMessages, analytics, users, businessInfo, businessInfoHistory, teamMembers, positions, candidates, conversationSummaries } from '@db/schema';
import { eq, desc, and, gt } from 'drizzle-orm';

// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type BusinessSection = {
  section: string;
  fields: {
    [key: string]: {
      type: "number" | "date" | "currency" | "text" | "percentage" | "list";
      label: string;
      description?: string;
      options?: string[];
    };
  };
};

type TaskFunctionCall = {
  name: "create_task";
  args: {
    title: string;
    description?: string;
    status?: "todo" | "in_progress" | "done";
  };
};

type UpdateBusinessFieldCall = {
  name: "update_business_field";
  args: {
    section: string;
    field: string;
    value: string | number | string[];
    type: "text" | "number" | "currency" | "percentage" | "date" | "list";
  };
};

type TeamMemberCall = {
  name: "manage_team_member";
  args: {
    action: "create" | "update" | "delete";
    id?: number;
    data?: {
      name?: string;
      role?: string;
      department?: string;
      email?: string;
      bio?: string;
      skills?: string[];
      highlights?: string[];
      imageUrl?: string;
    };
  };
};

type PositionCall = {
  name: "manage_position";
  args: {
    action: "create" | "update" | "delete";
    id?: number;
    data?: {
      title?: string;
      department?: string;
      description?: string;
      requirements?: string[];
      salary?: {
        min: number;
        max: number;
        currency: string;
      };
      status?: string;
      priority?: string;
      location?: string;
      remoteAllowed?: boolean;
    };
  };
};

type CandidateCall = {
  name: "manage_candidate";
  args: {
    action: "create" | "update" | "delete";
    id?: number;
    data?: {
      name?: string;
      email?: string;
      positionId?: number;
      status?: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
      rating?: number;
      notes?: string;
      resumeUrl?: string;
      skills?: string[];
      experience?: {
        years: number;
        highlights: string[];
      };
    };
  };
};

type AnalyticsCall = {
  name: "update_analytics";
  args: {
    metric: string;
    value: number;
    period?: string;
    category?: string;
  };
};

type QueryDataCall = {
  name: "query_data";
  args: {
    table: "team_members" | "positions" | "candidates" | "tasks" | "analytics";
    filters?: Record<string, any>;
    limit?: number;
  };
};

async function executeTaskFunction(userId: number, functionCall: TaskFunctionCall) {
  try {
    console.log("Creating task with data:", functionCall.args);

    // Validate required fields
    if (!functionCall.args.title) {
      throw new Error("Task title is required");
    }

    // Clean and sanitize the input
    const title = functionCall.args.title.trim();
    const description = functionCall.args.description 
      ? functionCall.args.description.replace(/[\u0000-\u001F]+/g, '\n').trim()
      : '';

    // Ensure status is one of the valid options
    const validStatus = ["todo", "in_progress", "done"];
    const status = functionCall.args.status && validStatus.includes(functionCall.args.status) 
      ? functionCall.args.status 
      : "todo";

    // Create the task
    const [task] = await db.insert(tasks)
      .values({
        userId,
        title,
        description,
        status,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    console.log("Successfully created task:", task);
    return task;
  } catch (error) {
    console.error("Error executing task function:", error);
    console.error("Function call data:", JSON.stringify(functionCall, null, 2));

    // Provide a more descriptive error message
    const errorMessage = error instanceof Error 
      ? `Failed to create task: ${error.message}. Please ensure the task description doesn't contain invalid characters.`
      : "Unknown error occurred while creating the task";

    throw new Error(errorMessage);
  }
}

async function executeTeamMemberOperation(userId: number, functionCall: TeamMemberCall) {
  try {
    const { action, id, data } = functionCall.args;

    if (action === "create") {
      if (!data?.name || !data?.role) {
        throw new Error("Name and role are required to create a team member");
      }

      const [teamMember] = await db.insert(teamMembers)
        .values({
          name: data.name,
          role: data.role,
          department: data.department,
          email: data.email,
          startDate: new Date(),
          bio: data.bio,
          skills: data.skills || [],
          status: 'active',
          userId
        })
        .returning();

      return { action: "created", data: teamMember };
    } else if (action === "update") {
      if (!id) throw new Error("ID is required for update");

      const updateData: any = { updatedAt: new Date() };
      if (data?.name !== undefined) updateData.name = data.name;
      if (data?.role !== undefined) updateData.role = data.role;
      if (data?.department !== undefined) updateData.department = data.department;
      if (data?.email !== undefined) updateData.email = data.email;
      if (data?.bio !== undefined) updateData.bio = data.bio;
      if (data?.skills !== undefined) updateData.skills = data.skills;
      if (data?.department !== undefined) updateData.department = data.department;

      const [updated] = await db.update(teamMembers)
        .set(updateData)
        .where(and(eq(teamMembers.id, id), eq(teamMembers.userId, userId)))
        .returning();

      return { action: "updated", data: updated };
    } else if (action === "delete") {
      if (!id) throw new Error("ID is required for delete");

      await db.delete(teamMembers)
        .where(and(eq(teamMembers.id, id), eq(teamMembers.userId, userId)));

      return { action: "deleted", data: { id } };
    }
  } catch (error) {
    console.error("Error executing team member operation:", error);
    throw new Error(`Failed to ${functionCall.args.action} team member: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

async function executePositionOperation(userId: number, functionCall: PositionCall) {
  try {
    const { action, id, data } = functionCall.args;

    if (action === "create") {
      if (!data?.title || !data?.department) {
        throw new Error("Title and department are required to create a position");
      }

      const [position] = await db.insert(positions)
        .values({
          title: data.title,
          department: data.department,
          description: data.description || '',
          requirements: data.requirements || [],
          status: data.status || "open",
          priority: data.priority || "medium",
          location: data.location,
          remoteAllowed: data.remoteAllowed || false,
          salary: data.salary,
          userId
        })
        .returning();

      return { action: "created", data: position };
    } else if (action === "update") {
      if (!id) throw new Error("ID is required for update");

      const updateData: any = { updatedAt: new Date() };
      if (data?.title !== undefined) updateData.title = data.title;
      if (data?.department !== undefined) updateData.department = data.department;
      if (data?.status !== undefined) updateData.status = data.status;
      if (data?.priority !== undefined) updateData.priority = data.priority;
      if (data?.requirements !== undefined) updateData.requirements = data.requirements;
      if (data?.salary !== undefined) updateData.salary = data.salary;
      if (data?.location !== undefined) updateData.location = data.location;
      if (data?.remoteAllowed !== undefined) updateData.remoteAllowed = data.remoteAllowed;
      if (data?.description !== undefined) updateData.description = data.description;

      const [updated] = await db.update(positions)
        .set(updateData)
        .where(and(eq(positions.id, id), eq(positions.userId, userId)))
        .returning();

      return { action: "updated", data: updated };
    } else if (action === "delete") {
      if (!id) throw new Error("ID is required for delete");

      await db.delete(positions)
        .where(and(eq(positions.id, id), eq(positions.userId, userId)));

      return { action: "deleted", data: { id } };
    }
  } catch (error) {
    console.error("Error executing position operation:", error);
    throw new Error(`Failed to ${functionCall.args.action} position: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

async function executeCandidateOperation(userId: number, functionCall: CandidateCall) {
  try {
    const { action, id, data } = functionCall.args;

    if (action === "create") {
      if (!data?.name || !data?.email || !data?.positionId) {
        throw new Error("Name, email, and positionId are required to create a candidate");
      }

      const [candidate] = await db.insert(candidates)
        .values({
          name: data.name,
          email: data.email,
          positionId: data.positionId,
          status: data.status || "applied",
          rating: data.rating,
          notes: data.notes,
          resumeUrl: data.resumeUrl,
          skills: data.skills || [],
          experience: data.experience || { years: 0, highlights: [] },
          userId
        })
        .returning();

      return { action: "created", data: candidate };
    } else if (action === "update") {
      if (!id) throw new Error("ID is required for update");

      const updateData: any = { updatedAt: new Date() };
      if (data?.name !== undefined) updateData.name = data.name;
      if (data?.email !== undefined) updateData.email = data.email;
      if (data?.positionId !== undefined) updateData.positionId = data.positionId;
      if (data?.status !== undefined) updateData.status = data.status;
      if (data?.rating !== undefined) updateData.rating = data.rating;
      if (data?.notes !== undefined) updateData.notes = data.notes;
      if (data?.resumeUrl !== undefined) updateData.resumeUrl = data.resumeUrl;
      if (data?.skills !== undefined) updateData.skills = data.skills;
      if (data?.experience !== undefined) updateData.experience = data.experience;

      const [updated] = await db.update(candidates)
        .set(updateData)
        .where(and(eq(candidates.id, id), eq(candidates.userId, userId)))
        .returning();

      return { action: "updated", data: updated };
    } else if (action === "delete") {
      if (!id) throw new Error("ID is required for delete");

      await db.delete(candidates)
        .where(and(eq(candidates.id, id), eq(candidates.userId, userId)));

      return { action: "deleted", data: { id } };
    }
  } catch (error) {
    console.error("Error executing candidate operation:", error);
    throw new Error(`Failed to ${functionCall.args.action} candidate: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

async function executeAnalyticsUpdate(userId: number, functionCall: AnalyticsCall) {
  try {
    const { metric, value, period, category } = functionCall.args;

    const [analytic] = await db.insert(analytics)
      .values({
        userId,
        type: category || 'business',
        data: {
          metric,
          value,
          period: period || new Date().toISOString().split('T')[0],
          category: category || 'business'
        }
      })
      .returning();

    return analytic;
  } catch (error) {
    console.error("Error updating analytics:", error);
    throw new Error("Failed to update analytics");
  }
}

async function executeDataQuery(userId: number, functionCall: QueryDataCall) {
  try {
    const { table, filters, limit } = functionCall.args;

    let query;
    switch (table) {
      case "team_members":
        query = db.select().from(teamMembers).where(eq(teamMembers.userId, userId));
        break;
      case "positions":
        query = db.select().from(positions).where(eq(positions.userId, userId));
        break;
      case "candidates":
        query = db.select().from(candidates).where(eq(candidates.userId, userId));
        break;
      case "tasks":
        query = db.select().from(tasks).where(eq(tasks.userId, userId));
        break;
      case "analytics":
        query = db.select().from(analytics).where(eq(analytics.userId, userId));
        break;
      default:
        throw new Error(`Unknown table: ${table}`);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const results = await query;
    return results;
  } catch (error) {
    console.error("Error querying data:", error);
    throw new Error("Failed to query data");
  }
}

async function executeBusinessFieldUpdate(userId: number, functionCall: UpdateBusinessFieldCall) {
  try {
    const { args } = functionCall;

    // Find the business info section
    const [sectionInfo] = await db
      .select()
      .from(businessInfo)
      .where(
        and(
          eq(businessInfo.userId, userId),
          eq(businessInfo.section, args.section)
        )
      )
      .orderBy(desc(businessInfo.updatedAt))
      .limit(1);

    if (!sectionInfo) {
      throw new Error(`Section ${args.section} not found`);
    }

    // Save current state to history
    await db.insert(businessInfoHistory).values({
      businessInfoId: sectionInfo.id,
      userId: userId,
      content: sectionInfo.content,
      fields: sectionInfo.fields || {},
      updatedBy: 'ai',
      reason: `AI update of field: ${args.field}`,
      metadata: { source: 'ai-update' }
    });

    // Update the field
    const updatedFields = {
      ...(sectionInfo.fields || {}),
      [args.field]: {
        value: args.value,
        type: args.type,
        updatedAt: new Date().toISOString(),
        updatedBy: 'ai' as const
      }
    };

    // Update the business info
    const [updatedInfo] = await db
      .update(businessInfo)
      .set({
        fields: updatedFields,
        updatedAt: new Date()
      })
      .where(eq(businessInfo.id, sectionInfo.id))
      .returning();

    return updatedInfo;
  } catch (error) {
    console.error("Error executing business field update:", error);
    throw new Error("Failed to update business field");
  }
}

export async function processAIMessage(
  userId: number,
  content: string,
  businessContext?: {
    name: string;
    description: string;
    objectives: string[];
    recentMessages: { role: string; content: string; }[];
  }
) {
  try {
    // Fetch user's tasks
    const userTasks = await db.query.tasks.findMany({
      where: eq(tasks.userId, userId),
      orderBy: [desc(tasks.updatedAt)]
    });

    // Fetch team members
    const userTeamMembers = await db.query.teamMembers.findMany({
      where: eq(teamMembers.userId, userId),
      orderBy: [desc(teamMembers.updatedAt)]
    });

    // Fetch positions
    const userPositions = await db.query.positions.findMany({
      where: eq(positions.userId, userId),
      orderBy: [desc(positions.updatedAt)]
    });

    // Fetch candidates
    const userCandidates = await db.query.candidates.findMany({
      where: eq(candidates.userId, userId),
      orderBy: [desc(candidates.updatedAt)]
    });

    // Fetch recent analytics
    const recentAnalytics = await db.query.analytics.findMany({
      where: eq(analytics.userId, userId),
      orderBy: [desc(analytics.createdAt)],
      limit: 10
    });

    // Fetch all business info sections
    const businessSections = await db
      .select()
      .from(businessInfo)
      .where(eq(businessInfo.userId, userId))
      .orderBy(desc(businessInfo.updatedAt));

    // Group sections by their type to get the latest version of each
    const latestSections = businessSections.reduce((acc, curr) => {
      if (!acc[curr.section] || new Date(acc[curr.section].updatedAt) < new Date(curr.updatedAt)) {
        acc[curr.section] = curr;
      }
      return acc;
    }, {} as Record<string, typeof businessSections[0]>);

    // Format business data for context
    const businessData = Object.values(latestSections)
      .map(section => ({
        section: section.section,
        content: section.content,
        fields: section.fields || {}
      }))
      .sort((a, b) => a.section.localeCompare(b.section));

    // Format tasks for context
    const tasksContext = userTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || "",
      status: task.status,
      updatedAt: task.updatedAt.toISOString()
    }));

    // Create a comprehensive context message
    const contextMessage = `You are an AI CEO assistant. ${
      businessContext 
        ? `You are helping manage ${businessContext.name}. The business description is: ${businessContext.description}. Key objectives: ${businessContext.objectives.join(", ")}.`
        : "You are helping manage a business."
    }

Current Business Information:
${businessData.map(section => `
${section.section}:
${section.content}

Current Fields:
${Object.entries(section.fields)
  .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
  .join('\n')}
`).join('\n')}

Current Team (${userTeamMembers.length} members):
${userTeamMembers.slice(0, 5).map(member => 
  `- ${member.name} - ${member.role} (${member.department})`
).join("\n")}${userTeamMembers.length > 5 ? `\n... and ${userTeamMembers.length - 5} more` : ''}

Open Positions (${userPositions.filter(p => p.status === 'open').length}):
${userPositions.filter(p => p.status === 'open').slice(0, 5).map(pos => 
  `- ${pos.title} - ${pos.department} (${pos.priority} priority)`
).join("\n")}

Candidate Pipeline (${userCandidates.length} total):
${Object.entries(userCandidates.reduce((acc, c) => {
  acc[c.status] = (acc[c.status] || 0) + 1;
  return acc;
}, {} as Record<string, number>)).map(([status, count]) => `- ${status}: ${count}`).join("\n")}

Current Tasks (${tasksContext.length}):
${tasksContext.slice(0, 5).map(task => 
  `- ${task.title} (${task.status})`
).join("\n")}${tasksContext.length > 5 ? `\n... and ${tasksContext.length - 5} more` : ''}

You have access to these tools:
1. create_task - Create new tasks
2. update_business_field - Update business information fields
3. manage_team_member - Create, update, or delete team members
4. manage_position - Create, update, or delete job positions
5. manage_candidate - Create, update, or delete candidates
6. update_analytics - Record analytics metrics
7. query_data - Query any data table

Use the appropriate tools to help manage the business effectively.`;

    const messages = [
      { role: "user" as const, content: contextMessage },
      ...(businessContext?.recentMessages
        ?.filter(msg => msg.content?.trim())
        ?.map(msg => ({
          role: msg.role === "assistant" ? "assistant" as const : "user" as const,
          content: msg.content
        })) || []),
      { role: "user" as const, content }
    ];

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages,
      system: `You are a business management AI assistant. Help users manage their business tasks, team, and information effectively. When users ask you to add team members, update compensation, or manage any business data, use the appropriate tools to make these changes.`,
      tools: [
        {
          name: "create_task",
          description: "Create a new task for the user",
          input_schema: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Simple task title without special characters"
              },
              description: {
                type: "string",
                description: "Task description with proper formatting"
              },
              status: {
                type: "string",
                enum: ["todo", "in_progress", "done"],
                description: "Task status"
              }
            },
            required: ["title"]
          }
        },
        {
          name: "update_business_field",
          description: "Update a business information field",
          input_schema: {
            type: "object",
            properties: {
              section: {
                type: "string",
                description: "Business section name (e.g., 'Human Capital', 'Financial Overview')"
              },
              field: {
                type: "string",
                description: "Field name to update"
              },
              value: {
                type: ["string", "number", "array"],
                description: "New value for the field"
              },
              type: {
                type: "string",
                enum: ["text", "number", "currency", "percentage", "date", "list"],
                description: "Field type"
              }
            },
            required: ["section", "field", "value", "type"]
          }
        },
        {
          name: "manage_team_member",
          description: "Create, update, or delete team members",
          input_schema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["create", "update", "delete"],
                description: "Action to perform"
              },
              id: {
                type: "number",
                description: "Team member ID (required for update/delete)"
              },
              data: {
                type: "object",
                description: "Team member data",
                properties: {
                  name: { type: "string" },
                  role: { type: "string" },
                  department: { type: "string" },
                  email: { type: "string" },
                  bio: { type: "string" },
                  skills: { type: "array", items: { type: "string" } },
                  highlights: { type: "array", items: { type: "string" } },
                  imageUrl: { type: "string" }
                }
              }
            },
            required: ["action"]
          }
        },
        {
          name: "manage_position",
          description: "Create, update, or delete job positions",
          input_schema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["create", "update", "delete"],
                description: "Action to perform"
              },
              id: {
                type: "number",
                description: "Position ID (required for update/delete)"
              },
              data: {
                type: "object",
                description: "Position data",
                properties: {
                  title: { type: "string" },
                  department: { type: "string" },
                  status: { type: "string", enum: ["open", "closed", "on_hold"] },
                  priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                  requirements: { type: "array", items: { type: "string" } },
                  compensation: { type: "string" },
                  location: { type: "string" },
                  type: { type: "string", enum: ["full_time", "part_time", "contract", "internship"] },
                  description: { type: "string" }
                }
              }
            },
            required: ["action"]
          }
        },
        {
          name: "manage_candidate",
          description: "Create, update, or delete candidates",
          input_schema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["create", "update", "delete"],
                description: "Action to perform"
              },
              id: {
                type: "number",
                description: "Candidate ID (required for update/delete)"
              },
              data: {
                type: "object",
                description: "Candidate data",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  positionId: { type: "number" },
                  status: { type: "string", enum: ["new", "screening", "interview", "offer", "hired", "rejected"] },
                  rating: { type: "number" },
                  notes: { type: "string" },
                  resumeUrl: { type: "string" },
                  skills: { type: "array", items: { type: "string" } }
                }
              }
            },
            required: ["action"]
          }
        },
        {
          name: "update_analytics",
          description: "Record analytics metrics",
          input_schema: {
            type: "object",
            properties: {
              metric: {
                type: "string",
                description: "Metric name (e.g., 'revenue', 'user_count', 'conversion_rate')"
              },
              value: {
                type: "number",
                description: "Metric value"
              },
              period: {
                type: "string",
                description: "Time period (e.g., '2024-01-01')"
              },
              category: {
                type: "string",
                description: "Metric category (e.g., 'financial', 'operational', 'hr')"
              }
            },
            required: ["metric", "value"]
          }
        },
        {
          name: "query_data",
          description: "Query data from various tables",
          input_schema: {
            type: "object",
            properties: {
              table: {
                type: "string",
                enum: ["team_members", "positions", "candidates", "tasks", "analytics"],
                description: "Table to query"
              },
              filters: {
                type: "object",
                description: "Filter criteria"
              },
              limit: {
                type: "number",
                description: "Maximum number of results"
              }
            },
            required: ["table"]
          }
        }
      ]
    });

    let createdTask = null;
    let updatedField = null;
    let teamMemberResult = null;
    let positionResult = null;
    let candidateResult = null;
    let analyticsResult = null;
    let queryResult = null;
    let responseContent = '';

    // Handle text content
    for (const content of response.content) {
      if (content.type === 'text') {
        responseContent += content.text;
      } else if (content.type === 'tool_use') {
        // Handle tool calls
        try {
          console.log(`Executing ${content.name} with parameters:`, content.input);
          
          if (content.name === 'create_task') {
            createdTask = await executeTaskFunction(userId, {
              name: 'create_task',
              args: content.input as any
            });
            console.log("Task created successfully:", createdTask);
          } else if (content.name === 'update_business_field') {
            updatedField = await executeBusinessFieldUpdate(userId, {
              name: 'update_business_field',
              args: content.input as any
            });
            console.log("Business field updated successfully:", updatedField);
          } else if (content.name === 'manage_team_member') {
            teamMemberResult = await executeTeamMemberOperation(userId, {
              name: 'manage_team_member',
              args: content.input as any
            });
            console.log("Team member operation completed:", teamMemberResult);
          } else if (content.name === 'manage_position') {
            positionResult = await executePositionOperation(userId, {
              name: 'manage_position',
              args: content.input as any
            });
            console.log("Position operation completed:", positionResult);
          } else if (content.name === 'manage_candidate') {
            candidateResult = await executeCandidateOperation(userId, {
              name: 'manage_candidate',
              args: content.input as any
            });
            console.log("Candidate operation completed:", candidateResult);
          } else if (content.name === 'update_analytics') {
            analyticsResult = await executeAnalyticsUpdate(userId, {
              name: 'update_analytics',
              args: content.input as any
            });
            console.log("Analytics updated successfully:", analyticsResult);
          } else if (content.name === 'query_data') {
            queryResult = await executeDataQuery(userId, {
              name: 'query_data',
              args: content.input as any
            });
            console.log("Query executed successfully:", queryResult);
          }
        } catch (error) {
          console.error(`Error processing ${content.name} command:`, error);
          responseContent += `\n\nI encountered an error while executing ${content.name}: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
      }
    }

    // Add execution results to response
    if (createdTask) {
      responseContent += `\n\nI've created a new task for you: "${createdTask.title}" with status "${createdTask.status}"`;
    }
    if (updatedField) {
      responseContent += `\n\nI've updated the ${updatedField.section} information.`;
    }
    if (teamMemberResult) {
      const action = teamMemberResult.action;
      const member = teamMemberResult.data;
      if (action === 'created' && 'name' in member) {
        responseContent += `\n\nI've added ${member.name} to the team as ${member.role} in the ${member.department} department.`;
      } else if (action === 'updated' && 'name' in member) {
        responseContent += `\n\nI've updated ${member.name}'s information.`;
      } else if (action === 'deleted') {
        responseContent += `\n\nI've removed the team member from the system.`;
      }
    }
    if (positionResult) {
      const action = positionResult.action;
      const position = positionResult.data;
      if (action === 'created' && 'title' in position) {
        responseContent += `\n\nI've created a new ${position.title} position in the ${position.department} department.`;
      } else if (action === 'updated' && 'title' in position) {
        responseContent += `\n\nI've updated the ${position.title} position.`;
      } else if (action === 'deleted') {
        responseContent += `\n\nI've removed the position from the system.`;
      }
    }
    if (candidateResult) {
      const action = candidateResult.action;
      const candidate = candidateResult.data;
      if (action === 'created' && 'name' in candidate) {
        responseContent += `\n\nI've added ${candidate.name} as a candidate.`;
      } else if (action === 'updated' && 'name' in candidate) {
        responseContent += `\n\nI've updated ${candidate.name}'s information.`;
      } else if (action === 'deleted') {
        responseContent += `\n\nI've removed the candidate from the system.`;
      }
    }
    if (analyticsResult) {
      responseContent += `\n\nI've recorded the analytics data successfully.`;
    }
    if (queryResult && queryResult.length > 0) {
      responseContent += `\n\nI found ${queryResult.length} results from your query.`;
    }

    const suggestedActions = extractSuggestedActions(responseContent, tasksContext);

    return {
      content: responseContent.trim(),
      suggestedActions
    };
  } catch (error) {
    console.error("Error processing AI message:", error);
    throw new Error("Failed to process message: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

function extractSuggestedActions(
  content: string,
  tasks: any[]
) {
  const actions: Array<{
    label: string;
    type: 'field_update' | 'task_creation' | 'analysis';
    value: string;
  }> = [];

  // Extract status update suggestions
  const statusMatches = content.match(/suggest(?:ing)? (?:changing|updating) .+ (?:status|state) to ["']?(\w+)["']?/gi);
  if (statusMatches) {
    actions.push({
      label: "Update Task Status",
      type: "field_update",
      value: "Would you like me to update the task status as suggested?"
    });
  }

  // Extract new task suggestions
  const taskMatches = content.match(/suggest(?:ing)? (?:creating|adding) (?:a new|another) task/gi);
  if (taskMatches) {
    actions.push({
      label: "Create New Task",
      type: "task_creation",
      value: "Would you like me to help you create this new task?"
    });
  }

  // Extract business field update suggestions
  const fieldMatches = content.match(/suggest(?:ing)? (?:updating|changing|setting) (?:the )?([a-zA-Z_]+)(?: to | as )([^.,]+)/gi);
  if (fieldMatches) {
    actions.push({
      label: "Update Business Information",
      type: "field_update",
      value: "Would you like me to update the business information as suggested?"
    });
  }

  // Extract analysis suggestions
  if (content.includes("analyze") || content.includes("review") || content.includes("examine")) {
    actions.push({
      label: "Analyze Business Data",
      type: "analysis",
      value: "Would you like a detailed analysis of your business data?"
    });
  }

  return actions;
}

export async function summarizeAndStoreConversation(
  userId: number,
  startMessageId: number,
  endMessageId: number
) {
  try {
    // Get messages in range
    const messages = await db.query.chatMessages.findMany({
      where: and(
        eq(chatMessages.userId, userId),
        gt(chatMessages.id, startMessageId)
      ),
      orderBy: [desc(chatMessages.createdAt)]
    });

    if (messages.length === 0) return null;

    // Format conversation for summarization
    const conversation = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Generate summary using Claude
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        { 
          role: "user", 
          content: `Please provide a concise summary of this conversation, focusing on key points and decisions made:\n\n${conversation}`
        }
      ]
    });

    // Safely extract content from the response
    const summary = response.content[0]?.type === 'text' ? response.content[0].text : '';

    // Store summary
    const [stored] = await db.insert(conversationSummaries)
      .values({
        userId,
        summary,
        messageRange: {
          firstMessageId: startMessageId + 1,
          lastMessageId: endMessageId
        }
      })
      .returning();

    return stored;
  } catch (error) {
    console.error("Error summarizing conversation:", error);
    throw new Error("Failed to summarize conversation");
  }
}

export async function getLatestConversationSummary(userId: number) {
  const [summary] = await db.select()
    .from(conversationSummaries)
    .where(eq(conversationSummaries.userId, userId))
    .orderBy(desc(conversationSummaries.createdAt))
    .limit(1);

  return summary;
}