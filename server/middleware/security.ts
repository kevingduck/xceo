import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import { AppError } from '../utils/error-response';

// Rate limiting configurations
export const rateLimiters = {
  // Global rate limiter - applies to all requests
  global: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: 900 // 15 minutes in seconds
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: 900
      });
    }
  }),

  // Strict rate limiter for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth requests per windowMs
    message: {
      error: 'Too many authentication attempts',
      message: 'Too many login attempts, please try again later.',
      retryAfter: 900
    },
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later.',
        retryAfter: 900
      });
    }
  }),

  // API rate limiter for general API usage
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 API requests per windowMs
    message: {
      error: 'API rate limit exceeded',
      message: 'Too many API requests, please try again later.',
      retryAfter: 900
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'API_RATE_LIMIT_EXCEEDED',
        message: 'Too many API requests, please try again later.',
        retryAfter: 900
      });
    }
  }),

  // Upload rate limiter for file uploads
  upload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 uploads per hour
    message: {
      error: 'Upload rate limit exceeded',
      message: 'Too many file uploads, please try again later.',
      retryAfter: 3600
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        message: 'Too many file uploads, please try again later.',
        retryAfter: 3600
      });
    }
  }),

  // Chat/message rate limiter
  chat: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 messages per minute
    message: {
      error: 'Message rate limit exceeded',
      message: 'Too many messages, please slow down.',
      retryAfter: 60
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'CHAT_RATE_LIMIT_EXCEEDED',
        message: 'Too many messages, please slow down.',
        retryAfter: 60
      });
    }
  })
};

// CORS configuration
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      // Add your production domains here
      ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
    ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-CSRF-Token'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

// Helmet security configuration
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Disable for development
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
};

// SQL injection prevention middleware
export function preventSQLInjection(req: Request, res: Response, next: NextFunction) {
  const suspiciousPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL meta-characters
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i, // SQL injection attempt
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i, // 'or' pattern
    /((\%27)|(\'))union/i, // Union attacks
    /exec(\s|\+)+(s|x)p\w+/i, // Stored procedure calls
    /select.*from/i,
    /insert.*into/i,
    /delete.*from/i,
    /update.*set/i,
    /drop.*table/i,
    /create.*table/i,
    /alter.*table/i
  ];

  const checkForInjection = (value: any): boolean => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkForInjection);
    }
    return false;
  };

  // Check all input sources
  const inputs = [
    ...(req.body ? Object.values(req.body) : []),
    ...(req.query ? Object.values(req.query) : []),
    ...(req.params ? Object.values(req.params) : [])
  ];

  if (inputs.some(checkForInjection)) {
    return next(new AppError(
      400,
      'SECURITY_VIOLATION',
      'Potentially malicious input detected'
    ));
  }

  next();
}

// XSS prevention middleware
export function preventXSS(req: Request, res: Response, next: NextFunction) {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /expression\s*\(/gi,
    /behavior\s*:/gi
  ];

  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Check for XSS patterns
      const hasXSS = xssPatterns.some(pattern => pattern.test(value));
      if (hasXSS) {
        throw new AppError(
          400,
          'SECURITY_VIOLATION',
          'Potentially malicious content detected'
        );
      }
      
      // Basic XSS sanitization
      return value
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = Array.isArray(value) ? [] : {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    
    return value;
  };

  try {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeValue(req.body);
    }
    
    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeValue(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeValue(req.params);
    }

    next();
  } catch (error) {
    next(error);
  }
}

// Request size validation middleware
export function validateRequestSize(maxSize: number = 10 * 1024 * 1024) { // 10MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return next(new AppError(
        413,
        'PAYLOAD_TOO_LARGE',
        `Request size exceeds limit of ${Math.round(maxSize / (1024 * 1024))}MB`
      ));
    }

    next();
  };
}

// IP whitelist/blacklist middleware
export function ipFilter(options: {
  whitelist?: string[];
  blacklist?: string[];
  trustProxy?: boolean;
} = {}) {
  const { whitelist, blacklist, trustProxy = true } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const getClientIP = (): string => {
      if (trustProxy) {
        return (req.ip || 
                req.connection.remoteAddress || 
                req.socket.remoteAddress ||
                '').replace(/^.*:/, ''); // Remove IPv6 prefix
      }
      return req.connection.remoteAddress || req.socket.remoteAddress || '';
    };

    const clientIP = getClientIP();

    // Check blacklist first
    if (blacklist && blacklist.includes(clientIP)) {
      return next(new AppError(
        403,
        'IP_BLOCKED',
        'Access denied from this IP address'
      ));
    }

    // Check whitelist
    if (whitelist && whitelist.length > 0 && !whitelist.includes(clientIP)) {
      return next(new AppError(
        403,
        'IP_NOT_ALLOWED',
        'Access denied from this IP address'
      ));
    }

    next();
  };
}

// User agent validation middleware
export function validateUserAgent(options: {
  required?: boolean;
  blockedPatterns?: RegExp[];
  allowedPatterns?: RegExp[];
} = {}) {
  const { 
    required = false, 
    blockedPatterns = [], 
    allowedPatterns = [] 
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const userAgent = req.get('user-agent');

    if (required && !userAgent) {
      return next(new AppError(
        400,
        'VALIDATION_ERROR',
        'User-Agent header is required'
      ));
    }

    if (userAgent) {
      // Check blocked patterns
      const isBlocked = blockedPatterns.some(pattern => pattern.test(userAgent));
      if (isBlocked) {
        return next(new AppError(
          403,
          'USER_AGENT_BLOCKED',
          'Access denied for this user agent'
        ));
      }

      // Check allowed patterns (if specified)
      if (allowedPatterns.length > 0) {
        const isAllowed = allowedPatterns.some(pattern => pattern.test(userAgent));
        if (!isAllowed) {
          return next(new AppError(
            403,
            'USER_AGENT_NOT_ALLOWED',
            'User agent not allowed'
          ));
        }
      }
    }

    next();
  };
}

// Compression middleware with security considerations
export const compressionMiddleware = compression({
  filter: (req, res) => {
    // Don't compress if the request has a cache-control: no-transform directive
    if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
      return false;
    }
    
    // Don't compress images, videos, or already compressed files
    const contentType = res.getHeader('content-type') as string;
    if (contentType) {
      if (contentType.startsWith('image/') || 
          contentType.startsWith('video/') ||
          contentType.includes('gzip') ||
          contentType.includes('zip')) {
        return false;
      }
    }

    // Use compression filter
    return compression.filter(req, res);
  },
  level: 6, // Compression level (1-9, 6 is a good balance)
  threshold: 1024, // Only compress responses larger than 1KB
});

// MongoDB injection sanitization
export const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_', // Replace prohibited characters with underscore
  allowDots: false, // Disallow dots in keys
  onSanitize: ({ key, req }) => {
    console.warn(`Sanitized key ${key} in request to ${req.path}`);
  }
});

// Security headers middleware (enhanced)
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Add CSRF protection header for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }

  next();
}

// Request logging middleware for security monitoring
export function securityLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Log suspicious activity
  const suspiciousPatterns = [
    /\.\.\//, // Directory traversal
    /\/etc\/passwd/, // File access attempts
    /\/proc\//, // System information access
    /\/admin/, // Admin access attempts
    /\/api\/v[0-9]+\/admin/, // API admin access
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.path) || pattern.test(req.url)
  );

  if (isSuspicious) {
    console.warn('Suspicious request detected:', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log slow requests (potential DoS attempts)
    if (duration > 5000) { // 5 seconds
      console.warn('Slow request detected:', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        duration,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
      });
    }

    // Log failed authentication attempts
    if (req.path.includes('/auth/') && res.statusCode === 401) {
      console.warn('Failed authentication attempt:', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        path: req.path,
        timestamp: new Date().toISOString()
      });
    }
  });

  next();
}

export default {
  rateLimiters,
  corsOptions,
  helmetOptions,
  preventSQLInjection,
  preventXSS,
  validateRequestSize,
  ipFilter,
  validateUserAgent,
  compressionMiddleware,
  mongoSanitizeMiddleware,
  securityHeaders,
  securityLogger
};