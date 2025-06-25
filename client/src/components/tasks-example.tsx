import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useApiError } from '@/hooks/use-api-error';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { Loader2, AlertCircle } from 'lucide-react';

// Type definitions
interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  createdAt: string;
  updatedAt: string;
}

// Schema for form validation
const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().optional(),
});

type CreateTaskForm = z.infer<typeof createTaskSchema>;

export function TasksExample() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { handleApiError } = useApiError();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form setup with validation
  const form = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  // Fetch tasks query with proper error handling
  const {
    data: tasksResponse,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiClient.get<{ data: Task[] }>('/api/tasks'),
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error instanceof ApiClientError && error.statusCode >= 400 && error.statusCode < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Create task mutation with error handling
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskForm) =>
      apiClient.post<{ data: Task }>('/api/tasks', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      form.reset();
      setIsDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
    },
    onError: (error) => {
      handleApiError(error, {
        fallbackMessage: 'Failed to create task',
        onError: (apiError) => {
          // Handle specific error codes
          if (apiError.code === 'VALIDATION_ERROR' && apiError.details) {
            // Set form errors for validation issues
            apiError.details.forEach((detail: any) => {
              form.setError(detail.field as keyof CreateTaskForm, {
                message: detail.message,
              });
            });
          }
        },
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) =>
      apiClient.delete(`/api/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
    },
    onError: (error) => {
      handleApiError(error, {
        fallbackMessage: 'Failed to delete task',
      });
    },
  });

  // Submit handler
  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await createTaskMutation.mutateAsync(data);
    } catch (error) {
      // Error is already handled by the mutation's onError
      console.error('Task creation failed:', error);
    }
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Error state with retry
  if (queryError && !tasksResponse) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Failed to load tasks</p>
        <p className="text-sm text-muted-foreground">
          {queryError instanceof ApiClientError ? queryError.message : 'An error occurred'}
        </p>
        <Button onClick={() => refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  const tasks = tasksResponse?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          Create Task
        </Button>
      </div>

      {/* Tasks list */}
      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tasks yet. Create your first task!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <h3 className="font-medium">{task.title}</h3>
                {task.description && (
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                )}
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteTaskMutation.mutate(task.id)}
                disabled={deleteTaskMutation.isPending}
              >
                {deleteTaskMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Delete'
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Create task dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
          <div className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-lg">
            <div className="bg-background p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-medium mb-4">Create New Task</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    {...form.register('title')}
                    placeholder="Task title"
                    disabled={createTaskMutation.isPending}
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>
                <div>
                  <Input
                    {...form.register('description')}
                    placeholder="Description (optional)"
                    disabled={createTaskMutation.isPending}
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={createTaskMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTaskMutation.isPending}
                  >
                    {createTaskMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Task'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}