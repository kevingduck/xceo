import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";
import type { Task, Analytics } from "@db/schema";

export default function Dashboard() {
  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({ 
    queryKey: ['/api/tasks'] 
  });
  
  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics[]>({ 
    queryKey: ['/api/analytics'] 
  });

  if (tasksLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const tasksByStatus = tasks?.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Activity Overview</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics}>
              <XAxis dataKey="createdAt" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="data.value" stroke="#3b82f6" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Todo</span>
              <span className="font-bold">{tasksByStatus.todo || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>In Progress</span>
              <span className="font-bold">{tasksByStatus.inProgress || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Completed</span>
              <span className="font-bold">{tasksByStatus.completed || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasks?.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-sm truncate">{task.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
