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

const VALID_SECTIONS = [
  "Business Overview",
  "Financial Overview",
  "Market Intelligence",
  "Human Capital",
  "Operations"
] as const;

const availableTools: ToolFunction[] = [
  {
    name: "update_business_info",
    description: "Update a section of business information",
    parameters: {
      section: "string", // Must be one of VALID_SECTIONS
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

async function updateBusinessInfo(userId: number, params: any): Promise<BusinessInfo> {
  const section = params.section as typeof VALID_SECTIONS[number];
  if (!VALID_SECTIONS.includes(section)) {
    throw new Error(`Invalid section: ${section}. Must be one of: ${VALID_SECTIONS.join(', ')}`);
  }

  // Find existing info for this section
  const [existingInfo] = await db
    .select()
    .from(businessInfo)
    .where(
      and(
        eq(businessInfo.userId, userId),
        eq(businessInfo.section, section)
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
        section,
        title: section,
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
  recentMessages?: Array<{ role: string; content: string; }>;
}) {
  let systemPrompt = businessContext ? 
    `You are an AI CEO assistant for ${businessContext.name}. Business Description: ${businessContext.description}. Key Objectives: ${businessContext.objectives.join(", ")}.

    You have access to the following valid business sections that you can update:
    ${VALID_SECTIONS.join(", ")}

    When updating business information, ONLY use these exact section names.
    For example, use "Market Intelligence" not "market" or "marketing".

    You have access to the following tools:
    ${JSON.stringify(availableTools, null, 2)}

    When you want to use a tool, format your response like this:
    <tool>tool_name</tool>
    <parameters>
    {
      "parameter1": "value1",
      "parameter2": "value2"
    }
    </parameters>

    Guidelines:
    1. Only update business sections when there is specific, actionable information
    2. When updating a section:
       - Be specific and detailed in the content
       - Clearly explain why you're making the update
       - Use the exact section names provided
    3. Don't create tasks automatically - only when explicitly asked
    4. If you're asked to summarize the conversation:
       - Provide a concise summary focusing on key points
       - Extract specific insights and action items
       - Use the log_conversation_summary tool

    Previous conversation context:
    ${businessContext.recentMessages ? businessContext.recentMessages.map(msg => 
      `${msg.role}: ${msg.content}`
    ).join("\n") : "No previous context"}` :
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

      if (toolName === "update_business_info") {
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