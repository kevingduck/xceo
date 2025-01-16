import Anthropic from '@anthropic-ai/sdk';
import { db } from '@db';
import { tasks, businessInfo, businessInfoHistory, teamMembers, positions, candidates, conversationSummaries, chatMessages } from '@db/schema';
import { eq, desc, and, gt } from 'drizzle-orm';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ... [rest of the code from the edited snippet] ...

export { summarizeAndStoreConversation, getLatestConversationSummary };