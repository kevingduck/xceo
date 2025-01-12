import Anthropic from '@anthropic-ai/sdk';
import { db } from '@db';
import { tasks, businessInfo, businessInfoHistory } from '@db/schema';
import { eq } from 'drizzle-orm';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type BusinessSection = {
  name: string;
  fields: {
    name: string;
    type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'list';
    description: string;
  }[];
};

export const businessSections: BusinessSection[] = [
  {
    name: "Business Overview",
    fields: [
      { name: "company_name", type: "text", description: "Full legal business name" },
      { name: "industry", type: "text", description: "Primary and secondary industry classifications" },
      { name: "targetSegments", type: "list", description: "Primary target market segments" },
      { name: "unique_value", type: "text", description: "Primary value proposition" },
      { name: "key_benefits", type: "list", description: "Main benefits offered to customers" },
      { name: "short_term_goals", type: "list", description: "Goals for next 12 months" },
      { name: "long_term_goals", type: "list", description: "3-5 year strategic objectives" },
      { name: "growth_targets", type: "list", description: "Specific growth metrics and targets" }
    ]
  }
];

async function processFieldUpdate(
  businessInfoId: number,
  fieldUpdates: Record<string, any>,
  reason: string
) {
  try {
    // Get current fields
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

    // Merge existing fields with updates, ensuring proper type handling
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

    // Update the business info
    const [info] = await db
      .update(businessInfo)
      .set({
        fields: updatedFields,
        updatedAt: new Date()
      })
      .where(eq(businessInfo.id, businessInfoId))
      .returning();

    if (!info) {
      throw new Error('Failed to update business info fields');
    }

    return info;
  } catch (error) {
    console.error('Error in processFieldUpdate:', error);
    throw error;
  }
}

type SuggestedAction = {
  label: string;
  type: 'field_update' | 'task_creation' | 'analysis';
  value: string;
};

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

  let systemPrompt = businessContext ? 
    `You are an AI CEO assistant engaged in a strategic conversation about ${businessContext.name}. 

    Business Context:
    Description: ${businessContext.description}
    Key Objectives: ${businessContext.objectives.join(", ")}

    Your role is to be a thoughtful, strategic advisor who:
    1. Engages in natural, flowing conversation
    2. Asks clarifying questions to better understand situations
    3. Provides actionable strategic advice
    4. Creates focused tasks when there are clear action items
    5. Updates business fields when new information is provided
    6. Maintains context across the conversation

    When updating business fields, use this exact format:
    <field_update>
    {
      "businessInfoId": 1,
      "fields": {
        "targetSegments": {
          "value": ["Service Businesses", "Real Estate", "Small Business"],
          "type": "list",
          "updatedAt": "${new Date().toISOString()}",
          "updatedBy": "ai"
        }
      }
    }
    </field_update>

    When creating tasks, use this exact format:
    <task>
    {
      "title": "Task title",
      "description": "Detailed task description",
      "status": "todo"
    }
    </task>

    Always provide 2-3 suggested next actions after your response in this format:
    <suggested_actions>
    [
      {
        "label": "Update target segments",
        "type": "field_update",
        "value": "Let's update our target market segments to focus on the most promising opportunities."
      },
      {
        "label": "Create customer outreach plan",
        "type": "task_creation",
        "value": "Help me create a detailed plan for reaching out to potential customers."
      }
    ]
    </suggested_actions>` :
    'You are an AI CEO assistant. Please ask the user to configure their business details first. Be friendly and explain why this configuration would be helpful for our collaboration.';

  try {
    console.log("Processing AI message with context:", { 
      userId,
      messageLength: userMessage.length,
      hasBusinessContext: !!businessContext,
      numPreviousMessages: businessContext?.recentMessages?.length || 0
    });

    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      max_tokens: 4096,
      temperature: 0.7,
    });

    // Ensure we have a text response
    const messageContent = response.content[0];
    if (messageContent.type !== 'text') {
      return {
        content: "I apologize, but I can only process text responses at the moment.",
        suggestedActions: []
      };
    }

    let finalResponse = messageContent.text;
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

          // Validate the update data structure
          if (!updateData.businessInfoId || !updateData.fields || typeof updateData.fields !== 'object') {
            throw new Error('Invalid field update format');
          }

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

          // Validate task data
          if (!taskData.title || typeof taskData.title !== 'string') {
            throw new Error('Invalid task format: missing or invalid title');
          }

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
  } catch (error: any) {
    console.error("Error processing AI message:", error);
    throw error;
  }
}