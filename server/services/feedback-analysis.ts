import { Anthropic } from "@anthropic-ai/sdk";
import { z } from "zod";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Define the schema for feature suggestions
const featureSuggestionSchema = z.object({
  title: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  impact: z.enum(["LOW", "MEDIUM", "HIGH"]),
  timeline: z.enum(["SHORT", "MEDIUM", "LONG"]),
  supportingEvidence: z.array(z.string()),
});

export type FeatureSuggestion = z.infer<typeof featureSuggestionSchema>;

export async function analyzeFeedback(feedback: string): Promise<FeatureSuggestion[]> {
  const systemPrompt = `You are a product analyst AI that analyzes user feedback and converts it into structured feature suggestions.
Your task is to analyze the provided feedback and identify potential features or improvements.
Format your response as a JSON array of feature suggestions, where each suggestion has:
- title: A concise name for the feature
- description: A clear explanation of what the feature entails
- confidence: A number between 0 and 1 indicating how confident you are in this suggestion based on the feedback
- impact: "LOW", "MEDIUM", or "HIGH" indicating the potential impact on users
- timeline: "SHORT", "MEDIUM", or "LONG" indicating the estimated implementation timeline
- supportingEvidence: Array of quotes or references from the feedback that support this suggestion

Example format:
[{
  "title": "Dark Mode Support",
  "description": "Add a dark theme option for better nighttime viewing",
  "confidence": 0.9,
  "impact": "MEDIUM",
  "timeline": "SHORT",
  "supportingEvidence": ["User mentioned eye strain at night", "Multiple requests for dark mode"]
}]`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 4000,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: `Analyze this feedback and suggest features: ${feedback}`
      }]
    });

    const content = message.content[0].text;
    if (!content) {
      throw new Error("No content in response");
    }

    // Parse the JSON response
    try {
      const suggestions = JSON.parse(content) as Array<unknown>;
      const validatedSuggestions = suggestions.map(suggestion => 
        featureSuggestionSchema.parse(suggestion)
      );
      return validatedSuggestions;
    } catch (error) {
      console.error("Failed to parse LLM response:", error);
      throw new Error("Failed to parse feature suggestions");
    }
  } catch (error) {
    console.error("Error calling Claude:", error);
    throw new Error("Failed to analyze feedback");
  }
}