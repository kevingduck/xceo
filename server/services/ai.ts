import Anthropic from '@anthropic-ai/sdk';
import { db } from '@db';
import { tasks, businessInfo, businessInfoHistory, chatMessages, type Task, type BusinessInfo } from '@db/schema';
import { eq, and } from 'drizzle-orm';

// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type ToolFunction = {
  name: string;
  description: string;
  parameters: Record<string, any>;
};

const availableTools: ToolFunction[] = [
  {
    name: "create_task",
    description: "Create a new task in the system",
    parameters: {
      title: "string",
      description: "string",
      status: "string"
    }
  },
  {
    name: "update_business_info",
    description: "Update a section of business information",
    parameters: {
      section: "string", // e.g., 'finance', 'market', 'humanCapital'
      content: "string", // the new content
      reason: "string" // why this update is being made
    }
  },
  {
    name: "log_conversation_summary",
    description: "Log a summary of the conversation as business context",
    parameters: {
      summary: "string",
      keyInsights: "string[]",
      actionItems: "string[]"
    }
  }
];

async function createTask(userId: number, params: any): Promise<Task> {
  const [task] = await db
    .insert(tasks)
    .values({
      userId,
      title: params.title,
      description: params.description,
      status: params.status || "todo"
    })
    .returning();

  return task;
}

async function updateBusinessInfo(userId: number, params: any): Promise<BusinessInfo> {
  // Find existing info for this section
  const [existingInfo] = await db
    .select()
    .from(businessInfo)
    .where(
      and(
        eq(businessInfo.userId, userId),
        eq(businessInfo.section, params.section)
      )
    );

  if (existingInfo) {
    // Save to history first
    await db.insert(businessInfoHistory).values({
      businessInfoId: existingInfo.id,
      userId,
      content: existingInfo.content,
      metadata: existingInfo.metadata,
      updatedBy: "ai",
      reason: params.reason
    });

    // Update existing info
    const [updatedInfo] = await db
      .update(businessInfo)
      .set({
        content: params.content,
        updatedAt: new Date()
      })
      .where(eq(businessInfo.id, existingInfo.id))
      .returning();

    return updatedInfo;
  } else {
    // Create new info
    const [newInfo] = await db
      .insert(businessInfo)
      .values({
        userId,
        section: params.section,
        title: params.section.charAt(0).toUpperCase() + params.section.slice(1),
        content: params.content,
        metadata: {}
      })
      .returning();

    return newInfo;
  }
}

async function logConversationSummary(userId: number, params: any): Promise<void> {
  // Store summary as a special type of business info
  const [existingInfo] = await db
    .select()
    .from(businessInfo)
    .where(
      and(
        eq(businessInfo.userId, userId),
        eq(businessInfo.section, 'conversationSummaries')
      )
    );

  if (existingInfo) {
    // Save to history first
    await db.insert(businessInfoHistory).values({
      businessInfoId: existingInfo.id,
      userId,
      content: existingInfo.content,
      metadata: existingInfo.metadata,
      updatedBy: "ai",
      reason: "Conversation summarization"
    });

    // Update existing summary
    await db
      .update(businessInfo)
      .set({
        content: JSON.stringify({
          summary: params.summary,
          keyInsights: params.keyInsights,
          actionItems: params.actionItems,
          timestamp: new Date().toISOString()
        }),
        updatedAt: new Date()
      })
      .where(eq(businessInfo.id, existingInfo.id));
  } else {
    // Create new summary entry
    await db
      .insert(businessInfo)
      .values({
        userId,
        section: 'conversationSummaries',
        title: 'Conversation Summaries',
        content: JSON.stringify({
          summary: params.summary,
          keyInsights: params.keyInsights,
          actionItems: params.actionItems,
          timestamp: new Date().toISOString()
        }),
        metadata: {}
      });
  }

  // Clear previous messages
  await db
    .delete(chatMessages)
    .where(eq(chatMessages.userId, userId));
}

export async function processAIMessage(userId: number, userMessage: string, businessContext?: {
  name: string;
  description: string;
  objectives: string[];
}) {
  let systemPrompt = businessContext ? 
    `You are an AI CEO assistant for ${businessContext.name}. Business Description: ${businessContext.description}. Key Objectives: ${businessContext.objectives.join(", ")}.

    You have access to the following tools that you can use to help manage the business:
    ${JSON.stringify(availableTools, null, 2)}

    When you want to use a tool, format your response like this:
    <tool>tool_name</tool>
    <parameters>
    {
      "parameter1": "value1",
      "parameter2": "value2"
    }
    </parameters>

    You can use multiple tools in one response. Always explain what you're doing before using tools.
    When you detect that important business information has been discussed:
    1. Use update_business_info to record it in the appropriate section
    2. Be specific and detailed in the content
    3. Clearly explain why you're making the update

    If you're asked to summarize the conversation:
    1. Provide a concise summary focusing on key points
    2. Extract specific insights and action items
    3. Use the log_conversation_summary tool to record this information` :
    'You are an AI CEO assistant. Please ask the user to configure their business details first.';

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    max_tokens: 1024,
  });

  // Ensure we have a text response
  const messageContent = response.content[0];
  if (messageContent.type !== 'text') {
    return "I apologize, but I can only process text responses at the moment.";
  }

  let finalResponse = messageContent.text;

  // Check for tool invocations
  const matches = finalResponse.match(/<tool>([^<]+)<\/tool>\s*<parameters>([^<]+)<\/parameters>/gm);

  if (matches) {
    for (const match of matches) {
      const toolMatch = match.match(/<tool>([^<]+)<\/tool>/);
      const paramsMatch = match.match(/<parameters>([^<]+)<\/parameters>/);

      if (!toolMatch || !paramsMatch) continue;

      const toolName = toolMatch[1];
      let parameters;
      try {
        parameters = JSON.parse(paramsMatch[1]);
      } catch (e) {
        console.error("Failed to parse tool parameters:", e);
        continue;
      }

      if (toolName === "create_task") {
        const task = await createTask(userId, parameters);
        finalResponse = finalResponse.replace(match, `✓ Created task: ${task.title}`);
      } else if (toolName === "update_business_info") {
        const info = await updateBusinessInfo(userId, parameters);
        finalResponse = finalResponse.replace(
          match, 
          `✓ Updated ${info.section} information: ${parameters.reason}`
        );
      } else if (toolName === "log_conversation_summary") {
        await logConversationSummary(userId, parameters);
        finalResponse = finalResponse.replace(
          match,
          `✓ Conversation summarized and logged. Starting fresh conversation.`
        );
      }
    }
  }

  return finalResponse;
}