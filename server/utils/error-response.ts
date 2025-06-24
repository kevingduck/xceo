export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
  timestamp: string;
  path?: string;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function createErrorResponse(
  error: Error | AppError,
  path?: string
): ApiError {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
      path
    };
  }

  // Default error response
  return {
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message,
    statusCode: 500,
    timestamp: new Date().toISOString(),
    path
  };
}

// Common error factories
export const ValidationError = (message: string, details?: any) =>
  new AppError(400, 'VALIDATION_ERROR', message, details);

export const AuthenticationError = (message: string = 'Not authenticated') =>
  new AppError(401, 'AUTHENTICATION_ERROR', message);

export const AuthorizationError = (message: string = 'Not authorized') =>
  new AppError(403, 'AUTHORIZATION_ERROR', message);

export const NotFoundError = (resource: string) =>
  new AppError(404, 'NOT_FOUND', `${resource} not found`);

export const ConflictError = (message: string) =>
  new AppError(409, 'CONFLICT', message);

export const DatabaseError = (message: string, details?: any) =>
  new AppError(500, 'DATABASE_ERROR', message, details);