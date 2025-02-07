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

async function executeTaskFunction(userId: number, functionCall: TaskFunctionCall) {
  try {
    console.log("Creating task with data:", functionCall.args);

    // Validate required fields
    if (!functionCall.args.title) {
      throw new Error("Task title is required");
    }

    // Ensure status is one of the valid options
    const validStatus = ["todo", "in_progress", "done"];
    const status = functionCall.args.status && validStatus.includes(functionCall.args.status) 
      ? functionCall.args.status 
      : "todo";

    const [task] = await db.insert(tasks)
      .values({
        userId,
        title: functionCall.args.title.trim(),
        description: functionCall.args.description?.trim() || '',
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
    throw new Error("Failed to create task: " + (error instanceof Error ? error.message : "Unknown error"));
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

    // Format tasks for context
    const tasksContext = userTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || "",
      status: task.status,
      updatedAt: task.updatedAt.toISOString()
    }));

    // Create a more detailed context message
    const contextMessage = `You are an AI CEO assistant. ${
      businessContext 
        ? `You are helping manage ${businessContext.name}. The business description is: ${businessContext.description}. Key objectives: ${businessContext.objectives.join(", ")}.`
        : "You are helping manage a business."
    }

Current Tasks (${tasksContext.length}):
${tasksContext.map(task => 
  `- ${task.title} (${task.status})${task.description ? `\n  Description: ${task.description}` : ''}`
).join("\n")}

You can:
1. Create new tasks using the create_task function
2. Update business information using the update_business_field function

Remember to use the available tools when appropriate.`;

    // Filter out empty messages and ensure proper role values
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

    // Call Anthropic API with enhanced context
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages,
      system: `You are a business management AI assistant. When a user requests task creation or business updates, always use the appropriate tool function rather than just describing what should be done. Be proactive in using the tools provided.`,
      tools: [
        {
          type: "function",
          function: {
            name: "create_task",
            description: "Create a new task in the system",
            parameters: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "The title of the task"
                },
                description: {
                  type: "string",
                  description: "Optional detailed description of the task"
                },
                status: {
                  type: "string",
                  enum: ["todo", "in_progress", "done"],
                  description: "The status of the task, defaults to todo if not specified"
                }
              },
              required: ["title"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "update_business_field",
            description: "Update a specific field in a business section",
            parameters: {
              type: "object",
              properties: {
                section: {
                  type: "string",
                  description: "The section name (e.g., 'Business Overview', 'Financial Overview')"
                },
                field: {
                  type: "string",
                  description: "The field name to update"
                },
                value: {
                  oneOf: [
                    { type: "string" },
                    { type: "number" },
                    { type: "array", items: { type: "string" } }
                  ],
                  description: "The new value for the field"
                },
                type: {
                  type: "string",
                  enum: ["text", "number", "currency", "percentage", "date", "list"],
                  description: "The type of the field"
                }
              },
              required: ["section", "field", "value", "type"]
            }
          }
        }
      ]
    });

    let createdTask = null;
    let updatedField = null;
    let responseContent = '';

    // Process text content and tool calls
    for (const content of response.content) {
      if (content.type === 'text') {
        responseContent += content.text;
      } else if (content.type === 'tool_call') {
        console.log("Processing tool call:", content);
        const { tool_name, parameters } = content;

        try {
          if (tool_name === 'create_task') {
            console.log("Executing create_task with parameters:", parameters);
            createdTask = await executeTaskFunction(userId, {
              name: 'create_task',
              args: parameters
            });
            console.log("Task created successfully:", createdTask);
          } else if (tool_name === 'update_business_field') {
            updatedField = await executeBusinessFieldUpdate(userId, {
              name: 'update_business_field',
              args: parameters
            });
          }
        } catch (error) {
          console.error(`Error executing ${tool_name}:`, error);
          responseContent += `\n\nI encountered an error while trying to ${tool_name === 'create_task' ? 'create the task' : 'update the business field'}: ${error.message}`;
        }
      }
    }

    // Add information about created task or updated field to the response
    if (createdTask) {
      console.log("Adding created task to response:", createdTask);
      responseContent += `\n\nI've created a new task for you: "${createdTask.title}" with status "${createdTask.status}"`;
    }
    if (updatedField) {
      responseContent += `\n\nI've updated the ${updatedField.section} information.`;
    }

    // Extract suggested actions
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