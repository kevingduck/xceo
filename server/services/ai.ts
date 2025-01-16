import Anthropic from '@anthropic-ai/sdk';
import { db } from '@db';
import { tasks, businessInfo, businessInfoHistory, teamMembers, positions, candidates, conversationSummaries, chatMessages, offerings, offeringFeatures, roadmapItems, pricingTiers, pricingFeatures } from '@db/schema';
import { eq, desc, and, gt } from 'drizzle-orm';

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
  },
  {
    name: "Financial Overview",
    fields: [
      { name: "revenue_current", type: "currency", description: "Current annual revenue" },
      { name: "revenue_target", type: "currency", description: "Annual revenue target" },
      { name: "growth_rate", type: "percentage", description: "Monthly growth rate" },
      { name: "burn_rate", type: "currency", description: "Monthly burn rate" },
      { name: "runway", type: "number", description: "Remaining runway in months" },
      { name: "cac", type: "currency", description: "Customer Acquisition Cost" },
      { name: "ltv", type: "currency", description: "Customer Lifetime Value" },
      { name: "gross_margin", type: "percentage", description: "Gross margin percentage" },
      { name: "mrr", type: "currency", description: "Monthly Recurring Revenue" },
      { name: "arpu", type: "currency", description: "Average Revenue Per User" }
    ]
  },
  {
    name: "Market Intelligence",
    fields: [
      { name: "tam", type: "currency", description: "Total Addressable Market size" },
      { name: "sam", type: "currency", description: "Serviceable Available Market size" },
      { name: "som", type: "currency", description: "Serviceable Obtainable Market size" },
      { name: "primary_segments", type: "list", description: "Primary customer segments" },
      { name: "segment_characteristics", type: "list", description: "Key characteristics of each segment" },
      { name: "customer_pain_points", type: "list", description: "Major pain points addressed" },
      { name: "direct_competitors", type: "list", description: "Direct competitors and their strengths" },
      { name: "indirect_competitors", type: "list", description: "Indirect competitors and alternatives" },
      { name: "competitive_advantages", type: "list", description: "Our key competitive advantages" }
    ]
  },
  {
    name: "Human Capital",
    fields: [
      { name: "team_size", type: "number", description: "Current team size" },
      { name: "departments", type: "list", description: "Active departments" },
      { name: "leadership_positions", type: "list", description: "Key leadership roles" },
      { name: "immediate_needs", type: "list", description: "Immediate hiring needs" },
      { name: "future_roles", type: "list", description: "Planned future positions" },
      { name: "skill_requirements", type: "list", description: "Critical skill requirements" }
    ]
  },
  {
    name: "Operations",
    fields: [
      { name: "product_delivery", type: "text", description: "Product/service delivery process" },
      { name: "quality_metrics", type: "list", description: "Quality control standards" },
      { name: "delivery_timeline", type: "text", description: "Standard delivery timeline" },
      { name: "tech_stack", type: "list", description: "Current technology stack" },
      { name: "support_channels", type: "list", description: "Available support channels" },
      { name: "response_time", type: "number", description: "Target response time in hours" }
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

async function getBusinessContext(userId: number) {
  try {
    // Get latest business info entries
    const businessData = await db.query.businessInfo.findMany({
      where: eq(businessInfo.userId, userId),
      orderBy: [desc(businessInfo.updatedAt)]
    });

    // Get team information
    const teamData = await db.query.teamMembers.findMany({
      where: eq(teamMembers.userId, userId)
    });

    // Get open positions
    const positionsData = await db.query.positions.findMany({
      where: eq(positions.userId, userId)
    });

    // Get candidates
    const candidatesData = await db.query.candidates.findMany({
      where: eq(candidates.userId, userId)
    });

    // Get offerings data with pricing tiers
    const offeringsData = await db.query.offerings.findMany({
      where: eq(offerings.userId, userId),
      with: {
        features: true,
        roadmapItems: true,
      }
    });

    // Get pricing tiers data
    const pricingTiersData = await db.query.pricingTiers.findMany({
      where: eq(pricingTiers.userId, userId)
    });

    // Format context sections
    let contextString = "Current Business Context:\n\n";

    // Add business info sections
    if (businessData.length > 0) {
      contextString += "Business Information:\n";
      for (const info of businessData) {
        if (info.fields && Object.keys(info.fields).length > 0) {
          contextString += `${info.section}:\n`;
          for (const [key, field] of Object.entries(info.fields)) {
            contextString += `- ${key}: ${field.value}\n`;
          }
        }
      }
    }

    // Add offerings information with pricing tiers
    if (offeringsData.length > 0) {
      contextString += "\nOfferings and Pricing:\n";
      for (const offering of offeringsData) {
        contextString += `\n${offering.name} (${offering.type}):\n`;
        contextString += `- Description: ${offering.description}\n`;
        contextString += `- Status: ${offering.status}\n`;

        // Add base price if exists
        if (offering.price) {
          contextString += `- Base Price: ${offering.price.amount} ${offering.price.currency}`;
          if (offering.price.billingCycle) {
            contextString += ` per ${offering.price.billingCycle}`;
          }
          contextString += '\n';
        }

        // Add pricing tiers for this offering
        const offeringTiers = pricingTiersData.filter(tier => tier.offeringId === offering.id);
        if (offeringTiers.length > 0) {
          contextString += "  Pricing Tiers:\n";
          for (const tier of offeringTiers) {
            contextString += `  - ${tier.name}: ${tier.price.amount} ${tier.price.currency}`;
            if (tier.price.billingCycle) {
              contextString += `/${tier.price.billingCycle}`;
            }
            contextString += `\n    ${tier.description}\n`;
            if (tier.features && tier.features.length > 0) {
              contextString += "    Features:\n";
              for (const feature of tier.features) {
                contextString += `    • ${feature}\n`;
              }
            }
          }
        }

        // Add features
        if (offering.features?.length > 0) {
          contextString += "  Features:\n";
          for (const feature of offering.features) {
            contextString += `  - ${feature.name}: ${feature.description} (${feature.status})\n`;
          }
        }

        // Add roadmap items
        if (offering.roadmapItems?.length > 0) {
          contextString += "  Roadmap:\n";
          for (const item of offering.roadmapItems) {
            contextString += `  - ${item.title} (${item.status}, Priority: ${item.priority})\n`;
            contextString += `    ${item.description}\n`;
            if (item.plannedDate) {
              contextString += `    Planned: ${new Date(item.plannedDate).toLocaleDateString()}\n`;
            }
          }
        }
      }
    }

    // Add team information
    if (teamData.length > 0) {
      contextString += "\nTeam Members:\n";
      for (const member of teamData) {
        contextString += `- ${member.name} (${member.role})\n  Department: ${member.department || 'Not specified'}\n  Status: ${member.status}\n`;
      }
    }

    // Add positions
    if (positionsData.length > 0) {
      contextString += "\nOpen Positions:\n";
      for (const position of positionsData) {
        contextString += `- ${position.title} (${position.department})\n  Status: ${position.status}\n  Priority: ${position.priority}\n`;
      }
    }

    // Add candidates
    if (candidatesData.length > 0) {
      contextString += "\nCandidates:\n";
      for (const candidate of candidatesData) {
        contextString += `- ${candidate.name} (for Position ID: ${candidate.positionId})\n  Status: ${candidate.status}\n`;
        if (candidate.skills && candidate.skills.length > 0) {
          contextString += `  Skills: ${candidate.skills.join(", ")}\n`;
        }
      }
    }

    return contextString;
  } catch (error) {
    console.error("Error fetching business context:", error);
    return "";
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
    // Get messages to summarize
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

    if (!messages.length) {
      return null;
    }

    // Create summarization prompt
    const conversationText = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join("\n");

    // the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024
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

    // Store the summary
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
    // Get database context
    const dbContext = await getBusinessContext(userId);

    // Get latest conversation summary for context
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
      Contextual Insights: ${JSON.stringify(latestSummary.contextualData, null, 2)}
      ` : ""}
      
      Your role is to be a thoughtful, strategic advisor who:
      1. Engages in natural, flowing conversation while maintaining deep context awareness
      2. Asks clarifying questions when needed to better understand complex situations
      3. Provides actionable strategic advice based on the full business context
      4. Creates focused tasks when there are clear action items
      5. Updates business fields when new information is provided
      6. References and utilizes all available context, including historical conversations
      7. Maintains long-term memory across multiple conversations through summaries
      8. Identifies patterns and connections between different aspects of the business
      
      When updating business fields, use this exact format:
      <field_update>
      {
        "businessInfoId": 1,
        "fields": {
          "targetSegments": {
            "value": ["Service Businesses", "Real Estate", "Small Business"],
            "type": "list"
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

    // the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      temperature: 0.7,
    });

    // Ensure we have a text response
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