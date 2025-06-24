import { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';

// Import all middleware
import { 
  rateLimiters, 
  corsOptions, 
  helmetOptions,
  preventSQLInjection,
  preventXSS,
  validateRequestSize,
  compressionMiddleware,
  mongoSanitizeMiddleware,
  securityHeaders,
  securityLogger
} from './security';

import { errorHandler } from './error-handler';

import {
  validate,
  validateBody,
  validateParams,
  validateQuery,
  validateHeaders,
  validatePartial,
  validateFileUpload,
  validateContentType
} from './validation';

import {
  commonSchemas,
  paramSchemas,
  querySchemas,
  bodySchemas,
  requestSchemas
} from './validation-schemas';

/**
 * Apply security middleware to the Express app
 * This should be called early in the middleware chain
 */
export function applySecurity(app: Express) {
  // Security logging (should be first)
  app.use(securityLogger);

  // Trust proxy settings for accurate IP detection
  app.set('trust proxy', 1);

  // Compression middleware
  app.use(compressionMiddleware);

  // Security headers
  app.use(helmet(helmetOptions));
  app.use(securityHeaders);

  // CORS configuration
  app.use(cors(corsOptions));

  // Request size validation
  app.use(validateRequestSize(10 * 1024 * 1024)); // 10MB limit

  // MongoDB injection sanitization
  app.use(mongoSanitizeMiddleware);

  // SQL injection prevention
  app.use(preventSQLInjection);

  // XSS prevention (Note: This modifies request data)
  // Apply this carefully - you might want to be more selective
  // app.use(preventXSS);

  // Global rate limiting
  app.use(rateLimiters.global);
}

/**
 * Apply validation middleware to specific routes
 */
export function applyValidation() {
  return {
    // Common validations
    validateId: validateParams(paramSchemas.id),
    validateUserId: validateParams(paramSchemas.userId),
    validateSlug: validateParams(paramSchemas.slug),
    
    // Query validations
    validatePagination: validateQuery(querySchemas.pagination),
    validateSearch: validateQuery(querySchemas.search),
    validateDateRange: validateQuery(querySchemas.dateRange),
    validateFilter: validateQuery(querySchemas.filter),
    
    // Body validations for common entities
    validateUserRegistration: validateBody(bodySchemas.userRegistration),
    validateUserLogin: validateBody(bodySchemas.userLogin),
    validateUserProfile: validateBody(bodySchemas.userProfile),
    validateChangePassword: validateBody(bodySchemas.changePassword),
    
    validateBusinessSetup: validateBody(bodySchemas.businessSetup),
    
    validateTaskCreate: validateBody(bodySchemas.taskCreate),
    validateTaskUpdate: validatePartial(bodySchemas.taskCreate),
    
    validateTeamMemberCreate: validateBody(bodySchemas.teamMemberCreate),
    validateTeamMemberUpdate: validatePartial(bodySchemas.teamMemberCreate),
    
    validateChatMessage: validateBody(bodySchemas.chatMessage),
    validateFeedbackAnalysis: validateBody(bodySchemas.feedbackAnalysis),
    validateContactForm: validateBody(bodySchemas.contactForm),
    validateUserSettings: validateBody(bodySchemas.userSettings),
    
    // File upload validation
    validateImageUpload: validateFileUpload({
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      required: false
    }),
    
    validateDocumentUpload: validateFileUpload({
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['application/pdf', 'text/plain', 'text/csv'],
      required: false
    }),
    
    // Content type validation
    validateJSONContent: validateContentType(['application/json']),
    validateMultipartContent: validateContentType(['multipart/form-data']),
    
    // Rate limiters for specific endpoints
    authRateLimit: rateLimiters.auth,
    apiRateLimit: rateLimiters.api,
    uploadRateLimit: rateLimiters.upload,
    chatRateLimit: rateLimiters.chat,
    
    // Export validation functions for custom use
    validateBody,
    validateParams,
    validateQuery,
    validateHeaders,
    validatePartial,
    validateFileUpload,
    validateContentType
  };
}

/**
 * Apply error handling middleware
 * This should be called after all other middleware and routes
 */
export function applyErrorHandling(app: Express) {
  // Error handler must be last
  app.use(errorHandler);
}

/**
 * Complete middleware setup
 * Apply all middleware in the correct order
 */
export function setupMiddleware(app: Express) {
  // 1. Security middleware (first)
  applySecurity(app);
  
  // 2. Body parsing middleware (Express built-in)
  app.use('/api', validateContentType(['application/json']));
  
  // 3. API-specific rate limiting
  app.use('/api', rateLimiters.api);
  
  // Return validation middleware for use in routes
  return applyValidation();
}

// Export individual components for fine-grained control
export {
  // Security middleware
  rateLimiters,
  corsOptions,
  helmetOptions,
  preventSQLInjection,
  preventXSS,
  validateRequestSize,
  compressionMiddleware,
  mongoSanitizeMiddleware,
  securityHeaders,
  securityLogger,
  
  // Validation middleware
  validate,
  validateBody,
  validateParams,
  validateQuery,
  validateHeaders,
  validatePartial,
  validateFileUpload,
  validateContentType,
  
  // Validation schemas
  commonSchemas,
  paramSchemas,
  querySchemas,
  bodySchemas,
  requestSchemas,
  
  // Error handling
  errorHandler
};

// Default export
export default {
  setupMiddleware,
  applySecurity,
  applyValidation,
  applyErrorHandling
};