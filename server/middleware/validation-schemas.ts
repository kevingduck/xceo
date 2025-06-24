import { z } from 'zod';

// Common validation schemas for reusable data types
export const commonSchemas = {
  email: z.string()
    .min(1, 'Email is required')
    .max(254, 'Email must be less than 254 characters')
    .email('Invalid email format')
    .toLowerCase()
    .trim(),

  phone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  url: z.string()
    .url('Invalid URL format')
    .max(2048, 'URL must be less than 2048 characters')
    .optional()
    .or(z.literal('')),

  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s\-\.\']+$/, 'Name can only contain letters, spaces, hyphens, dots, and apostrophes')
    .trim(),

  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .toLowerCase()
    .trim(),

  currency: z.number()
    .min(0, 'Amount must be positive')
    .max(999999999.99, 'Amount is too large')
    .multipleOf(0.01, 'Amount can have at most 2 decimal places'),

  percentage: z.number()
    .min(0, 'Percentage must be at least 0')
    .max(100, 'Percentage must be at most 100'),

  positiveInt: z.number()
    .int('Must be an integer')
    .min(1, 'Must be a positive integer'),

  nonNegativeInt: z.number()
    .int('Must be an integer')
    .min(0, 'Must be non-negative'),

  id: z.number()
    .int('ID must be an integer')
    .positive('ID must be positive'),

  text: z.string()
    .min(1, 'Text is required')
    .max(1000, 'Text must be less than 1000 characters')
    .trim(),

  longText: z.string()
    .min(1, 'Text is required')
    .max(10000, 'Text must be less than 10000 characters')
    .trim(),

  businessName: z.string()
    .min(1, 'Business name is required')
    .max(200, 'Business name must be less than 200 characters')
    .regex(/^[a-zA-Z0-9\s\-\.\,\&\'\"]+$/, 'Business name contains invalid characters')
    .trim(),

  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),

  dateString: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
    }, 'Invalid date'),

  isoDateTime: z.string()
    .datetime('Must be a valid ISO datetime string'),

  tags: z.array(z.string().min(1).max(50))
    .max(20, 'Too many tags')
    .optional()
    .default([]),

  skills: z.array(z.string().min(1).max(100))
    .max(50, 'Too many skills')
    .optional()
    .default([]),

  status: z.enum(['active', 'inactive', 'pending', 'completed', 'cancelled']),

  priority: z.enum(['low', 'medium', 'high', 'critical']),

  role: z.enum(['user', 'admin', 'moderator']).default('user'),

  // Sanitization transforms
  sanitizedHtml: z.string()
    .max(50000, 'Content is too large')
    .transform((val) => val.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''))
    .transform((val) => val.replace(/javascript:/gi, ''))
    .transform((val) => val.replace(/on\w+\s*=/gi, '')),

  // File validation
  fileSize: z.number()
    .max(10 * 1024 * 1024, 'File size cannot exceed 10MB'), // 10MB limit

  mimeType: z.enum([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json'
  ]),

  // Search and pagination
  searchQuery: z.string()
    .max(200, 'Search query is too long')
    .optional(),

  page: z.number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .max(1000, 'Page number is too large')
    .default(1),

  limit: z.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),

  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  // IP address validation
  ipAddress: z.string()
    .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Invalid IP address'),

  // Color validation
  hexColor: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),

  // JSON validation
  jsonString: z.string()
    .refine((val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    }, 'Invalid JSON format')
    .transform((val) => JSON.parse(val)),

  // UUID validation
  uuid: z.string()
    .uuid('Invalid UUID format'),

  // Business-specific schemas
  businessType: z.enum([
    'sole-proprietorship',
    'partnership',
    'llc',
    'corporation',
    's-corp',
    'non-profit',
    'other'
  ]),

  industryType: z.enum([
    'technology',
    'healthcare',
    'finance',
    'education',
    'retail',
    'manufacturing',
    'consulting',
    'real-estate',
    'hospitality',
    'transportation',
    'agriculture',
    'entertainment',
    'other'
  ]),

  companySize: z.enum([
    '1-10',
    '11-50',
    '51-200',
    '201-500',
    '501-1000',
    '1000+'
  ]),

  revenueRange: z.enum([
    '0-10k',
    '10k-100k',
    '100k-1m',
    '1m-10m',
    '10m-100m',
    '100m+'
  ])
};

// Request parameter validation schemas
export const paramSchemas = {
  id: z.object({
    id: commonSchemas.id
  }),

  userId: z.object({
    userId: commonSchemas.id  
  }),

  slug: z.object({
    slug: commonSchemas.slug
  })
};

// Query parameter validation schemas
const paginationSchema = z.object({
  page: commonSchemas.page,
  limit: commonSchemas.limit,
  sort: commonSchemas.sortOrder
});

export const querySchemas = {
  pagination: paginationSchema,

  search: z.object({
    q: commonSchemas.searchQuery,
    ...paginationSchema.shape
  }),

  dateRange: z.object({
    startDate: commonSchemas.dateString.optional(),
    endDate: commonSchemas.dateString.optional()
  }).refine((data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, 'Start date must be before end date'),

  filter: z.object({
    status: commonSchemas.status.optional(),
    priority: commonSchemas.priority.optional(),
    tags: z.string().optional().transform((val) => val?.split(',').filter(Boolean) || [])
  })
};

// Body validation schemas for different entities
export const bodySchemas = {
  // User schemas
  userRegistration: z.object({
    username: commonSchemas.username,
    email: commonSchemas.email,
    password: commonSchemas.password,
    firstName: commonSchemas.name,
    lastName: commonSchemas.name,
    phone: commonSchemas.phone
  }),

  userLogin: z.object({
    username: commonSchemas.username.or(commonSchemas.email),
    password: z.string().min(1, 'Password is required')
  }),

  userProfile: z.object({
    firstName: commonSchemas.name.optional(),
    lastName: commonSchemas.name.optional(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.phone,
    bio: commonSchemas.longText.optional(),
    avatar: commonSchemas.url
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: commonSchemas.password,
    confirmPassword: z.string()
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }),

  // Business schemas
  businessSetup: z.object({
    businessName: commonSchemas.businessName,
    businessDescription: commonSchemas.longText,
    businessType: commonSchemas.businessType,
    industry: commonSchemas.industryType,
    companySize: commonSchemas.companySize,
    website: commonSchemas.url,
    objectives: z.array(commonSchemas.text).min(1, 'At least one objective is required')
  }),

  // Task schemas
  taskCreate: z.object({
    title: commonSchemas.text,
    description: commonSchemas.longText.optional(),
    priority: commonSchemas.priority.default('medium'),
    status: z.enum(['todo', 'in-progress', 'completed']).default('todo'),
    dueDate: commonSchemas.dateString.optional(),
    tags: commonSchemas.tags,
    assignedTo: commonSchemas.id.optional()
  }),

  taskUpdate: z.object({
    title: commonSchemas.text.optional(),
    description: commonSchemas.longText.optional(),
    priority: commonSchemas.priority.optional(),
    status: z.enum(['todo', 'in-progress', 'completed']).optional(),
    dueDate: commonSchemas.dateString.optional(),
    tags: commonSchemas.tags.optional(),
    assignedTo: commonSchemas.id.optional()
  }),

  // Team member schemas
  teamMemberCreate: z.object({
    name: commonSchemas.name,
    email: commonSchemas.email,
    role: commonSchemas.text,
    department: commonSchemas.text.optional(),
    phone: commonSchemas.phone,
    startDate: commonSchemas.dateString,
    skills: commonSchemas.skills,
    bio: commonSchemas.longText.optional(),
    salary: commonSchemas.currency.optional()
  }),

  // Chat schemas
  chatMessage: z.object({
    content: commonSchemas.longText
  }),

  // Feedback schemas
  feedbackAnalysis: z.object({
    feedback: commonSchemas.longText
  }),

  // Contact form schemas
  contactForm: z.object({
    name: commonSchemas.name,
    email: commonSchemas.email,
    subject: commonSchemas.text,
    message: commonSchemas.longText,
    phone: commonSchemas.phone
  }),

  // File upload schemas
  fileUpload: z.object({
    filename: z.string().min(1, 'Filename is required'),
    mimetype: commonSchemas.mimeType,
    size: commonSchemas.fileSize
  }),

  // Settings schemas
  userSettings: z.object({
    notifications: z.object({
      email: z.boolean().default(true),
      push: z.boolean().default(true),
      sms: z.boolean().default(false)
    }).default({}),
    privacy: z.object({
      profilePublic: z.boolean().default(false),
      showEmail: z.boolean().default(false)
    }).default({}),
    preferences: z.object({
      theme: z.enum(['light', 'dark', 'auto']).default('light'),
      language: z.string().min(2).max(5).default('en'),
      timezone: z.string().default('UTC')
    }).default({})
  })
};

// Combined schemas for complete request validation
export const requestSchemas = {
  // GET requests with query parameters
  getWithPagination: {
    query: querySchemas.pagination
  },

  getWithSearch: {
    query: querySchemas.search
  },

  getWithFilter: {
    query: querySchemas.filter
  },

  // POST requests
  createTask: {
    body: bodySchemas.taskCreate
  },

  createTeamMember: {
    body: bodySchemas.teamMemberCreate
  },

  chatMessage: {
    body: bodySchemas.chatMessage
  },

  analyzeFeedback: {
    body: bodySchemas.feedbackAnalysis
  },

  // PUT/PATCH requests
  updateTask: {
    params: paramSchemas.id,
    body: bodySchemas.taskUpdate
  },

  updateUser: {
    params: paramSchemas.userId,
    body: bodySchemas.userProfile
  },

  // Authentication requests
  register: {
    body: bodySchemas.userRegistration
  },

  login: {
    body: bodySchemas.userLogin
  },

  changePassword: {
    body: bodySchemas.changePassword
  },

  // Business setup
  setupBusiness: {
    body: bodySchemas.businessSetup
  }
};