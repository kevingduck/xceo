import Anthropic from '@anthropic-ai/sdk';
import { db } from '@db';
import { tasks, type Task } from '@db/schema';

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

export async function processAIMessage(userId: number, userMessage: string, businessContext?: {
  name: string;
  description: string;
  objectives: string[];
}) {
  const systemPrompt = businessContext ? 
    `You are an AI CEO assistant for ${businessContext.name}. Business Description: ${businessContext.description}. Key Objectives: ${businessContext.objectives.join(", ")}.
    You have access to the following tools that you can use to help manage the business:
    ${JSON.stringify(availableTools, null, 2)}
    
    When you want to use a tool, format your response like this:
    <tool>create_task</tool>
    <parameters>
    {
      "title": "Example Task",
      "description": "This is a task description",
      "status": "todo"
    }
    </parameters>
    
    You can use multiple tools in one response. Always explain what you're doing before using tools.
    For your first message, welcome the user and suggest 2-3 concrete next steps to help them achieve their business objectives.` :
    'You are an AI CEO assistant. Please ask the user to configure their business details first.';

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    max_tokens: 1024,
  });

  let finalResponse = response.content[0].text;
  const toolMatches = finalResponse.match(/<tool>(.*?)<\/tool>\s*<parameters>(.*?)<\/parameters>/gs);

  if (toolMatches) {
    for (const match of toolMatches) {
      const toolName = match.match(/<tool>(.*?)<\/tool>/)?.[1];
      const parameters = JSON.parse(match.match(/<parameters>(.*?)<\/parameters>/s)?.[1] || "{}");

      if (toolName === "create_task") {
        const task = await createTask(userId, parameters);
        finalResponse = finalResponse.replace(match, `✓ Created task: ${task.title}`);
      }
    }
  }

  return finalResponse;
}
