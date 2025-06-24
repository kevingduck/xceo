import { Router } from 'express';
import { z } from 'zod';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { asyncHandler } from '../middleware/error-handler';
import { requireAuth } from '../middleware/auth';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  DatabaseError,
} from '../utils/error-response';

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// Schema definitions
const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
});

const updateTaskSchema = createTaskSchema.partial();

// GET /api/tasks - Get all tasks for the current user
router.get(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const userTasks = await db.query.tasks.findMany({
        where: eq(tasks.userId, req.user!.id),
        orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
      });

      res.json({
        success: true,
        data: userTasks,
        count: userTasks.length,
      });
    } catch (error) {
      throw new DatabaseError('Failed to fetch tasks', { error: error.message });
    }
  })
);

// POST /api/tasks - Create a new task
router.post(
  '/',
  asyncHandler(async (req, res) => {
    // Validate request body
    const result = createTaskSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Invalid task data', result.error.errors);
    }

    try {
      const [task] = await db
        .insert(tasks)
        .values({
          ...result.data,
          userId: req.user!.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      res.status(201).json({
        success: true,
        data: task,
        message: 'Task created successfully',
      });
    } catch (error) {
      throw new DatabaseError('Failed to create task', { error: error.message });
    }
  })
);

// PATCH /api/tasks/:id - Update a task
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      throw new ValidationError('Invalid task ID');
    }

    // Validate request body
    const result = updateTaskSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Invalid update data', result.error.errors);
    }

    // Check if task exists and belongs to user
    const [existingTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!existingTask) {
      throw new NotFoundError('Task');
    }

    if (existingTask.userId !== req.user!.id) {
      throw new AuthorizationError('You can only update your own tasks');
    }

    try {
      const [updatedTask] = await db
        .update(tasks)
        .set({
          ...result.data,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      res.json({
        success: true,
        data: updatedTask,
        message: 'Task updated successfully',
      });
    } catch (error) {
      throw new DatabaseError('Failed to update task', { error: error.message });
    }
  })
);

// DELETE /api/tasks/:id - Delete a task
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      throw new ValidationError('Invalid task ID');
    }

    // Check if task exists and belongs to user
    const [existingTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!existingTask) {
      throw new NotFoundError('Task');
    }

    if (existingTask.userId !== req.user!.id) {
      throw new AuthorizationError('You can only delete your own tasks');
    }

    try {
      await db.delete(tasks).where(eq(tasks.id, taskId));

      res.json({
        success: true,
        message: 'Task deleted successfully',
      });
    } catch (error) {
      throw new DatabaseError('Failed to delete task', { error: error.message });
    }
  })
);

export default router;