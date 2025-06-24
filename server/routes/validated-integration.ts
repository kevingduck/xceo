import type { Express } from "express";
import { z } from "zod";
import { applyValidation } from "../middleware";
import { commonSchemas, bodySchemas } from "../middleware/validation-schemas";
import { asyncHandler } from "../middleware/error-handler";
import { AppError } from "../utils/error-response";

/**
 * This file shows how to integrate validation middleware with existing routes
 * You can apply these patterns to your existing routes.ts file
 */

// Get validation middleware
const validation = applyValidation();

// Enhanced validation schemas specific to your existing routes
const enhancedSchemas = {
  configureCEO: z.object({
    businessName: commonSchemas.businessName,
    businessDescription: commonSchemas.longText,
    objectives: z.array(commonSchemas.text).min(1, "At least one objective is required").max(10, "Too many objectives")
  }),

  businessFieldUpdate: z.record(z.object({
    value: z.union([z.string(), z.number(), z.array(z.string()), z.date()]),
    type: z.enum(['text', 'number', 'currency', 'percentage', 'date', 'list'])
  })),

  teamMember: z.object({
    name: commonSchemas.name,
    role: commonSchemas.text,
    department: commonSchemas.text.optional(),
    email: commonSchemas.email,
    startDate: commonSchemas.dateString,
    skills: commonSchemas.skills,
    bio: commonSchemas.longText.optional(),
    salary: commonSchemas.currency.optional()
  }),

  position: z.object({
    title: commonSchemas.text,
    description: commonSchemas.longText,
    requirements: commonSchemas.text,
    minSalary: z.string().optional(),
    maxSalary: z.string().optional(),
    location: commonSchemas.text.optional()
  }),

  candidate: z.object({
    positionId: commonSchemas.id,
    name: commonSchemas.name,
    email: commonSchemas.email,
    phone: commonSchemas.phone,
    resumeUrl: commonSchemas.url,
    skills: commonSchemas.text,
    experienceYears: z.string().regex(/^\d+$/, "Experience years must be a number"),
    highlights: commonSchemas.text,
    notes: commonSchemas.longText.optional(),
    rating: z.string().regex(/^[1-5]$/, "Rating must be between 1 and 5").optional()
  }),

  offering: z.object({
    name: commonSchemas.text,
    description: commonSchemas.longText,
    type: z.enum(["product", "service"]),
    status: z.enum(["active", "discontinued", "planned"]).default("active"),
    price: z.object({
      amount: commonSchemas.currency,
      currency: z.string().default("USD"),
      billingCycle: z.string().optional()
    }).optional()
  }),

  pricingTier: z.object({
    name: commonSchemas.text,
    description: commonSchemas.longText,
    price: z.object({
      amount: commonSchemas.currency,
      currency: z.string().default("USD"),
      billingCycle: z.string().optional()
    }),
    offeringId: commonSchemas.id,
    features: z.array(z.string()).default([])
  }),

  package: z.object({
    name: commonSchemas.text,
    description: commonSchemas.longText,
    offerings: z.array(z.object({
      offeringId: commonSchemas.id,
      tierId: commonSchemas.id.optional()
    }))
  }),

  feature: z.object({
    name: commonSchemas.text,
    description: commonSchemas.longText
  }),

  roadmapItem: z.object({
    title: commonSchemas.text,
    description: commonSchemas.longText,
    status: z.enum(["todo", "in progress", "done"]).default("todo"),
    dueDate: commonSchemas.dateString
  })
};

/**
 * Example of how to apply validation to existing route patterns
 */
export function addValidationToRoutes(app: Express) {
  
  // ===== ENHANCED TASK ROUTES =====
  
  // Tasks with enhanced validation and rate limiting
  app.get("/api/tasks",
    validation.apiRateLimit,
    validation.validatePagination,
    asyncHandler(async (req, res) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }
      
      // Your existing task fetching logic here...
      // The pagination parameters are now validated and typed
      const { page, limit, sort } = req.query;
      
      res.json({ message: "Tasks fetched with validated pagination" });
    })
  );

  app.post("/api/tasks",
    validation.apiRateLimit,
    validation.validateTaskCreate,
    asyncHandler(async (req, res) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }
      
      // req.body is fully validated and sanitized
      // Your existing task creation logic here...
      
      res.json({ message: "Task created with validation" });
    })
  );

  // ===== ENHANCED BUSINESS INFO ROUTES =====
  
  app.post("/api/configure-ceo",
    validation.authRateLimit, // Lower rate limit for setup actions
    validation.validateBody(enhancedSchemas.configureCEO),
    asyncHandler(async (req, res) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }
      
      // Your existing CEO configuration logic here...
      // req.body is validated with enhanced business name validation
      
      res.json({ message: "CEO configured with enhanced validation" });
    })
  );

  app.patch("/api/business-info/:id/fields",
    validation.validateId,
    validation.validateBody(enhancedSchemas.businessFieldUpdate),
    asyncHandler(async (req, res) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }
      
      const infoId = req.params.id; // Already validated as positive integer
      
      // Your existing business info update logic here...
      
      res.json({ message: "Business info fields updated with validation" });
    })
  );

  // ===== ENHANCED CHAT ROUTES =====
  
  app.post("/api/chat",
    validation.chatRateLimit, // Specific rate limiting for chat
    validation.validateChatMessage,
    asyncHandler(async (req, res) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }
      
      // Your existing chat logic here...
      // Content is validated and XSS-protected
      
      res.json({ message: "Chat message sent with validation" });
    })
  );

  // ===== ENHANCED TEAM MEMBER ROUTES =====
  
  app.post("/api/team-members",
    validation.apiRateLimit,
    validation.validateBody(enhancedSchemas.teamMember),
    asyncHandler(async (req, res) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }
      
      // Your existing team member creation logic here...
      // All fields are properly validated
      
      res.json({ message: "Team member created with enhanced validation" });
    })
  );

  app.patch("/api/team-members/:id",
    validation.validateId,
    validation.validatePartial(enhancedSchemas.teamMember),
    asyncHandler(async (req, res) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }
      
      const memberId = req.params.id;
      
      // Your existing team member update logic here...
      
      res.json({ message: "Team member updated with validation" });
    })
  );

  // ===== ENHANCED POSITION ROUTES =====
  
  app.post("/api/positions",
    validation.apiRateLimit,
    validation.validateBody(enhancedSchemas.position),
    asyncHandler(async (req, res) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }
      
      // Your existing position creation logic here...
      
      res.json({ message: "Position created with validation" });
    })
  );

  // ===== ENHANCED CANDIDATE ROUTES =====
  
  app.post("/api/candidates",
    validation.apiRateLimit,
    validation.validateBody(enhancedSchemas.candidate),
    asyncHandler(async (req, res) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }
      
      // Your existing candidate creation logic here...
      // Position ID, email, and rating are properly validated
      
      res.json({ message: "Candidate created with validation" });
    })
  );

  // ===== ENHANCED FEEDBACK ROUTES =====
  
  app.post("/api/analyze-feedback",
    validation.apiRateLimit,
    validation.validateFeedbackAnalysis,
    asyncHandler(async (req, res) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }
      
      // Your existing feedback analysis logic here...
      // Feedback content is validated and sanitized
      
      res.json({ message: "Feedback analyzed with validation" });
    })
  );

  // ===== ENHANCED FILE UPLOAD ROUTES =====
  
  app.post("/api/upload/documents",
    validation.uploadRateLimit, // Special rate limiting for uploads
    validation.validateDocumentUpload,
    validation.validateMultipartContent,
    asyncHandler(async (req, res) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }
      
      // File validation is already done by middleware
      // Your file upload logic here...
      
      res.json({ message: "Document uploaded with validation" });
    })
  );

  // ===== ENHANCED SETTINGS ROUTES =====
  
  app.post("/api/settings/clear-data",
    validation.authRateLimit, // Use auth rate limit for sensitive operations
    asyncHandler(async (req, res) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }
      
      // Your existing data clearing logic here...
      
      res.json({ message: "Data cleared with rate limiting" });
    })
  );

  // ===== ENHANCED ADMIN ROUTES =====
  
  app.get("/api/admin/:table",
    validation.validateParams(z.object({
      table: z.enum(['users', 'business_info', 'tasks', 'chat_messages', 'analytics', 'team_members', 'positions', 'candidates'])
    })),
    validation.validatePagination,
    asyncHandler(async (req, res) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }
      
      // Add admin role check here
      if (req.user.role !== 'admin') {
        throw new AppError(403, 'FORBIDDEN', 'Admin access required');
      }
      
      const { table } = req.params;
      const { page, limit, sort } = req.query;
      
      // Your existing admin data fetching logic here...
      
      res.json({ message: `Admin ${table} data fetched with validation` });
    })
  );
}

/**
 * Middleware for checking user permissions
 */
export const permissionMiddleware = {
  requireAdmin: asyncHandler(async (req, res, next) => {
    if (!req.isAuthenticated()) {
      throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
    }
    
    // Add your admin role check logic here
    if (req.user.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', 'Admin privileges required');
    }
    
    next();
  }),

  requireOwnership: (resourceType: string) => {
    return asyncHandler(async (req, res, next) => {
      if (!req.isAuthenticated()) {
        throw new AppError(401, 'AUTHENTICATION_ERROR', 'Not authenticated');
      }
      
      // Add your ownership validation logic here
      // This would check if the user owns the resource being accessed
      
      next();
    });
  }
};

/**
 * Rate limiting configurations for different endpoint types
 */
export const customRateLimits = {
  // Very strict for password changes
  passwordChange: validation.authRateLimit,
  
  // Moderate for data creation
  dataCreation: validation.apiRateLimit,
  
  // Lenient for data reading
  dataReading: validation.apiRateLimit,
  
  // Strict for file uploads
  fileUpload: validation.uploadRateLimit,
  
  // Very strict for chat/messaging
  messaging: validation.chatRateLimit
};

export { validation, enhancedSchemas };
export default addValidationToRoutes;