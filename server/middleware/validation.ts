import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, z, ZodSchema } from 'zod';
import { AppError } from '../utils/error-response';

// Extend Express Request to include file upload properties
declare global {
  namespace Express {
    interface Request {
      file?: any;
      files?: any;
    }
  }
}

// Types for validation configuration
interface ValidationConfig {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
  headers?: ZodSchema;
}

interface ValidationOptions {
  // Whether to strip unknown properties (default: true)
  stripUnknown?: boolean;
  // Whether to transform data (default: true)
  transform?: boolean;
  // Whether to allow partial validation for PATCH requests (default: false)
  allowPartial?: boolean;
  // Custom error message prefix
  errorPrefix?: string;
}

// Main validation middleware factory
export function validate(
  config: ValidationConfig,
  options: ValidationOptions = {}
) {
  const {
    stripUnknown = true,
    transform = true,
    allowPartial = false,
    errorPrefix = 'Validation failed'
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResults: Record<string, any> = {};
      const errors: Array<{ field: string; message: string }> = [];

      // Validate request body
      if (config.body) {
        try {
          let schema = config.body;
          
          // For PATCH requests, make all fields optional if allowPartial is true
          if (allowPartial && req.method === 'PATCH') {
            schema = schema.partial();
          }

          const result = schema.parse(req.body);
          validationResults.body = result;
          
          // Replace original body with validated data
          if (transform) {
            req.body = result;
          }
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...error.errors.map(e => ({
              field: `body.${e.path.join('.')}`,
              message: e.message
            })));
          }
        }
      }

      // Validate request parameters
      if (config.params) {
        try {
          const result = config.params.parse(req.params);
          validationResults.params = result;
          
          if (transform) {
            req.params = result;
          }
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...error.errors.map(e => ({
              field: `params.${e.path.join('.')}`,
              message: e.message
            })));
          }
        }
      }

      // Validate query parameters
      if (config.query) {
        try {
          const result = config.query.parse(req.query);
          validationResults.query = result;
          
          if (transform) {
            req.query = result;
          }
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...error.errors.map(e => ({
              field: `query.${e.path.join('.')}`,
              message: e.message
            })));
          }
        }
      }

      // Validate headers
      if (config.headers) {
        try {
          const result = config.headers.parse(req.headers);
          validationResults.headers = result;
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(...error.errors.map(e => ({
              field: `headers.${e.path.join('.')}`,
              message: e.message
            })));
          }
        }
      }

      // If there are validation errors, throw an AppError
      if (errors.length > 0) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          `${errorPrefix}: ${errors.length} validation error(s)`,
          errors
        );
      }

      // Attach validation results to request for debugging
      req.validationResults = validationResults;

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Convenience function for body-only validation
export function validateBody(schema: ZodSchema, options?: ValidationOptions) {
  return validate({ body: schema }, options);
}

// Convenience function for params-only validation
export function validateParams(schema: ZodSchema, options?: ValidationOptions) {
  return validate({ params: schema }, options);
}

// Convenience function for query-only validation
export function validateQuery(schema: ZodSchema, options?: ValidationOptions) {
  return validate({ query: schema }, options);
}

// Convenience function for headers-only validation
export function validateHeaders(schema: ZodSchema, options?: ValidationOptions) {
  return validate({ headers: schema }, options);
}

// Middleware for PATCH requests that allows partial updates
export function validatePartial(schema: ZodSchema, options?: ValidationOptions) {
  return validate({ body: schema }, { ...options, allowPartial: true });
}

// Custom validation middleware for file uploads
export function validateFileUpload(options: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  required?: boolean;
  fieldName?: string;
} = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/json'
    ],
    required = false,
    fieldName = 'file'
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const file = req.file || (req.files as any)?.[fieldName];

    if (required && !file) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'File is required'));
    }

    if (file) {
      // Check file size
      if (file.size > maxSize) {
        return next(new AppError(
          400,
          'VALIDATION_ERROR',
          `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`
        ));
      }

      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        return next(new AppError(
          400,
          'VALIDATION_ERROR',
          `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
        ));
      }

      // Check for malicious file names
      if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
        return next(new AppError(
          400,
          'VALIDATION_ERROR',
          'Invalid file name'
        ));
      }
    }

    next();
  };
}

// Middleware to validate request size
export function validateRequestSize(maxSize: number = 10 * 1024 * 1024) { // 10MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return next(new AppError(
        413,
        'PAYLOAD_TOO_LARGE',
        `Request size exceeds limit of ${maxSize / (1024 * 1024)}MB`
      ));
    }

    next();
  };
}

// Middleware to validate content type
export function validateContentType(allowedTypes: string[] = ['application/json']) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip content-type validation for GET and DELETE requests
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }
    
    const contentType = req.get('content-type');
    
    if (!contentType) {
      return next(new AppError(
        400,
        'VALIDATION_ERROR',
        'Content-Type header is required'
      ));
    }

    const isAllowed = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isAllowed) {
      return next(new AppError(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        `Content-Type ${contentType} is not supported. Allowed types: ${allowedTypes.join(', ')}`
      ));
    }

    next();
  };
}

// Middleware to validate API key in headers
export function validateApiKey(headerName: string = 'x-api-key') {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.get(headerName);
    
    if (!apiKey) {
      return next(new AppError(
        401,
        'AUTHENTICATION_ERROR',
        `${headerName} header is required`
      ));
    }

    // You can add additional API key validation logic here
    // For now, just check if it exists
    if (apiKey.length < 10) {
      return next(new AppError(
        401,
        'AUTHENTICATION_ERROR',
        'Invalid API key format'
      ));
    }

    next();
  };
}

// Middleware to validate user agent
export function validateUserAgent(required: boolean = false) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userAgent = req.get('user-agent');
    
    if (required && !userAgent) {
      return next(new AppError(
        400,
        'VALIDATION_ERROR',
        'User-Agent header is required'
      ));
    }

    // Check for suspicious or blocked user agents
    if (userAgent) {
      const suspiciousPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i
      ];

      // Only block if explicitly configured to do so
      // This is just an example - adjust based on your needs
      const isSuspicious = suspiciousPatterns.some(pattern => 
        pattern.test(userAgent)
      );

      if (isSuspicious && process.env.BLOCK_BOTS === 'true') {
        return next(new AppError(
          403,
          'FORBIDDEN',
          'Access denied'
        ));
      }
    }

    next();
  };
}

// Middleware to validate referer header
export function validateReferer(allowedDomains: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    const referer = req.get('referer');
    
    if (allowedDomains.length > 0) {
      if (!referer) {
        return next(new AppError(
          400,
          'VALIDATION_ERROR',
          'Referer header is required'
        ));
      }

      try {
        const refererUrl = new URL(referer);
        const isAllowed = allowedDomains.some(domain => 
          refererUrl.hostname === domain || refererUrl.hostname.endsWith(`.${domain}`)
        );

        if (!isAllowed) {
          return next(new AppError(
            403,
            'FORBIDDEN',
            'Invalid referer'
          ));
        }
      } catch (error) {
        return next(new AppError(
          400,
          'VALIDATION_ERROR',
          'Invalid referer URL'
        ));
      }
    }

    next();
  };
}

// Extend Express Request interface to include validation results
declare global {
  namespace Express {
    interface Request {
      validationResults?: Record<string, any>;
    }
  }
}

export default validate;