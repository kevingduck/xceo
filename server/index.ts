import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { users } from "@db/schema";
import { setupAuth } from "./auth";
import { setupMiddleware, applyErrorHandling } from "./middleware";

const app = express();

// Apply security and validation middleware first
const validation = setupMiddleware(app);

// Body parsing middleware (after security middleware)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Verify database connection on startup
async function verifyDatabaseConnection() {
  try {
    // Test database connection with a simple query
    await db.select().from(users).limit(1);
    log("Database connection verified successfully");
  } catch (error) {
    log("Failed to connect to database:", String(error));
    throw error;
  }
}

// Verify required environment variables
function verifyEnvironment() {
  const requiredEnvVars = ['DATABASE_URL', 'ANTHROPIC_API_KEY'];
  const missing = requiredEnvVars.filter(env => !process.env[env]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Verify environment and database connection before starting
    verifyEnvironment();
    await verifyDatabaseConnection();

    // Setup authentication first
    setupAuth(app);

    // Then register all other routes
    const server = registerRoutes(app);

    // Apply error handling middleware (must be last)
    applyErrorHandling(app);

    // Setup Vite for development
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = parseInt(process.env.PORT || "3000", 10);
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server started successfully on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();