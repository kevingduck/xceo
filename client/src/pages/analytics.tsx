import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AnalyticsCard } from "@/components/widgets/analytics-card";
import { RocketIcon, TrendingUpIcon, BrainIcon } from "lucide-react";
import type { Analytics } from "@db/schema";

export default function Analytics() {
  const { data: analytics = [] } = useQuery<Analytics[]>({
    queryKey: ["/api/analytics"]
  });

  // Extract AI insights with safe defaults
  const aiInsights = analytics
    .find(a => a.type === 'ai_insights')
    ?.data as {
      summary: string;
      recommendations: string[];
      predictions: {
        nextWeek: number;
        nextMonth: number;
      };
    } || {
      summary: "Getting started with your analytics dashboard",
      recommendations: [
        "Start by creating your first task",
        "Set clear deadlines for your tasks",
        "Track progress regularly"
      ],
      predictions: { nextWeek: 0, nextMonth: 0 }
    };

  const taskCompletion = (analytics
    .filter(a => a.type === "task_completion")
    .map(a => ({
      date: new Date(a.createdAt).toLocaleDateString(),
      value: ((a.data as any)?.completedTasks) || 0,
      rate: ((a.data as any)?.completionRate || 0) * 100
    }))) || [];

  const responseTime = (analytics
    .filter(a => a.type === "response_time")
    .map(a => ({
      date: new Date(a.createdAt).toLocaleDateString(),
      value: ((a.data as any)?.averageTime || 0) / 1000 // Convert to seconds
    }))) || [];

  const taskDistribution = (analytics
    .filter(a => a.type === "task_distribution")
    .map(a => Object.entries((a.data as any) || {}).map(([name, value]) => ({
      name,
      value: value || 0
    }))).flat()) || [];

  const latestCompletion = (analytics
    .find(a => a.type === "task_completion")
    ?.data as any) || {
      completionRate: 0,
      totalTasks: 0,
      completedTasks: 0,
      averageTimeToComplete: 0
    };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnalyticsCard
          title="Task Completion Rate"
          value={`${Math.round((latestCompletion.completionRate || 0) * 100)}%`}
          change={`${aiInsights.predictions.nextWeek > (latestCompletion.completionRate || 0) ? '+' : ''}${Math.round((aiInsights.predictions.nextWeek - (latestCompletion.completionRate || 0)) * 100)}%`}
        />
        <AnalyticsCard
          title="Total Tasks"
          value={latestCompletion.totalTasks || 0}
          change={`+${latestCompletion.completedTasks || 0}`}
        />
        <AnalyticsCard
          title="Avg. Completion Time"
          value={`${Math.round((latestCompletion.averageTimeToComplete || 0) / 3600)}h`}
          change="-2h"
        />
      </div>

      <Card className="p-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainIcon className="h-5 w-5" />
            AI Performance Insights
          </CardTitle>
          <CardDescription>{aiInsights.summary}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-semibold">Recommendations:</h3>
            <ul className="space-y-2">
              {aiInsights.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <RocketIcon className="h-5 w-5 shrink-0 text-primary" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
            <Alert>
              <AlertTitle className="flex items-center gap-2">
                <TrendingUpIcon className="h-4 w-4" />
                Predictions
              </AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  <p>Next week's completion rate: {Math.round(aiInsights.predictions.nextWeek * 100)}%</p>
                  <p>Next month's completion rate: {Math.round(aiInsights.predictions.nextMonth * 100)}%</p>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Task Completion Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {taskCompletion.length > 0 ? (
                  <LineChart data={taskCompletion}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" name="Completed Tasks" stroke="#3b82f6" />
                    <Line type="monotone" dataKey="rate" name="Completion Rate %" stroke="#10b981" />
                  </LineChart>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No task completion data yet
                  </div>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader>
            <CardTitle>Response Time Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {responseTime.length > 0 ? (
                  <BarChart data={responseTime}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Response Time (s)" fill="#3b82f6" />
                  </BarChart>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No response time data yet
                  </div>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6 col-span-full">
          <CardHeader>
            <CardTitle>Task Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {taskDistribution.length > 0 ? (
                  <PieChart>
                    <Pie
                      data={taskDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#3b82f6"
                    />
                    <Tooltip />
                  </PieChart>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No task distribution data yet
                  </div>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}