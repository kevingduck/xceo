import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '@db';
import { tasks, users, teamMembers } from '@db/schema';
import { eq } from 'drizzle-orm';

import { applyValidation } from '../middleware';
import { commonSchemas, bodySchemas } from '../middleware/validation-schemas';
import { asyncHandler } from '../middleware/error-handler';
import { AppError } from '../utils/error-response';

// Get validation middleware
const validation = applyValidation();

/**
 * Example routes showing how to use the validation middleware
 * These are examples - you would integrate these patterns into your existing routes
 */
export function registerValidatedRoutes(app: Express) {
  
  // ===== AUTHENTICATION ROUTES =====
  
  // User registration with validation and rate limiting
  app.post('/api/auth/register',
    validation.authRateLimit,
    validation.validateUserRegistration,
    asyncHandler(async (req: Request, res: Response) => {
      // At this point, req.body is validated and sanitized
      const { username, email, password, firstName, lastName, phone } = req.body;
      
      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email)
      });
      
      if (existingUser) {
        throw new AppError(409, 'USER_EXISTS', 'User with this email already exists');
      }
      
      // Create user logic here...
      res.json({ message: 'User registered successfully' });
    })
  );

  // User login with validation and rate limiting
  app.post('/api/auth/login',
    validation.authRateLimit,
    validation.validateUserLogin,
    asyncHandler(async (req: Request, res: Response) => {
      const { username, password } = req.body;
      
      // Login logic here...
      res.json({ message: 'Login successful' });
    })
  );

  // Change password with validation
  app.post('/api/auth/change-password',
    validation.validateChangePassword,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }
      
      const { currentPassword, newPassword } = req.body;
      
      // Password change logic here...
      res.json({ message: 'Password changed successfully' });
    })
  );

  // ===== TASK ROUTES =====
  
  // Get tasks with pagination and filtering
  app.get('/api/tasks',
    validation.validatePagination,
    validation.validateFilter,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }

      const { page, limit, sort } = req.query;
      const { status, priority } = req.query;
      
      // Build query with validated parameters
      const offset = (page - 1) * limit;
      
      // Query logic here with proper pagination and filtering...
      const userTasks = await db.query.tasks.findMany({
        where: eq(tasks.userId, req.user.id),
        limit: limit,
        offset: offset
      });
      
      res.json({
        data: userTasks,
        pagination: {
          page,
          limit,
          total: userTasks.length // You'd get actual total count
        }
      });
    })
  );

  // Create task with validation
  app.post('/api/tasks',
    validation.validateTaskCreate,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }

      // req.body is fully validated at this point
      const taskData = {
        ...req.body,
        userId: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [task] = await db.insert(tasks)
        .values(taskData)
        .returning();

      res.status(201).json(task);
    })
  );

  // Update task with validation
  app.patch('/api/tasks/:id',
    validation.validateId,
    validation.validateTaskUpdate, // Uses partial validation
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }

      const taskId = req.params.id; // Already validated as number
      
      // Check if task exists and belongs to user
      const [existingTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (!existingTask) {
        throw new AppError(404, 'NOT_FOUND', 'Task not found');
      }

      if (existingTask.userId !== req.user.id) {
        throw new AppError(403, 'FORBIDDEN', 'Not authorized to update this task');
      }

      const [updatedTask] = await db
        .update(tasks)
        .set({
          ...req.body,
          updatedAt: new Date()
        })
        .where(eq(tasks.id, taskId))
        .returning();

      res.json(updatedTask);
    })
  );

  // ===== TEAM MEMBER ROUTES =====
  
  // Create team member with validation
  app.post('/api/team-members',
    validation.validateTeamMemberCreate,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }

      const memberData = {
        ...req.body,
        userId: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [member] = await db.insert(teamMembers)
        .values(memberData)
        .returning();

      res.status(201).json(member);
    })
  );

  // ===== FILE UPLOAD ROUTES =====
  
  // Upload profile image with validation
  app.post('/api/upload/profile-image',
    validation.uploadRateLimit,
    validation.validateImageUpload,
    validation.validateMultipartContent,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }

      // File validation already done by middleware
      const file = req.file;
      
      if (!file) {
        throw new AppError(400, 'VALIDATION_ERROR', 'No file uploaded');
      }

      // File upload logic here...
      res.json({ 
        message: 'File uploaded successfully',
        filename: file.filename,
        size: file.size
      });
    })
  );

  // ===== CHAT ROUTES =====
  
  // Send chat message with validation and rate limiting
  app.post('/api/chat',
    validation.chatRateLimit,
    validation.validateChatMessage,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }

      const { content } = req.body;
      
      // Chat message processing logic here...
      res.json({ message: 'Message sent successfully' });
    })
  );

  // ===== BUSINESS SETUP ROUTES =====
  
  // Setup business with comprehensive validation
  app.post('/api/business/setup',
    validation.validateBusinessSetup,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }

      const businessData = req.body;
      
      // Business setup logic here...
      res.json({ message: 'Business setup completed successfully' });
    })
  );

  // ===== SEARCH ROUTES =====
  
  // Search with validation
  app.get('/api/search',
    validation.validateSearch,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }

      const { q: query, page, limit, sort } = req.query;
      
      // Search logic here with validated parameters...
      res.json({
        query,
        results: [],
        pagination: { page, limit, total: 0 }
      });
    })
  );

  // ===== FEEDBACK ROUTES =====
  
  // Analyze feedback with validation
  app.post('/api/feedback/analyze',
    validation.validateFeedbackAnalysis,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }

      const { feedback } = req.body;
      
      // Feedback analysis logic here...
      res.json({ 
        sentiment: 'positive',
        suggestions: []
      });
    })
  );

  // ===== SETTINGS ROUTES =====
  
  // Update user settings with validation
  app.patch('/api/settings',
    validation.validateUserSettings,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }

      const settings = req.body;
      
      // Update user settings logic here...
      res.json({ message: 'Settings updated successfully' });
    })
  );
}

// Example of custom validation for specific use cases
export const customValidations = {
  // Validate business name availability
  validateBusinessNameAvailability: asyncHandler(async (req: Request, res: Response, next) => {
    const { businessName } = req.body;
    
    if (businessName) {
      const existing = await db.query.users.findFirst({
        where: eq(users.businessName, businessName)
      });
      
      if (existing && existing.id !== req.user?.id) {
        throw new AppError(409, 'BUSINESS_NAME_TAKEN', 'Business name is already taken');
      }
    }
    
    next();
  }),

  // Validate task ownership
  validateTaskOwnership: asyncHandler(async (req: Request, res: Response, next) => {
    const taskId = parseInt(req.params.id);
    
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      throw new AppError(404, 'NOT_FOUND', 'Task not found');
    }

    if (task.userId !== req.user?.id) {
      throw new AppError(403, 'FORBIDDEN', 'Not authorized to access this task');
    }

    // Attach task to request for use in route handler
    req.task = task;
    next();
  }),

  // Validate date ranges
  validateDateRange: (req: Request, res: Response, next: NextFunction) => {
    const { startDate, endDate } = req.query;
    
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      if (start > end) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Start date must be before end date');
      }
      
      // Check if date range is not too large (e.g., max 1 year)
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (end.getTime() - start.getTime() > oneYear) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Date range cannot exceed 1 year');
      }
    }
    
    next();
  }
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      task?: any; // Add specific types as needed
    }
  }
}

export default registerValidatedRoutes;