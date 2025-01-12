import Anthropic from '@anthropic-ai/sdk';
import { db } from '@db';
import { tasks, businessInfo, type Task } from '@db/schema';
import { eq } from 'drizzle-orm';

// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type BusinessSection = {
  name: string;
  template: string;
};

const businessSections: BusinessSection[] = [
  {
    name: "Business Overview",
    template: `Company Profile:
- Company Name: [Name]
- Industry: [Industry]
- Founded: [Year]
- Location: [Location]

Mission Statement:
[A clear, concise statement of the company's purpose and values]

Key Objectives:
1. [Primary business goal]
2. [Growth target]
3. [Market position goal]

Value Proposition:
[Description of unique value offered to customers]`
  },
  {
    name: "Financial Overview",
    template: `Revenue Targets:
- Annual Target: $[X]M
- Monthly Growth Rate: [X]%
- Current Run Rate: $[X]M

Key Financial Metrics:
1. Customer Acquisition Cost (CAC): $[X]
2. Lifetime Value (LTV): $[X]
3. Gross Margin: [X]%
4. Monthly Recurring Revenue: $[X]K

Investment & Funding:
- Current Funding Stage: [Stage]
- Capital Raised: $[X]M
- Runway: [X] months

Financial Goals:
1. [Revenue milestone]
2. [Profitability target]
3. [Cost optimization goal]`
  },
  {
    name: "Market Intelligence",
    template: `Target Market:
- Total Addressable Market: $[X]B
- Serviceable Obtainable Market: $[X]M
- Primary Customer Segments: [List segments]

Competitive Landscape:
1. Direct Competitors
   - [Competitor 1]: [Key differentiator]
   - [Competitor 2]: [Key differentiator]
2. Indirect Competitors
   - [Alternative solution]
   - [Market substitute]

Market Trends:
1. [Industry trend 1]
2. [Technology trend]
3. [Consumer behavior shift]

Growth Opportunities:
1. [Market expansion opportunity]
2. [Product development direction]
3. [Partnership potential]`
  },
  {
    name: "Human Capital",
    template: `Organizational Structure:
- Current Team Size: [X] employees
- Departments: [List key departments]
- Key Leadership Positions: [List positions]

Hiring Plan:
Q1: [Roles and headcount]
Q2: [Roles and headcount]
Q3: [Roles and headcount]
Q4: [Roles and headcount]

Team Development:
1. Training Programs: [List programs]
2. Career Growth Paths: [Define paths]
3. Culture Initiatives: [List initiatives]

Performance Metrics:
- KPIs by Role
- Development Goals
- Team Satisfaction Metrics`
  },
  {
    name: "Operations",
    template: `Core Processes:
1. Product/Service Delivery
   - [Key process steps]
   - [Quality metrics]
   - [Delivery timeline]

2. Customer Support
   - Response Time Target: [X] hours
   - Resolution Rate Target: [X]%
   - Customer Satisfaction Goal: [X]%

Technology Stack:
- [List key technologies]
- [Infrastructure details]
- [Integration points]

Operational Metrics:
1. [Efficiency metric]
2. [Quality metric]
3. [Cost metric]

Improvement Initiatives:
1. [Current initiative]
2. [Planned upgrade]
3. [Process optimization]`
  }
];

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
    5. Maintains context across the conversation
    6. Treats the user as a peer, not just following commands

    Communication Guidelines:
    - Be conversational and natural in your responses
    - Ask thoughtful questions when you need more context
    - Think through implications before making suggestions
    - Create tasks only when there are clear, actionable items
    - Focus on quality strategic discussion over quantity of actions
    - Sometimes just listen and discuss without taking action

    Business Information Templates:
    ${businessSections.map(section => 
      `${section.name}:\n${section.template}\n`
    ).join('\n')}

    When creating tasks, format them as:
    <task>
    {
      "title": "Task title",
      "description": "Detailed task description",
      "status": "todo"
    }
    </task>

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
      max_tokens: 4096,
      temperature: 0.7,
    });

    // Ensure we have a text response
    const messageContent = response.content[0];
    if (messageContent.type !== 'text') {
      return "I apologize, but I can only process text responses at the moment.";
    }

    let finalResponse = messageContent.text;

    // Check for task creation
    const taskMatches = finalResponse.match(/<task>([^<]+)<\/task>/gm);

    if (taskMatches) {
      console.log("Found task creations:", taskMatches.length);
      for (const match of taskMatches) {
        const taskJson = match.replace(/<\/?task>/g, '');
        let taskData;
        try {
          taskData = JSON.parse(taskJson);
        } catch (e) {
          console.error("Failed to parse task data:", e);
          continue;
        }

        console.log("Creating task:", taskData);

        try {
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
            `⚠ Failed to create task: ${error.message}`
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