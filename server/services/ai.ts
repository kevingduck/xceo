import Anthropic from '@anthropic-ai/sdk';
import { db } from '@db';
import { tasks, businessInfo, businessInfoHistory, teamMembers, positions, candidates, conversationSummaries, chatMessages } from '@db/schema';
import { eq, desc, and, gt } from 'drizzle-orm';

// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type SuggestedAction = {
  label: string;
  type: 'field_update' | 'task_creation' | 'analysis';
  value: string;
};

async function getBusinessContext(userId: number): Promise<string> {
  try {
    // Get all relevant data with error handling
    const [
      tasksData,
      businessData,
      teamData,
      positionsData,
      candidatesData
    ] = await Promise.all([
      db.query.tasks.findMany({
        where: eq(tasks.userId, userId),
        orderBy: [desc(tasks.updatedAt)]
      }),
      db.query.businessInfo.findMany({
        where: eq(businessInfo.userId, userId),
        orderBy: [desc(businessInfo.updatedAt)]
      }),
      db.query.teamMembers.findMany({
        where: eq(teamMembers.userId, userId)
      }),
      db.query.positions.findMany({
        where: eq(positions.userId, userId)
      }),
      db.query.candidates.findMany({
        where: eq(candidates.userId, userId)
      })
    ].map(p => p.catch(err => {
      console.error("Error fetching data:", err);
      return [];
    })));

    // Format context sections
    let contextString = "Current Business Context:\n\n";

    // Add tasks information
    if (tasksData.length > 0) {
      contextString += "Tasks:\n";
      tasksData.forEach(task => {
        contextString += `- ${task.title} (Status: ${task.status})\n`;
        if (task.description) {
          contextString += `  Description: ${task.description}\n`;
        }
      });
      contextString += "\n";
    }

    // Add business info sections
    if (businessData.length > 0) {
      contextString += "Business Information:\n";
      businessData.forEach(info => {
        if (info.content) {
          contextString += `${info.section}:\n${info.content}\n`;
        }
        if (info.fields && Object.keys(info.fields).length > 0) {
          for (const [key, field] of Object.entries(info.fields)) {
            contextString += `- ${key}: ${field.value}\n`;
          }
        }
      });
    }

    // Add team information
    if (teamData.length > 0) {
      contextString += "\nTeam Members:\n";
      teamData.forEach(member => {
        contextString += `- ${member.name} (${member.role})\n`;
        if (member.department) {
          contextString += `  Department: ${member.department}\n`;
        }
        contextString += `  Status: ${member.status}\n`;
      });
    }

    // Add positions
    if (positionsData.length > 0) {
      contextString += "\nOpen Positions:\n";
      positionsData.forEach(position => {
        contextString += `- ${position.title}\n`;
        contextString += `  Department: ${position.department}\n`;
        contextString += `  Status: ${position.status}\n`;
        contextString += `  Priority: ${position.priority}\n`;
      });
    }

    // Add candidates
    if (candidatesData.length > 0) {
      contextString += "\nCandidates:\n";
      candidatesData.forEach(candidate => {
        contextString += `- ${candidate.name} (Position: ${candidate.positionId})\n`;
        contextString += `  Status: ${candidate.status}\n`;
        if (candidate.skills?.length > 0) {
          contextString += `  Skills: ${candidate.skills.join(", ")}\n`;
        }
      });
    }

    return contextString;
  } catch (error) {
    console.error("Error fetching business context:", error);
    return "Error: Unable to fetch complete business context. Please try again later.";
  }
}

async function getLatestConversationSummary(userId: number) {
  try {
    const [latestSummary] = await db
      .select()
      .from(conversationSummaries)
      .where(eq(conversationSummaries.userId, userId))
      .orderBy(desc(conversationSummaries.createdAt))
      .limit(1);

    return latestSummary;
  } catch (error) {
    console.error("Error fetching latest conversation summary:", error);
    return null;
  }
}

async function summarizeAndStoreConversation(userId: number, firstMessageId: number, lastMessageId: number) {
  try {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.userId, userId),
          gt(chatMessages.id, firstMessageId),
          eq(chatMessages.id, lastMessageId)
        )
      )
      .orderBy(desc(chatMessages.createdAt));

    if (!messages.length) return null;

    const conversationText = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join("\n");

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: `Please analyze and summarize this conversation comprehensively, focusing on key decisions, insights, and action items. Extract the main topics discussed, and provide contextual understanding that will be valuable for future interactions:

        ${conversationText}

        Format your response as JSON:
        {
          "summary": "Detailed summary of the conversation, including contextual insights",
          "keyTopics": ["Topic 1", "Topic 2", ...],
          "contextualData": {
            "decisions": ["Decision 1", "Decision 2", ...],
            "actionItems": ["Action 1", "Action 2", ...],
            "insights": ["Insight 1", "Insight 2", ...],
            "relationships": ["Connection 1", "Connection 2", ...],
            "contextualBackgrounds": ["Context 1", "Context 2", ...]
          }
        }`
      }],
      temperature: 0.7,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from AI');
    }

    const summaryData = JSON.parse(content.text);

    const [summary] = await db.insert(conversationSummaries)
      .values({
        userId,
        summary: summaryData.summary,
        keyTopics: summaryData.keyTopics,
        contextualData: summaryData.contextualData,
        messageRange: {
          firstMessageId,
          lastMessageId
        },
        metadata: { source: 'auto-summarization' }
      })
      .returning();

    return summary;
  } catch (error) {
    console.error("Error summarizing conversation:", error);
    return null;
  }
}

async function processFieldUpdate(
  businessInfoId: number,
  fieldUpdates: Record<string, any>,
  reason: string
) {
  try {
    const [existingInfo] = await db
      .select()
      .from(businessInfo)
      .where(eq(businessInfo.id, businessInfoId))
      .limit(1);

    if (!existingInfo) {
      throw new Error('Business info not found');
    }

    // Save current state to history
    await db.insert(businessInfoHistory).values({
      businessInfoId: existingInfo.id,
      userId: existingInfo.userId,
      content: existingInfo.content,
      fields: existingInfo.fields || {},
      updatedBy: 'ai',
      reason: reason,
      metadata: { source: 'ai-update' }
    });

    // Update fields
    const updatedFields = {
      ...(existingInfo.fields || {}),
      ...Object.entries(fieldUpdates).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: {
          value: value.value,
          type: value.type,
          updatedAt: new Date().toISOString(),
          updatedBy: 'ai'
        }
      }), {})
    };

    const [info] = await db
      .update(businessInfo)
      .set({
        fields: updatedFields,
        updatedAt: new Date()
      })
      .where(eq(businessInfo.id, businessInfoId))
      .returning();

    return info;
  } catch (error) {
    console.error('Error in processFieldUpdate:', error);
    throw error;
  }
}

export async function processAIMessage(
  userId: number,
  userMessage: string,
  businessContext?: {
    name: string;
    description: string;
    objectives: string[];
    recentMessages?: Array<{ role: string; content: string; }>;
  }
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  try {
    const dbContext = await getBusinessContext(userId);
    const latestSummary = await getLatestConversationSummary(userId);

    let systemPrompt = businessContext ?
      `You are an AI CEO assistant engaged in a strategic conversation about ${businessContext.name}. 

      Business Context:
      Description: ${businessContext.description}
      Key Objectives: ${businessContext.objectives.join(", ")}

      Current Database Information:
      ${dbContext}

      ${latestSummary ? `Previous Conversation Context:
      ${latestSummary.summary}
      Key Topics: ${latestSummary.keyTopics?.join(", ") || "None"}
      ` : ""}

      Your role is to be a thoughtful, strategic advisor who:
      1. Engages in natural conversation while maintaining context awareness
      2. Asks clarifying questions when needed
      3. Provides actionable strategic advice based on the full context
      4. Creates focused tasks for clear action items
      5. Updates business fields when new information is provided
      6. References all available context, including historical conversations

      When updating business fields, use this format:
      <field_update>
      {
        "businessInfoId": 1,
        "fields": {
          "fieldName": {
            "value": "field value",
            "type": "text"
          }
        }
      }
      </field_update>

      When creating tasks, use this format:
      <task>
      {
        "title": "Task title",
        "description": "Task description",
        "status": "todo"
      }
      </task>

      Always provide 2-3 suggested next actions in this format:
      <suggested_actions>
      [
        {
          "label": "Action label",
          "type": "field_update|task_creation|analysis",
          "value": "Action description"
        }
      ]
      </suggested_actions>` :
      'You are an AI CEO assistant. Please ask the user to configure their business details first to provide better assistance.';

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      temperature: 0.7,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return {
        content: "I apologize, but I can only process text responses at the moment.",
        suggestedActions: []
      };
    }

    let finalResponse = content.text;
    let suggestedActions: SuggestedAction[] = [];

    // Extract suggested actions
    const actionMatch = finalResponse.match(/<suggested_actions>\s*([\s\S]+?)\s*<\/suggested_actions>/);
    if (actionMatch) {
      try {
        suggestedActions = JSON.parse(actionMatch[1]);
        finalResponse = finalResponse.replace(/<suggested_actions>[\s\S]+?<\/suggested_actions>/, '');
      } catch (e) {
        console.error("Failed to parse suggested actions:", e);
      }
    }

    // Process field updates
    const fieldUpdateMatches = finalResponse.match(/<field_update>\s*({[\s\S]+?})\s*<\/field_update>/gm);
    if (fieldUpdateMatches) {
      console.log("Found field updates:", fieldUpdateMatches.length);
      for (const match of fieldUpdateMatches) {
        const jsonMatch = match.match(/{[\s\S]+?}/);
        if (!jsonMatch) continue;

        try {
          const updateData = JSON.parse(jsonMatch[0]);
          await processFieldUpdate(
            updateData.businessInfoId,
            updateData.fields,
            "AI-suggested update based on conversation"
          );

          finalResponse = finalResponse.replace(
            match,
            `✓ Updated business information fields`
          );
        } catch (error) {
          console.error("Error updating fields:", error);
          finalResponse = finalResponse.replace(
            match,
            `⚠ Failed to update fields: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    // Process task creation
    const taskMatches = finalResponse.match(/<task>\s*({[\s\S]+?})\s*<\/task>/gm);
    if (taskMatches) {
      console.log("Found task creations:", taskMatches.length);
      for (const match of taskMatches) {
        const taskJson = match.replace(/<\/?task>/g, '').trim();
        try {
          const taskData = JSON.parse(taskJson);
          const [task] = await db.insert(tasks)
            .values({
              ...taskData,
              userId,
            })
            .returning();

          finalResponse = finalResponse.replace(
            match,
            `✓ Created task: ${task.title}`
          );
        } catch (error) {
          console.error("Error creating task:", error);
          finalResponse = finalResponse.replace(
            match,
            `⚠ Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    return {
      content: finalResponse.trim(),
      suggestedActions
    };
  } catch (error) {
    console.error("Error processing AI message:", error);
    throw error;
  }
}

export { summarizeAndStoreConversation, getLatestConversationSummary };