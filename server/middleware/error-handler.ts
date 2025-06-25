import { Request, Response, NextFunction } from 'express';
import { AppError, createErrorResponse } from '../utils/error-response';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Determine if this is a security-related error for enhanced logging
  const isSecurityError = [
    'SECURITY_VIOLATION',
    'RATE_LIMIT_EXCEEDED',
    'AUTH_RATE_LIMIT_EXCEEDED',
    'API_RATE_LIMIT_EXCEEDED',
    'UPLOAD_RATE_LIMIT_EXCEEDED',
    'CHAT_RATE_LIMIT_EXCEEDED',
    'IP_BLOCKED',
    'IP_NOT_ALLOWED',
    'USER_AGENT_BLOCKED',
    'USER_AGENT_NOT_ALLOWED'
  ].includes((err as AppError).code);

  // Enhanced error logging
  const errorLog = {
    name: err.name,
    message: err.message,
    code: (err as AppError).code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    user: req.user?.id,
    timestamp: new Date().toISOString(),
    // Only log body for non-security errors and in development
    body: !isSecurityError && process.env.NODE_ENV === 'development' ? req.body : undefined
  };

  // Use different log levels based on error type
  if (isSecurityError) {
    console.warn('Security error occurred:', errorLog);
  } else if (err instanceof AppError && err.statusCode < 500) {
    console.info('Client error occurred:', errorLog);
  } else {
    console.error('Server error occurred:', errorLog);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const appError = new AppError(
      400,
      'VALIDATION_ERROR',
      'Invalid input data provided',
      err.errors.map(e => ({
        field: e.path.join('.') || 'unknown',
        message: e.message,
        code: e.code
      }))
    );
    return res.status(400).json(createErrorResponse(appError, req.path));
  }

  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    const appError = new AppError(
      403,
      'CORS_ERROR',
      'CORS policy violation'
    );
    return res.status(403).json(createErrorResponse(appError, req.path));
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    const appError = new AppError(
      400,
      'INVALID_JSON',
      'Invalid JSON in request body'
    );
    return res.status(400).json(createErrorResponse(appError, req.path));
  }

  // Handle payload too large errors
  if (err.message?.includes('PayloadTooLargeError') || err.message?.includes('request entity too large')) {
    const appError = new AppError(
      413,
      'PAYLOAD_TOO_LARGE',
      'Request payload is too large'
    );
    return res.status(413).json(createErrorResponse(appError, req.path));
  }

  // Handle database constraint errors
  if (err.message?.includes('UNIQUE constraint failed')) {
    // Extract field name from error message
    const match = err.message.match(/UNIQUE constraint failed: \w+\.(\w+)/);
    const field = match ? match[1] : 'field';
    
    const appError = new AppError(
      409,
      'DUPLICATE_ENTRY',
      `A record with this ${field} already exists`,
      { field, constraint: 'unique' }
    );
    return res.status(409).json(createErrorResponse(appError, req.path));
  }

  // Handle foreign key constraint errors
  if (err.message?.includes('FOREIGN KEY constraint failed')) {
    const appError = new AppError(
      400,
      'INVALID_REFERENCE',
      'Referenced record does not exist'
    );
    return res.status(400).json(createErrorResponse(appError, req.path));
  }

  // Handle database connection errors
  if (err.message?.includes('database') && err.message?.includes('connection')) {
    const appError = new AppError(
      503,
      'DATABASE_UNAVAILABLE',
      'Database connection is temporarily unavailable'
    );
    return res.status(503).json(createErrorResponse(appError, req.path));
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(createErrorResponse(err, req.path));
  }

  // Handle timeout errors
  if (err.message?.includes('timeout')) {
    const appError = new AppError(
      408,
      'REQUEST_TIMEOUT',
      'Request timed out'
    );
    return res.status(408).json(createErrorResponse(appError, req.path));
  }

  // Handle permission errors
  if (err.message?.includes('permission') || err.message?.includes('forbidden')) {
    const appError = new AppError(
      403,
      'FORBIDDEN',
      'Insufficient permissions'
    );
    return res.status(403).json(createErrorResponse(appError, req.path));
  }

  // Default error response
  const errorResponse = createErrorResponse(err, req.path);
  res.status(errorResponse.statusCode).json(errorResponse);
}

// Async error wrapper to catch errors in async route handlers
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}