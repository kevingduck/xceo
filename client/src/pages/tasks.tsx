import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TaskCard } from "@/components/widgets/task-card";
import { Plus } from "lucide-react";
import type { Task } from "@db/schema";
import { useGitHub } from "@/hooks/use-github";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableTask } from "@/components/widgets/sortable-task";

const columns = ["todo", "inProgress", "completed"] as const;
type ColumnId = typeof columns[number];

export default function Tasks() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();
  const { createIssue } = useGitHub();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: tasks = [] } = useQuery<Task[]>({
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
    }
  });

  const updateTask = useMutation({
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
      setTitle("");
      setDescription("");
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeTaskId = parseInt(active.id.toString());
    const activeTask = tasks.find(t => t.id === activeTaskId);
    const overId = over.id.toString() as ColumnId;

    if (
      activeTask &&
      columns.includes(overId) &&
      activeTask.status !== overId
    ) {
      updateTask.mutate({
        id: activeTask.id,
        status: overId
      });
    }
  };

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgressTasks = tasks.filter(t => t.status === "inProgress");
  const completedTasks = tasks.filter(t => t.status === "completed");

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <Dialog>
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
                Create Task
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            className="space-y-2 p-4 bg-background/50 rounded-lg border"
            id="todo"
          >
            <h3 className="font-semibold">To Do</h3>
            <SortableContext
              items={todoTasks.map(t => t.id.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {todoTasks.map(task => (
                  <SortableTask key={task.id} task={task} />
                ))}
              </div>
            </SortableContext>
          </div>

          <div 
            className="space-y-2 p-4 bg-background/50 rounded-lg border"
            id="inProgress"
          >
            <h3 className="font-semibold">In Progress</h3>
            <SortableContext
              items={inProgressTasks.map(t => t.id.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {inProgressTasks.map(task => (
                  <SortableTask key={task.id} task={task} />
                ))}
              </div>
            </SortableContext>
          </div>

          <div 
            className="space-y-2 p-4 bg-background/50 rounded-lg border"
            id="completed"
          >
            <h3 className="font-semibold">Completed</h3>
            <SortableContext
              items={completedTasks.map(t => t.id.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {completedTasks.map(task => (
                  <SortableTask key={task.id} task={task} />
                ))}
              </div>
            </SortableContext>
          </div>
        </div>
      </DndContext>
    </div>
  );
}