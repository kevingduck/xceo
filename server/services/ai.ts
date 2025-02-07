import Anthropic from '@anthropic-ai/sdk';
import { db } from '@db';
import { tasks, chatMessages, analytics, users, businessInfo, businessInfoHistory, teamMembers, positions, candidates, conversationSummaries } from '@db/schema';
import { eq, desc, and, gt } from 'drizzle-orm';

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
    const { args } = functionCall;
    const [task] = await db.insert(tasks)
      .values({
        userId,
        title: args.title,
        description: args.description || '',
        status: args.status || 'todo',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return task;
  } catch (error) {
    console.error("Error executing task function:", error);
    throw new Error("Failed to create task");
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

    // Fetch latest business info for each section
    const businessSections = await db.query.businessInfo.findMany({
      where: eq(businessInfo.userId, userId),
      orderBy: [desc(businessInfo.updatedAt)]
    });

    // Group by section to get latest entries
    const latestSectionMap = businessSections.reduce((acc, curr) => {
      if (!acc[curr.section] || new Date(acc[curr.section].updatedAt) < new Date(curr.updatedAt)) {
        acc[curr.section] = curr;
      }
      return acc;
    }, {} as Record<string, typeof businessSections[0]>);

    // Format tasks for context
    const tasksContext = userTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || "",
      status: task.status,
      updatedAt: task.updatedAt.toISOString()
    }));

    // Create a detailed business context message
    const businessInfoContext = Object.entries(latestSectionMap).reduce((acc, [section, data]) => {
      const fields = data.fields || {};
      acc[section] = {
        content: data.content,
        fields: Object.entries(fields).map(([key, value]) => ({
          name: key,
          value: value.value,
          type: value.type,
          updatedAt: value.updatedAt
        }))
      };
      return acc;
    }, {} as Record<string, any>);

    // Create a more detailed context message
    const contextMessage = `You are an AI CEO assistant. ${
      businessContext 
        ? `You are helping manage ${businessContext.name}. The business description is: ${businessContext.description}. Key objectives: ${businessContext.objectives.join(", ")}.`
        : "You are helping manage a business."
    }

Business Information:
${Object.entries(businessInfoContext).map(([section, data]) => `
${section}:
${data.content}

Current Fields:
${data.fields.map((field: any) => 
  `- ${field.name}: ${field.value} (${field.type})`
).join("\n")}`).join("\n\n")}

Current Tasks (${tasksContext.length}):
${tasksContext.map(task => 
  `- ${task.title} (${task.status})${task.description ? `\n  Description: ${task.description}` : ''}`
).join("\n")}

You have full access to all business information shown above. Use this information to provide accurate and contextual responses.
You can:
1. Discuss and provide insights about tasks and business information
2. Suggest task status updates
3. Recommend new tasks based on business objectives
4. Update business information fields directly
5. Analyze business metrics and provide recommendations

When appropriate, you can:
- Create tasks using the create_task function
- Update business fields using the update_business_field function

Always refer to the actual business data when answering questions about the business.
`;

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
      system: `You are a business management AI assistant with access to the company's business information and tasks. When discussing business details, always refer to the actual data provided in the context. Be specific when mentioning business information and ensure accuracy in your responses.`,
      tools: [
        {
          name: "create_task",
          description: "Create a new task in the system",
          input_schema: {
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
        },
        {
          name: "update_business_field",
          description: "Update a specific field in a business section",
          input_schema: {
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
      ]
    });

    // Extract text content from response
    const aiContent = response.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n');

    // Handle tool calls if present
    let createdTask = null;
    let updatedField = null;

    for (const content of response.content) {
      if ('tool_calls' in content) {
        const toolCalls = content.tool_calls || [];
        for (const toolCall of toolCalls) {
          if (toolCall.type === 'function' && toolCall.function) {
            const { name, arguments: args } = toolCall.function;
            if (name === 'create_task') {
              try {
                createdTask = await executeTaskFunction(userId, { name, args: JSON.parse(args) });
              } catch (error) {
                console.error("Error processing task tool call:", error);
              }
            } else if (name === 'update_business_field') {
              try {
                updatedField = await executeBusinessFieldUpdate(userId, { name, args: JSON.parse(args) });
              } catch (error) {
                console.error("Error processing business field update tool call:", error);
              }
            }
          }
        }
      }
    }

    // Extract suggested actions
    const suggestedActions = extractSuggestedActions(aiContent, tasksContext, businessInfoContext);

    let responseContent = aiContent;
    if (createdTask) {
      responseContent += `\n\nI've created a new task: "${createdTask.title}"`;
    }
    if (updatedField) {
      responseContent += `\n\nI've updated the ${updatedField.section} information.`;
    }

    return {
      content: responseContent,
      suggestedActions
    };
  } catch (error) {
    console.error("Error processing AI message:", error);
    throw new Error("Failed to process message");
  }
}

function extractSuggestedActions(
  content: string,
  tasks: any[],
  businessInfo: Record<string, any>
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