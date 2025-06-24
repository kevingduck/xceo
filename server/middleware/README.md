# Express Validation & Security Middleware

This directory contains comprehensive input validation and security middleware for the Express server, built with Zod schemas and security best practices.

## Features

### 🛡️ Security Features
- **Rate Limiting**: Multiple rate limiters for different endpoint types
- **SQL Injection Prevention**: Automatic detection and blocking of SQL injection attempts
- **XSS Prevention**: Content sanitization and malicious script detection
- **Request Size Validation**: Configurable payload size limits
- **CORS Protection**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js integration with custom security headers
- **IP Filtering**: Whitelist/blacklist capabilities
- **User Agent Validation**: Bot detection and filtering
- **MongoDB Injection Prevention**: NoSQL injection protection

### ✅ Validation Features
- **Zod Schema Validation**: Type-safe request validation
- **Reusable Schemas**: Common validation patterns for emails, phones, etc.
- **Partial Validation**: Support for PATCH requests with optional fields
- **File Upload Validation**: Size, type, and security validation for uploads
- **Content Type Validation**: Ensure proper content types
- **Custom Error Messages**: Detailed validation error reporting

## Quick Start

### 1. Basic Setup

```typescript
import { setupMiddleware, applyErrorHandling } from './middleware';

const app = express();

// Apply all security and validation middleware
const validation = setupMiddleware(app);

// Your routes here...

// Apply error handling (must be last)
applyErrorHandling(app);
```

### 2. Using Validation in Routes

```typescript
import { applyValidation } from './middleware';

const validation = applyValidation();

// Simple body validation
app.post('/api/users', 
  validation.validateUserRegistration,
  async (req, res) => {
    // req.body is now validated and type-safe
    const { email, username, password } = req.body;
    // ... your logic
  }
);

// Parameter validation
app.get('/api/users/:id',
  validation.validateId,
  async (req, res) => {
    // req.params.id is validated as a positive integer
    const userId = req.params.id;
    // ... your logic
  }
);

// Query parameter validation
app.get('/api/users',
  validation.validatePagination,
  async (req, res) => {
    // req.query has validated page, limit, sort
    const { page, limit, sort } = req.query;
    // ... your logic
  }
);
```

### 3. Rate Limiting

```typescript
// Apply different rate limits to different endpoints
app.post('/api/auth/login', 
  validation.authRateLimit,     // Strict: 5 attempts per 15 minutes
  validation.validateUserLogin,
  loginHandler
);

app.post('/api/chat',
  validation.chatRateLimit,     // 10 messages per minute
  validation.validateChatMessage,
  chatHandler
);

app.post('/api/upload',
  validation.uploadRateLimit,   // 10 uploads per hour
  validation.validateFileUpload(),
  uploadHandler
);
```

## Available Validation Schemas

### Common Schemas (`commonSchemas`)

```typescript
// Basic types
commonSchemas.email        // Email validation with normalization
commonSchemas.phone        // International phone number format
commonSchemas.password     // Strong password requirements
commonSchemas.url          // URL validation
commonSchemas.name         // Person name validation
commonSchemas.username     // Username validation

// Numbers
commonSchemas.currency     // Currency with 2 decimal places
commonSchemas.percentage   // 0-100 percentage
commonSchemas.positiveInt  // Positive integers
commonSchemas.id           // Positive integer ID

// Text
commonSchemas.text         // Short text (max 1000 chars)
commonSchemas.longText     // Long text (max 10000 chars)
commonSchemas.businessName // Business name validation

// Dates
commonSchemas.dateString   // YYYY-MM-DD format
commonSchemas.isoDateTime  // ISO datetime string

// Arrays
commonSchemas.tags         // Array of tags
commonSchemas.skills       // Array of skills

// Business-specific
commonSchemas.businessType // Business entity types
commonSchemas.industryType // Industry categories
commonSchemas.companySize  // Company size ranges
```

### Pre-built Body Schemas (`bodySchemas`)

```typescript
bodySchemas.userRegistration  // Complete user registration
bodySchemas.userLogin        // User login credentials
bodySchemas.userProfile      // User profile updates
bodySchemas.changePassword   // Password change validation

bodySchemas.businessSetup    // Business setup form
bodySchemas.taskCreate      // Task creation
bodySchemas.taskUpdate      // Task updates (partial)
bodySchemas.teamMemberCreate // Team member creation
bodySchemas.chatMessage     // Chat message validation
bodySchemas.feedbackAnalysis // Feedback analysis
bodySchemas.contactForm     // Contact form
bodySchemas.userSettings    // User settings
```

## Rate Limiters

| Rate Limiter | Window | Max Requests | Use Case |
|-------------|---------|--------------|----------|
| `global` | 15 minutes | 1000 | General requests |
| `auth` | 15 minutes | 5 | Authentication |
| `api` | 15 minutes | 100 | API endpoints |
| `upload` | 1 hour | 10 | File uploads |
| `chat` | 1 minute | 10 | Chat messages |

## Security Middleware

### SQL Injection Prevention
Automatically detects and blocks common SQL injection patterns:
- SQL meta-characters
- Union attacks
- Stored procedure calls
- DML operations

### XSS Prevention
Protects against cross-site scripting:
- Script tag filtering
- JavaScript URL detection
- Event handler sanitization
- Content sanitization

### Request Validation
- Maximum payload size enforcement
- Content-type validation
- File upload security
- IP-based filtering

## Custom Validation Examples

### Creating Custom Schemas

```typescript
import { z } from 'zod';
import { commonSchemas } from './validation-schemas';

const customSchema = z.object({
  title: commonSchemas.text,
  price: commonSchemas.currency,
  category: z.enum(['electronics', 'clothing', 'books']),
  tags: commonSchemas.tags,
  publishDate: commonSchemas.dateString
});

// Use with validation middleware
app.post('/api/products',
  validateBody(customSchema),
  productHandler
);
```

### Custom Validation Middleware

```typescript
const validateProductOwnership = asyncHandler(async (req, res, next) => {
  const productId = req.params.id;
  const product = await getProduct(productId);
  
  if (!product) {
    throw new AppError(404, 'NOT_FOUND', 'Product not found');
  }
  
  if (product.userId !== req.user.id) {
    throw new AppError(403, 'FORBIDDEN', 'Not authorized');
  }
  
  req.product = product;
  next();
});

app.patch('/api/products/:id',
  validation.validateId,
  validateProductOwnership,
  validation.validatePartial(customSchema),
  updateProductHandler
);
```

### File Upload Validation

```typescript
// Image upload with size and type restrictions
app.post('/api/upload/avatar',
  validation.validateImageUpload,
  uploadHandler
);

// Custom file validation
const validateCustomFile = validateFileUpload({
  maxSize: 5 * 1024 * 1024,  // 5MB
  allowedTypes: ['application/pdf', 'text/csv'],
  required: true,
  fieldName: 'document'
});

app.post('/api/upload/document',
  validateCustomFile,
  documentUploadHandler
);
```

## Error Handling

The middleware provides comprehensive error handling with detailed error responses:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Invalid input data provided",
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "invalid_string",
      "received": "invalid-email"
    }
  ]
}
```

## Environment Configuration

Configure the middleware behavior with environment variables:

```bash
# Security settings
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
BLOCK_BOTS=true

# Rate limiting
ENABLE_RATE_LIMITING=true
GLOBAL_RATE_LIMIT=1000
AUTH_RATE_LIMIT=5

# Validation
MAX_REQUEST_SIZE=10485760  # 10MB in bytes
ENABLE_XSS_PROTECTION=true
ENABLE_SQL_INJECTION_PROTECTION=true

# Development settings
NODE_ENV=development  # Enables detailed error messages
```

## Best Practices

### 1. Apply Middleware in Correct Order
```typescript
// ✅ Correct order
app.use(securityMiddleware);     // First
app.use(bodyParser);            // After security
app.use(rateLimiting);          // Before routes
// ... your routes
app.use(errorHandler);          // Last
```

### 2. Use Appropriate Rate Limiters
```typescript
// ✅ Use specific rate limiters
app.post('/api/auth/login', validation.authRateLimit, ...);
app.post('/api/chat', validation.chatRateLimit, ...);
app.post('/api/upload', validation.uploadRateLimit, ...);
```

### 3. Validate All User Input
```typescript
// ✅ Validate everything
app.post('/api/resource',
  validation.validateBody(schema),     // Body
  validation.validateParams(paramSchema), // URL params
  validation.validateQuery(querySchema),  // Query params
  handler
);
```

### 4. Use Partial Validation for Updates
```typescript
// ✅ Use partial validation for PATCH
app.patch('/api/users/:id',
  validation.validateId,
  validation.validatePartial(userSchema), // Only validates provided fields
  updateUserHandler
);
```

### 5. Handle File Uploads Securely
```typescript
// ✅ Comprehensive file validation
app.post('/api/upload',
  validation.uploadRateLimit,
  validation.validateFileUpload({
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png'],
    required: true
  }),
  validation.validateMultipartContent,
  uploadHandler
);
```

## Testing

Test your validation middleware:

```typescript
import request from 'supertest';
import app from '../app';

describe('Validation Middleware', () => {
  it('should reject invalid email', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'invalid-email' });
    
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });
  
  it('should enforce rate limits', async () => {
    // Make multiple requests quickly
    const promises = Array(10).fill(0).map(() =>
      request(app).post('/api/auth/login').send({})
    );
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.some(r => r.status === 429);
    expect(rateLimited).toBe(true);
  });
});
```

## Migration Guide

To integrate this middleware into existing routes:

1. **Install dependencies** (already done)
2. **Update server setup**:
   ```typescript
   import { setupMiddleware, applyErrorHandling } from './middleware';
   
   const validation = setupMiddleware(app);
   // ... existing code
   applyErrorHandling(app);
   ```

3. **Add validation to routes gradually**:
   ```typescript
   // Before
   app.post('/api/users', userHandler);
   
   // After
   app.post('/api/users', 
     validation.validateUserRegistration,
     userHandler
   );
   ```

4. **Update error handling** (automatic with enhanced error handler)

5. **Test thoroughly** to ensure existing functionality works

## Troubleshooting

### Common Issues

1. **Rate limit errors in development**:
   ```typescript
   // Disable rate limiting in development
   if (process.env.NODE_ENV !== 'production') {
     app.use('/api', rateLimiters.api);
   }
   ```

2. **CORS errors**:
   ```typescript
   // Add your domain to allowed origins
   const corsOptions = {
     origin: ['http://localhost:3000', 'https://yourdomain.com']
   };
   ```

3. **Validation too strict**:
   ```typescript
   // Use partial validation or custom schemas
   const relaxedSchema = schema.partial();
   ```

4. **File upload issues**:
   ```typescript
   // Check content-type and file size limits
   app.use(express.json({ limit: '50mb' }));
   ```

## Security Considerations

- **Rate Limiting**: Protects against DoS attacks
- **Input Validation**: Prevents injection attacks
- **File Upload Security**: Prevents malicious file uploads
- **Error Information**: Detailed errors only in development
- **Logging**: Security events are logged for monitoring
- **Headers**: Security headers protect against common attacks

This middleware provides production-ready security and validation for your Express application. Customize the schemas and configurations based on your specific needs.