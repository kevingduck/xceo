import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, TouchSensor } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DroppableColumn } from "@/components/widgets/droppable-column";
import { Plus, Loader2 } from "lucide-react";
import type { Task } from "@db/schema";
import { useGitHub } from "@/hooks/use-github";

export default function Tasks() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { createIssue } = useGitHub();

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"]
  });

  const createTask = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });

      if (!response.ok) throw new Error("Failed to create task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsDialogOpen(false);
      setTitle("");
      setDescription("");
    }
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include"
      });

      if (!response.ok) throw new Error("Failed to update task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const task = await createTask.mutateAsync({ title, description });
      if (task.id) {
        await createIssue({
          repo: "main",
          title,
          body: description
        });
      }
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = parseInt(active.id.toString());
    const newStatus = over.id.toString();

    if (isNaN(taskId) || !["todo", "inProgress", "completed"].includes(newStatus)) return;

    updateTaskStatus.mutate({ id: taskId, status: newStatus });
  };

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgressTasks = tasks.filter(t => t.status === "inProgress");
  const completedTasks = tasks.filter(t => t.status === "completed");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Input
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Task"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext 
        sensors={sensors}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DroppableColumn
            id="todo"
            title="To Do"
            tasks={todoTasks}
          />
          <DroppableColumn
            id="inProgress"
            title="In Progress"
            tasks={inProgressTasks}
          />
          <DroppableColumn
            id="completed"
            title="Completed"
            tasks={completedTasks}
          />
        </div>
      </DndContext>
    </div>
  );
}