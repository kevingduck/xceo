import { Anthropic } from "@anthropic-ai/sdk";
import { z } from "zod";

// Schema definitions
export const featureSuggestionSchema = z.object({
  title: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(100),
  impact: z.enum(["LOW", "MEDIUM", "HIGH"]),
  timeline: z.enum(["SHORT", "MEDIUM", "LONG"]),
  supportingEvidence: z.array(z.string())
});

export type FeatureSuggestion = z.infer<typeof featureSuggestionSchema>;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const SYSTEM_PROMPT = `You are a product analyst helping to analyze user feedback and generate feature suggestions. 
For each piece of feedback, generate structured feature suggestions.

Each suggestion must include:
- title: A short, clear title for the feature
- description: A brief description of what the feature does and why it's valuable
- confidence: A number between 0-100 indicating how strongly this feature is supported by the feedback
- impact: Expected business impact (LOW/MEDIUM/HIGH)
- timeline: Estimated implementation timeline (SHORT/MEDIUM/LONG)
- supportingEvidence: Array of specific quotes or points from the feedback that support this suggestion

Format your response EXACTLY as a JSON array of feature suggestions. Do not include any other text or explanation.`;

export async function analyzeFeedback(feedback: string): Promise<FeatureSuggestion[]> {
  try {
    // the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024
    const completion = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      temperature: 0.5,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Analyze this feedback and generate feature suggestions. Respond only with the JSON array: ${feedback}`
      }]
    });

    if (!completion.content || completion.content.length === 0) {
      throw new Error("Empty response from Claude");
    }

    const content = completion.content[0];
    if (content.type !== 'text') {
      throw new Error("Unexpected response type from Claude");
    }

    // Parse and validate the suggestions
    try {
      const rawSuggestions = JSON.parse(content.text);
      const result = z.array(featureSuggestionSchema).safeParse(rawSuggestions);

      if (!result.success) {
        console.error("Validation failed:", result.error);
        throw new Error("Invalid feature suggestions format");
      }

      return result.data;
    } catch (parseError) {
      console.error("Parse error:", parseError, "Raw response:", content.text);
      throw new Error("Failed to parse Claude's response as JSON");
    }
  } catch (error) {
    console.error("Error analyzing feedback:", error);
    throw error instanceof Error ? error : new Error("Failed to analyze feedback");
  }
}