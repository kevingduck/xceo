import type { Request, Response, NextFunction } from "express";

// Middleware to log all admin actions
export function adminActionLogger(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  const originalSend = res.send;
  const startTime = Date.now();

  // Log the admin action
  console.log(`[ADMIN ACTION] ${new Date().toISOString()} - User: ${req.user?.username} (ID: ${req.user?.id}) - ${req.method} ${req.path}`);
  
  if (req.body && Object.keys(req.body).length > 0) {
    // Don't log sensitive data
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = "[REDACTED]";
    console.log(`[ADMIN ACTION] Request body:`, JSON.stringify(sanitizedBody));
  }

  // Override response methods to log the result
  res.json = function(data: any) {
    const duration = Date.now() - startTime;
    console.log(`[ADMIN ACTION] Response (${res.statusCode}) - Duration: ${duration}ms`);
    return originalJson.call(this, data);
  };

  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    console.log(`[ADMIN ACTION] Response (${res.statusCode}) - Duration: ${duration}ms`);
    return originalSend.call(this, data);
  };

  next();
}

// In production, this would integrate with a proper logging service like:
// - AWS CloudWatch
// - Datadog
// - LogRocket
// - Sentry
// And would include:
// - IP addresses
// - User agents  
// - Geo-location
// - Detailed action tracking
// - Anomaly detection