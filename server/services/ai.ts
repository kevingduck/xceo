import Anthropic from '@anthropic-ai/sdk';
import { db } from '@db';
import { tasks, businessInfo, businessInfoHistory, teamMembers, positions, candidates, conversationSummaries, chatMessages } from '@db/schema';
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

export const businessSections: BusinessSection[] = [
  {
    section: "Business Overview",
    fields: {
      company_name: {
        type: "text",
        label: "Company Name",
        description: "Legal name of your business"
      }
    }
  }
];

async function executeTaskFunction(userId: number, functionCall: TaskFunctionCall) {
  try {
    const { args } = functionCall;
    const [task] = await db.insert(tasks)
      .values({
        userId,
        title: args.title,
        description: args.description || '',
        status: args.status || 'todo',
      })
      .returning();
    return task;
  } catch (error) {
    console.error("Error executing task function:", error);
    throw new Error("Failed to create task");
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

    // Format tasks for AI context
    const tasksContext = userTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || "",
      status: task.status,
      updatedAt: task.updatedAt.toISOString()
    }));

    // Create context message for tasks
    const contextMessage = `You are an AI CEO assistant. ${
      businessContext 
        ? `You are helping manage ${businessContext.name}. The business description is: ${businessContext.description}. Key objectives: ${businessContext.objectives.join(", ")}.`
        : "You are helping manage a business."
    }

Current tasks (${tasksContext.length}):
${tasksContext.map(task => `- ${task.title} (${task.status})`).join("\n")}

You can:
1. Discuss and provide insights about tasks
2. Suggest task status updates
3. Recommend new tasks based on business objectives
4. Analyze task progress and priorities

When the user suggests or implies a new task should be created, you can create it directly using the create_task function.
The create_task function accepts: title (required), description (optional), and status (optional, defaults to "todo").

Respond naturally while keeping this context in mind. If a new task should be created based on the conversation, use the create_task function.`;

    // Call Anthropic API
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        { role: "user", content: contextMessage },
        ...(businessContext?.recentMessages?.map(msg => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content
        })) || []),
        { role: "user", content }
      ],
      system: "You are a business management AI assistant that can help create and manage tasks. When a task needs to be created, use the create_task function.",
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
    for (const content of response.content) {
      if ('tool_calls' in content) {
        const toolCalls = content.tool_calls || [];
        for (const toolCall of toolCalls) {
          if (toolCall.name === 'create_task') {
            try {
              const args = JSON.parse(toolCall.arguments);
              createdTask = await executeTaskFunction(userId, { name: "create_task", args });
            } catch (error) {
              console.error("Error processing tool call:", error);
            }
          }
        }
      }
    }

    // Extract suggested actions based on AI response
    const suggestedActions = extractSuggestedActions(aiContent, tasksContext);

    return {
      content: createdTask 
        ? `${aiContent}\n\nI've created a new task: "${createdTask.title}"`
        : aiContent,
      suggestedActions
    };
  } catch (error) {
    console.error("Error processing AI message:", error);
    throw new Error("Failed to process message");
  }
}

function extractSuggestedActions(content: string, tasks: any[]) {
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

  // Extract analysis suggestions
  if (content.includes("analyze") || content.includes("review") || content.includes("examine")) {
    actions.push({
      label: "Analyze Tasks",
      type: "analysis",
      value: "Would you like a detailed analysis of your current tasks?"
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