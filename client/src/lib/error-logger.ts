interface ErrorLog {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  level: "error" | "warning" | "info";
  metadata?: Record<string, any>;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private logs: ErrorLog[] = [];
  private maxLogs = 50;

  private constructor() {
    // Initialize error logger
    this.loadLogsFromStorage();
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  private loadLogsFromStorage() {
    try {
      const storedLogs = localStorage.getItem("app_error_logs");
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs);
      }
    } catch (error) {
      console.error("Failed to load error logs:", error);
    }
  }

  private saveLogsToStorage() {
    try {
      // Keep only recent logs
      const recentLogs = this.logs.slice(-this.maxLogs);
      localStorage.setItem("app_error_logs", JSON.stringify(recentLogs));
    } catch (error) {
      console.error("Failed to save error logs:", error);
    }
  }

  private setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.logError(new Error(event.reason), {
        type: "unhandledRejection",
        promise: event.promise,
      });
    });

    // Handle global errors
    window.addEventListener("error", (event) => {
      this.logError(event.error || new Error(event.message), {
        type: "globalError",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });
  }

  logError(error: Error, metadata?: Record<string, any>, componentStack?: string) {
    const errorLog: ErrorLog = {
      message: error.message,
      stack: error.stack,
      componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      level: "error",
      metadata,
    };

    this.logs.push(errorLog);
    this.saveLogsToStorage();

    // In production, send to error tracking service
    if (process.env.NODE_ENV === "production") {
      this.sendToErrorService(errorLog);
    } else {
      console.error("Error logged:", errorLog);
    }
  }

  logWarning(message: string, metadata?: Record<string, any>) {
    const warningLog: ErrorLog = {
      message,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      level: "warning",
      metadata,
    };

    this.logs.push(warningLog);
    this.saveLogsToStorage();

    if (process.env.NODE_ENV === "development") {
      console.warn("Warning logged:", warningLog);
    }
  }

  private async sendToErrorService(errorLog: ErrorLog) {
    // Implement integration with error tracking service
    // Example: Sentry, LogRocket, Bugsnag, etc.
    try {
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorLog),
      // });
    } catch (error) {
      console.error("Failed to send error to service:", error);
    }
  }

  getLogs(level?: ErrorLog["level"]): ErrorLog[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    this.saveLogsToStorage();
  }

  downloadLogs() {
    const logsData = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([logsData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const errorLogger = ErrorLogger.getInstance();

// Utility function to create structured errors
export function createError(
  message: string,
  code?: string,
  metadata?: Record<string, any>
): Error {
  const error = new Error(message);
  (error as any).code = code;
  (error as any).metadata = metadata;
  return error;
}