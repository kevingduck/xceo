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
    description: "Update a section of business information when there are significant, concrete insights or decisions that need to be recorded",
    parameters: {
      section: "string", // Must be one of VALID_SECTIONS
      content: "string", // the new content
      reason: "string" // why this update is being made
    }
  },
  {
    name: "log_conversation_summary",
    description: "Log a summary of the conversation as business context when a natural conclusion is reached",
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

  const summaryContent = JSON.stringify({
    summary: params.summary,
    keyInsights: params.keyInsights,
    actionItems: params.actionItems,
    timestamp: new Date().toISOString()
  });

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
        content: summaryContent,
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
        content: summaryContent,
        metadata: {}
      });
  }
}

export async function processAIMessage(userId: number, userMessage: string, businessContext?: {
  name: string;
  description: string;
  objectives: string[];
  recentMessages?: Array<{ role: string; content: string; }>;
}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  let systemPrompt = businessContext ? 
    `You are an AI CEO assistant engaged in a strategic conversation about ${businessContext.name}. 

    Business Context:
    Description: ${businessContext.description}
    Key Objectives: ${businessContext.objectives.join(", ")}

    Your role is to be a thoughtful, strategic advisor who:
    1. Engages in natural, flowing conversation
    2. Asks clarifying questions to better understand the situation
    3. Only takes action (like updating business info) when there are concrete, valuable insights
    4. Thinks critically about business implications before making suggestions
    5. Maintains context across the conversation
    6. Treats the user as a peer, not just following commands

    Communication Guidelines:
    - Be conversational and natural in your responses
    - Ask thoughtful questions when you need more context
    - Don't force updates or actions unless there's clear value
    - Think through implications before suggesting changes
    - Sometimes just listen and discuss without taking action
    - Stay focused on the current topic until it reaches a natural conclusion

    Available Business Sections (only update when truly necessary):
    ${VALID_SECTIONS.join(", ")}

    You have access to these tools (use sparingly and only when appropriate):
    ${JSON.stringify(availableTools, null, 2)}

    Tool Usage Format:
    <tool>tool_name</tool>
    <parameters>
    {
      "parameter1": "value1",
      "parameter2": "value2"
    }
    </parameters>

    Previous conversation context:
    ${businessContext.recentMessages ? businessContext.recentMessages.map(msg => 
      `${msg.role}: ${msg.content}`
    ).join("\n") : "No previous context"}` :
    'You are an AI CEO assistant. Please ask the user to configure their business details first. Be friendly and explain why this configuration would be helpful for our collaboration.';

  try {
    console.log("Processing AI message with context:", { 
      userId,
      messageLength: userMessage.length,
      hasBusinessContext: !!businessContext,
      numPreviousMessages: businessContext?.recentMessages?.length || 0
    });

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      max_tokens: 4096, // Increased token limit for longer conversations
      temperature: 0.7, // Slightly increased temperature for more natural conversation
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
      console.log("Found tool invocations:", matches.length);
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

        console.log("Executing tool:", { toolName, parameters });

        try {
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
        } catch (error) {
          console.error(`Error executing tool ${toolName}:`, error);
          finalResponse = finalResponse.replace(
            match,
            `⚠ Failed to execute ${toolName}: ${error.message}`
          );
        }
      }
    }

    return finalResponse;
  } catch (error: any) {
    console.error("Error processing AI message:", error);
    throw error;
  }
}