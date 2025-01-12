import { db } from '@db';
import { analytics, tasks, chatMessages } from '@db/schema';
import { eq, and, sql } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type TaskMetrics = {
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
  averageTimeToComplete: number;
  tasksByCategory: Record<string, number>;
};

export async function trackTaskMetrics(userId: number) {
  try {
    // Calculate task completion rate and statistics
    const taskStats = await db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`,
        avgCompletionTime: sql<number>`
          avg(
            case 
              when status = 'completed' 
              then extract(epoch from (updated_at - created_at))
              else null 
            end
          )`
      })
      .from(tasks)
      .where(eq(tasks.userId, userId));

    const completionRate = taskStats[0].total > 0 ? 
      taskStats[0].completed / taskStats[0].total : 0;

    // Track task distribution
    const taskDistribution = await db
      .select({
        status: tasks.status,
        count: sql<number>`count(*)`
      })
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .groupBy(tasks.status);

    // Get task trend data for AI analysis
    const taskTrend = await db
      .select({
        date: sql<string>`date_trunc('day', created_at)::text`,
        completed: sql<number>`count(case when status = 'completed' then 1 end)`,
        total: sql<number>`count(*)`
      })
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .groupBy(sql`date_trunc('day', created_at)`)
      .orderBy(sql`date_trunc('day', created_at)`);

    // Ensure we have default values for empty states
    const stats = {
      completedTasks: taskStats[0].completed || 0,
      totalTasks: taskStats[0].total || 0,
      completionRate: completionRate || 0,
      averageTimeToComplete: taskStats[0].avgCompletionTime || 0
    };

    const distribution = Object.fromEntries(
      taskDistribution.map(d => [d.status || 'unknown', d.count || 0])
    );

    // Generate AI insights with error handling
    let aiInsights;
    try {
      aiInsights = await generateAIInsights({
        taskStats: {
          completionRate,
          totalTasks: stats.totalTasks,
          completedTasks: stats.completedTasks,
          averageTimeToComplete: stats.averageTimeToComplete,
          tasksByCategory: distribution
        },
        taskTrend: taskTrend.length > 0 ? taskTrend : [{ 
          date: new Date().toISOString().split('T')[0],
          completed: 0,
          total: 0
        }]
      });
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      aiInsights = {
        summary: "Getting started with task analytics",
        recommendations: [
          "Start by creating your first task",
          "Set clear deadlines for your tasks",
          "Track progress regularly"
        ],
        predictions: {
          nextWeek: 0,
          nextMonth: 0
        }
      };
    }

    // Save analytics data with error handling
    await db.insert(analytics).values([
      {
        userId,
        type: 'task_completion',
        data: stats
      },
      {
        userId,
        type: 'task_distribution',
        data: distribution
      },
      {
        userId,
        type: 'ai_insights',
        data: aiInsights
      }
    ]);
  } catch (error) {
    console.error('Failed to track task metrics:', error);
    throw new Error('Failed to update analytics');
  }
}

export async function trackResponseTime(userId: number, responseTime: number) {
  try {
    await db.insert(analytics).values({
      userId,
      type: 'response_time',
      data: {
        averageTime: responseTime
      }
    });
  } catch (error) {
    console.error('Failed to track response time:', error);
    throw new Error('Failed to update response time analytics');
  }
}

async function generateAIInsights(data: {
  taskStats: TaskMetrics;
  taskTrend: Array<{
    date: string;
    completed: number;
    total: number;
  }>;
}): Promise<{
  summary: string;
  recommendations: string[];
  predictions: {
    nextWeek: number;
    nextMonth: number;
  };
}> {
  const prompt = `Analyze this business performance data and provide insights:
Task Statistics:
- Completion rate: ${data.taskStats.completionRate * 100}%
- Total tasks: ${data.taskStats.totalTasks}
- Completed tasks: ${data.taskStats.completedTasks}
- Average completion time: ${Math.round(data.taskStats.averageTimeToComplete / 3600)} hours

Task Trend (last ${data.taskTrend.length} days):
${data.taskTrend.map(d => 
  `${d.date}: ${d.completed}/${d.total} tasks completed`
).join('\n')}

Provide the following in JSON format:
1. A brief summary of the current performance
2. Three specific recommendations for improvement
3. Predictions for task completion rates for next week and next month (as decimals)
`;

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    // Access the content directly from the first message
    const content = response.content[0];
    if ('text' in content) {
      return JSON.parse(content.text);
    }
    throw new Error('Unexpected response format from Anthropic API');
  } catch (error) {
    console.error('Failed to parse AI insights:', error);
    return {
      summary: "Unable to generate insights at this time.",
      recommendations: [
        "Continue monitoring task completion rates",
        "Review task distribution regularly",
        "Set clear deadlines for tasks"
      ],
      predictions: {
        nextWeek: data.taskStats.completionRate,
        nextMonth: data.taskStats.completionRate
      }
    };
  }
}