import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { users } from "@db/schema";
import { setupAuth } from "./auth";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic request logging middleware
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

// Verify database connection on startup
async function verifyDatabaseConnection() {
  try {
    await db.select().from(users).limit(1);
    log("Database connection verified successfully");
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown database error";
    log("Database connection error: " + errorMessage);
    return false;
  }
}

// Verify required environment variables
function verifyEnvironment() {
  const requiredEnvVars = ['DATABASE_URL', 'ANTHROPIC_API_KEY'];
  const missing = requiredEnvVars.filter(env => !process.env[env]);

  if (missing.length > 0) {
    log(`Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }
  return true;
}

(async () => {
  try {
    // Verify environment and database connection before starting
    const envOk = verifyEnvironment();
    if (!envOk) {
      log("Environment verification failed");
      process.exit(1);
    }

    const dbOk = await verifyDatabaseConnection();
    if (!dbOk) {
      log("Database verification failed");
      process.exit(1);
    }

    // Setup authentication before registering routes
    setupAuth(app);

    // Register routes after auth setup
    const server = registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      log("Application error:", {
        status,
        message,
        stack: err.stack,
        error: err instanceof Error ? err.message : String(err)
      });

      res.status(status).json({ message });
    });

    // Setup vite in development mode after all other middleware
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start the server
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server started successfully on port ${PORT}`);
    });
  } catch (error) {
    log("Failed to start server:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();