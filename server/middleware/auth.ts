import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, AuthorizationError } from '../utils/error-response';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    throw AuthenticationError('You must be logged in to access this resource');
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    throw AuthenticationError('You must be logged in to access this resource');
  }
  
  if (req.user?.role !== 'admin') {
    throw AuthorizationError('Admin privileges required');
  }
  
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // This middleware doesn't throw errors, just continues
  // Useful for endpoints that have different behavior for authenticated users
  next();
}