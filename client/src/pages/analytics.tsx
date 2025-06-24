import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { AnalyticsCard } from "@/components/widgets/analytics-card";
import { LazyLineChart, LazyBarChart, LazyPieChart } from "@/components/charts/lazy-charts";
import type { Analytics } from "@db/schema";

export default function Analytics() {
  const { data: analytics = [] } = useQuery<Analytics[]>({
    queryKey: ["/api/analytics"]
  });

  const taskCompletion = analytics
    .filter(a => a.type === "task_completion")
    .map(a => ({
      date: new Date(a.createdAt).toLocaleDateString(),
      value: (a.data as any).completedTasks
    }));

  const responseTime = analytics
    .filter(a => a.type === "response_time")
    .map(a => ({
      date: new Date(a.createdAt).toLocaleDateString(),
      value: (a.data as any).averageTime
    }));

  const taskDistribution = analytics
    .filter(a => a.type === "task_distribution")
    .map(a => ({
      name: (a.data as any).category,
      value: (a.data as any).count
    }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnalyticsCard
          title="Total Tasks"
          value={analytics.reduce((acc, a) => acc + ((a.data as any).totalTasks || 0), 0)}
          change="+12%"
        />
        <AnalyticsCard
          title="Completion Rate"
          value="87%"
          change="+5%"
        />
        <AnalyticsCard
          title="Active Projects"
          value={analytics.reduce((acc, a) => acc + ((a.data as any).activeProjects || 0), 0)}
          change="-2"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Task Completion Trend</h3>
          <div className="h-[300px]">
            <LazyLineChart data={taskCompletion} />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Response Time Analysis</h3>
          <div className="h-[300px]">
            <LazyBarChart data={responseTime} />
          </div>
        </Card>

        <Card className="p-6 col-span-full">
          <h3 className="text-lg font-semibold mb-4">Task Distribution</h3>
          <div className="h-[300px]">
            <LazyPieChart data={taskDistribution} />
          </div>
        </Card>
      </div>
    </div>
  );
}
