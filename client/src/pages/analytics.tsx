import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { AnalyticsCard } from "@/components/widgets/analytics-card";
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
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={taskCompletion}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Response Time Analysis</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={responseTime}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 col-span-full">
          <h3 className="text-lg font-semibold mb-4">Task Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
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
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
