import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { SortableTask } from "./sortable-task";
import type { Task } from "@db/schema";

interface DroppableColumnProps {
  id: string;
  title: string;
  tasks: Task[];
}

export function DroppableColumn({ id, title, tasks }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "space-y-2 p-4 bg-background/50 rounded-lg border transition-colors",
        isOver && "bg-primary/5 border-primary/50"
      )}
    >
      <h3 className="font-semibold">{title}</h3>
      <SortableContext
        items={tasks.map(t => t.id.toString())}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {tasks.map(task => (
            <SortableTask key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
