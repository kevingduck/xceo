import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import type { Task, Analytics, BusinessInfo } from "@db/schema";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorBoundary } from "@/components/error-boundary";
import { AsyncErrorBoundary, AsyncErrorFallback } from "@/components/async-error-boundary";

function DashboardContent() {
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useQuery<Task[]>({ 
    queryKey: ['/api/tasks'],
    retry: 2,
    retryDelay: 1000,
  });

  const { data: analytics = [], isLoading: analyticsLoading, error: analyticsError } = useQuery<Analytics[]>({ 
    queryKey: ['/api/analytics'],
    retry: 2,
    retryDelay: 1000,
  });

  const { data: businessInfo = [], isLoading: businessLoading, error: businessInfoError } = useQuery<BusinessInfo[]>({
    queryKey: ['/api/business-info'],
    retry: 2,
    retryDelay: 1000,
  });

  if (tasksLoading || analyticsLoading || businessLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check for errors and throw them to be caught by error boundary
  if (tasksError) throw tasksError;
  if (analyticsError) throw analyticsError;
  if (businessInfoError) throw businessInfoError;

  const tasksByStatus = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const recentBusinessUpdates = businessInfo
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const upcomingTasks = tasks
    .filter(task => task.status === "todo")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, 3);

  const inProgressTasks = tasks
    .filter(task => task.status === "in_progress")
    .slice(0, 3);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <ErrorBoundary level="section" isolate>
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>Upcoming and in-progress tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {upcomingTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Circle className="h-4 w-4" />
                    To Do
                  </h4>
                  <div className="grid gap-2">
                    {upcomingTasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 text-sm">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span>{task.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inProgressTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    In Progress
                  </h4>
                  <div className="grid gap-2">
                    {inProgressTasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 text-sm">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span>{task.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </ErrorBoundary>

      <ErrorBoundary level="section" isolate>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Updates</CardTitle>
            <CardDescription>Latest changes across business sections</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-4">
                {recentBusinessUpdates.map((info) => (
                  <div key={info.id} className="flex items-start gap-2">
                    <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{info.section}</h4>
                        <Badge variant="outline" className="text-xs">
                          {new Date(info.updatedAt).toLocaleDateString()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {info.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </ErrorBoundary>

      <ErrorBoundary level="section" isolate>
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
      </ErrorBoundary>
    </div>
  );
}

export default function Dashboard() {
  return (
    <AsyncErrorBoundary
      fallback={<AsyncErrorFallback error={new Error("Failed to load dashboard")} resetError={() => window.location.reload()} />}
    >
      <DashboardContent />
    </AsyncErrorBoundary>
  );
}