import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, X, ChevronRight, Loader2 } from "lucide-react";
import type { Task } from "@db/schema";

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedDescription, setEditedDescription] = useState(task.description || "");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const queryClient = useQueryClient();

  const statusColors = {
    todo: "bg-yellow-500/10 text-yellow-600",
    inProgress: "bg-blue-500/10 text-blue-600",
    completed: "bg-green-500/10 text-green-600"
  };

  const updateTask = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsEditing(false);
    }
  });

  const deleteTask = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsDetailsOpen(false);
    }
  });

  const handleStatusChange = (newStatus: string) => {
    updateTask.mutate({ status: newStatus });
  };

  const handleSave = () => {
    updateTask.mutate({
      title: editedTitle,
      description: editedDescription
    });
  };

  return (
    <div>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            {isEditing ? (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-sm font-medium"
              />
            ) : (
              <Button 
                variant="ghost" 
                className="p-0 h-auto font-medium text-left hover:bg-transparent"
                onClick={() => setIsDetailsOpen(true)}
              >
                {task.title}
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Badge className={statusColors[task.status as keyof typeof statusColors]}>
                {task.status}
              </Badge>
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {isEditing && (
          <CardContent>
            <div className="space-y-4">
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Task description"
                className="min-h-[100px]"
              />
              <Select
                value={task.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="inProgress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex justify-between">
                <Button 
                  onClick={handleSave} 
                  disabled={updateTask.isPending}
                >
                  {updateTask.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => deleteTask.mutate()}
                  disabled={deleteTask.isPending}
                >
                  {deleteTask.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{task.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-1">Status</h3>
              <Badge className={statusColors[task.status as keyof typeof statusColors]}>
                {task.status}
              </Badge>
            </div>
            {task.description && (
              <div>
                <h3 className="text-sm font-medium mb-1">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}