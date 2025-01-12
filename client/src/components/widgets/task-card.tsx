import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Task } from "@db/schema";

export function TaskCard({ task }: { task: Task }) {
  const statusColors = {
    todo: "bg-yellow-500",
    inProgress: "bg-blue-500",
    completed: "bg-green-500"
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
          <Badge variant="secondary" className={statusColors[task.status as keyof typeof statusColors]}>
            {task.status}
          </Badge>
        </div>
      </CardHeader>
      {task.description && (
        <CardContent className="text-xs text-muted-foreground">
          {task.description}
        </CardContent>
      )}
    </Card>
  );
}
