import Anthropic from '@anthropic-ai/sdk';
import { db } from '@db';
import { tasks, businessInfo, type Task } from '@db/schema';
import { eq } from 'drizzle-orm';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type BusinessSection = {
  name: string;
  template: string;
  fields: {
    name: string;
    type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'list';
    description: string;
  }[];
};

export const businessSections: BusinessSection[] = [
  {
    name: "Business Overview",
    template: `Company Profile:
[company_name]: Full legal business name
[industry]: Primary and secondary industry classifications
[founded_date]: Company founding date
[location]: Primary business location
[company_stage]: Current company stage (startup, growth, mature)

Mission & Vision:
[mission_statement]: Core mission of the company
[vision_statement]: Long-term vision and aspirations

Value Proposition:
[unique_value]: Primary value proposition
[target_audience]: Description of ideal customer
[key_benefits]: Main benefits offered to customers

Strategic Goals:
[short_term_goals]: Goals for next 12 months
[long_term_goals]: 3-5 year strategic objectives
[growth_targets]: Specific growth metrics and targets`,
    fields: [
      { name: "company_name", type: "text", description: "Full legal business name" },
      { name: "industry", type: "text", description: "Primary and secondary industry classifications" },
      { name: "founded_date", type: "date", description: "Company founding date" },
      { name: "location", type: "text", description: "Primary business location" },
      { name: "company_stage", type: "text", description: "Current company stage (startup, growth, mature)" },
      { name: "mission_statement", type: "text", description: "Core mission of the company" },
      { name: "vision_statement", type: "text", description: "Long-term vision and aspirations" },
      { name: "unique_value", type: "text", description: "Primary value proposition" },
      { name: "target_audience", type: "text", description: "Description of ideal customer" },
      { name: "key_benefits", type: "list", description: "Main benefits offered to customers" },
      { name: "short_term_goals", type: "list", description: "Goals for next 12 months" },
      { name: "long_term_goals", type: "list", description: "3-5 year strategic objectives" },
      { name: "growth_targets", type: "list", description: "Specific growth metrics and targets" }
    ]
  },
  {
    name: "Financial Overview",
    template: `Current Financial Status:
[revenue_current]: Current annual revenue
[revenue_target]: Annual revenue target
[growth_rate]: Monthly growth rate
[burn_rate]: Monthly burn rate
[runway]: Remaining runway in months

Key Metrics:
[cac]: Customer Acquisition Cost
[ltv]: Customer Lifetime Value
[gross_margin]: Gross margin percentage
[mrr]: Monthly Recurring Revenue
[arpu]: Average Revenue Per User

Investment Status:
[funding_stage]: Current funding stage
[total_raised]: Total capital raised
[latest_valuation]: Latest company valuation
[equity_available]: Available equity percentage

Financial Projections:
[revenue_projection]: 12-month revenue projection
[profitability_target]: Expected profitability date
[funding_requirements]: Additional funding needed`,
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
      { name: "arpu", type: "currency", description: "Average Revenue Per User" },
      { name: "funding_stage", type: "text", description: "Current funding stage" },
      { name: "total_raised", type: "currency", description: "Total capital raised" },
      { name: "latest_valuation", type: "currency", description: "Latest company valuation" },
      { name: "equity_available", type: "percentage", description: "Available equity percentage" },
      { name: "revenue_projection", type: "currency", description: "12-month revenue projection" },
      { name: "profitability_target", type: "date", description: "Expected profitability date" },
      { name: "funding_requirements", type: "currency", description: "Additional funding needed" }
    ]
  },
  {
    name: "Market Intelligence",
    template: `Market Size:
[tam]: Total Addressable Market size
[sam]: Serviceable Available Market size
[som]: Serviceable Obtainable Market size

Customer Segments:
[primary_segments]: Primary customer segments
[segment_characteristics]: Key characteristics of each segment
[customer_pain_points]: Major pain points addressed

Competitive Analysis:
[direct_competitors]: Direct competitors and their strengths
[indirect_competitors]: Indirect competitors and alternatives
[competitive_advantages]: Our key competitive advantages

Market Trends:
[industry_trends]: Current industry trends
[technology_trends]: Relevant technology trends
[regulatory_changes]: Important regulatory considerations

Growth Strategy:
[market_opportunities]: Identified market opportunities
[expansion_markets]: Potential markets for expansion
[strategic_partnerships]: Potential strategic partnerships`,
    fields: [
      { name: "tam", type: "currency", description: "Total Addressable Market size" },
      { name: "sam", type: "currency", description: "Serviceable Available Market size" },
      { name: "som", type: "currency", description: "Serviceable Obtainable Market size" },
      { name: "primary_segments", type: "list", description: "Primary customer segments" },
      { name: "segment_characteristics", type: "list", description: "Key characteristics of each segment" },
      { name: "customer_pain_points", type: "list", description: "Major pain points addressed" },
      { name: "direct_competitors", type: "list", description: "Direct competitors and their strengths" },
      { name: "indirect_competitors", type: "list", description: "Indirect competitors and alternatives" },
      { name: "competitive_advantages", type: "list", description: "Our key competitive advantages" },
      { name: "industry_trends", type: "list", description: "Current industry trends" },
      { name: "technology_trends", type: "list", description: "Relevant technology trends" },
      { name: "regulatory_changes", type: "list", description: "Important regulatory considerations" },
      { name: "market_opportunities", type: "list", description: "Identified market opportunities" },
      { name: "expansion_markets", type: "list", description: "Potential markets for expansion" },
      { name: "strategic_partnerships", type: "list", description: "Potential strategic partnerships" }
    ]
  },
  {
    name: "Human Capital",
    template: `Team Structure:
[team_size]: Current team size
[departments]: Active departments
[leadership_positions]: Key leadership roles
[reporting_structure]: Organizational hierarchy

Hiring Plan:
[immediate_needs]: Immediate hiring needs
[future_roles]: Planned future positions
[skill_requirements]: Critical skill requirements
[recruitment_strategy]: Recruitment approach

Development & Culture:
[training_programs]: Active training programs
[career_paths]: Defined career progression
[culture_initiatives]: Culture-building initiatives
[performance_metrics]: Key performance indicators

Employee Experience:
[benefits_package]: Employee benefits offered
[retention_strategy]: Staff retention approach
[satisfaction_metrics]: Employee satisfaction measures
[workplace_policies]: Key workplace policies`,
    fields: [
      { name: "team_size", type: "number", description: "Current team size" },
      { name: "departments", type: "list", description: "Active departments" },
      { name: "leadership_positions", type: "list", description: "Key leadership roles" },
      { name: "reporting_structure", type: "text", description: "Organizational hierarchy" },
      { name: "immediate_needs", type: "list", description: "Immediate hiring needs" },
      { name: "future_roles", type: "list", description: "Planned future positions" },
      { name: "skill_requirements", type: "list", description: "Critical skill requirements" },
      { name: "recruitment_strategy", type: "text", description: "Recruitment approach" },
      { name: "training_programs", type: "list", description: "Active training programs" },
      { name: "career_paths", type: "text", description: "Defined career progression" },
      { name: "culture_initiatives", type: "list", description: "Culture-building initiatives" },
      { name: "performance_metrics", type: "list", description: "Key performance indicators" },
      { name: "benefits_package", type: "text", description: "Employee benefits offered" },
      { name: "retention_strategy", type: "text", description: "Staff retention approach" },
      { name: "satisfaction_metrics", type: "list", description: "Employee satisfaction measures" },
      { name: "workplace_policies", type: "list", description: "Key workplace policies" }
    ]
  },
  {
    name: "Operations",
    template: `Core Processes:
[product_delivery]: Product/service delivery process
[quality_metrics]: Quality control standards
[delivery_timeline]: Standard delivery timeline
[process_efficiency]: Process efficiency metrics

Technology Infrastructure:
[tech_stack]: Current technology stack
[system_integrations]: System integration points
[security_measures]: Security protocols
[tech_scalability]: Infrastructure scalability

Customer Support:
[response_time]: Target response time
[resolution_rate]: Issue resolution rate
[satisfaction_goal]: Customer satisfaction target
[support_channels]: Available support channels

Operational Improvements:
[current_initiatives]: Active improvement initiatives
[automation_opportunities]: Potential automation areas
[cost_optimization]: Cost reduction opportunities
[quality_improvements]: Quality enhancement plans`,
    fields: [
      { name: "product_delivery", type: "text", description: "Product/service delivery process" },
      { name: "quality_metrics", type: "list", description: "Quality control standards" },
      { name: "delivery_timeline", type: "text", description: "Standard delivery timeline" },
      { name: "process_efficiency", type: "list", description: "Process efficiency metrics" },
      { name: "tech_stack", type: "list", description: "Current technology stack" },
      { name: "system_integrations", type: "list", description: "System integration points" },
      { name: "security_measures", type: "list", description: "Security protocols" },
      { name: "tech_scalability", type: "text", description: "Infrastructure scalability" },
      { name: "response_time", type: "number", description: "Target response time in hours" },
      { name: "resolution_rate", type: "percentage", description: "Issue resolution rate" },
      { name: "satisfaction_goal", type: "percentage", description: "Customer satisfaction target" },
      { name: "support_channels", type: "list", description: "Available support channels" },
      { name: "current_initiatives", type: "list", description: "Active improvement initiatives" },
      { name: "automation_opportunities", type: "list", description: "Potential automation areas" },
      { name: "cost_optimization", type: "list", description: "Cost reduction opportunities" },
      { name: "quality_improvements", type: "list", description: "Quality enhancement plans" }
    ]
  }
];

// Add new function for processing field updates
async function processFieldUpdate(
  businessInfoId: number,
  fieldUpdates: Record<string, any>,
  reason: string
) {
  const [info] = await db
    .update(businessInfo)
    .set({
      fields: fieldUpdates,
      updatedAt: new Date()
    })
    .where(eq(businessInfo.id, businessInfoId))
    .returning();

  if (!info) {
    throw new Error('Failed to update business info fields');
  }

  // Add to history
  await db.insert(businessInfoHistory).values({
    businessInfoId: info.id,
    userId: info.userId,
    content: info.content,
    fields: info.fields,
    updatedBy: 'ai',
    reason: reason,
    metadata: { source: 'ai-update' }
  });

  return info;
}

type SuggestedAction = {
  label: string;
  type: 'field_update' | 'task_creation' | 'analysis';
  value: string;
};

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
    2. Asks clarifying questions to better understand situations
    3. Provides actionable strategic advice
    4. Creates focused tasks when there are clear action items
    5. Updates business fields when new information is provided
    6. Maintains context across the conversation

    Always provide 2-3 suggested next actions after your response in this format:
    <suggested_actions>
    [
      {
        "label": "Button text to show user",
        "type": "field_update|task_creation|analysis",
        "value": "The message to send when this action is clicked"
      }
    ]
    </suggested_actions>

    When updating business fields, use this exact format:
    <field_update>
    {
      "businessInfoId": 1,
      "fields": {
        "fieldName": {
          "value": "updated value",
          "type": "text|number|currency|percentage|date|list",
          "updatedAt": "2025-01-12T00:00:00.000Z",
          "updatedBy": "ai"
        }
      }
    }
    </field_update>

    When creating tasks, use this format:
    <task>
    {
      "title": "Task title",
      "description": "Detailed task description",
      "status": "todo"
    }
    </task>` :
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

    // Check for task creation
    const taskMatches = finalResponse.match(/<task>([^<]+)<\/task>/gm);
    if (taskMatches) {
      console.log("Found task creations:", taskMatches.length);
      for (const match of taskMatches) {
        const taskJson = match.replace(/<\/?task>/g, '');
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
  } catch (error: any) {
    console.error("Error processing AI message:", error);
    throw error;
  }
}