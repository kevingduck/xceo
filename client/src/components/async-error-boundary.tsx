import { ReactNode, useEffect, useState } from "react";
import { ErrorBoundary } from "./error-boundary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, WifiOff } from "lucide-react";

interface AsyncErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error) => void;
  fallback?: ReactNode;
}

// Custom error class for async errors
export class AsyncError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public retry?: () => Promise<void>
  ) {
    super(message);
    this.name = "AsyncError";
  }
}

// Component to handle network and async errors
export function AsyncErrorFallback({ 
  error, 
  resetError 
}: { 
  error: Error; 
  resetError: () => void;
}) {
  const [isRetrying, setIsRetrying] = useState(false);
  const isNetworkError = error.message.toLowerCase().includes("network") || 
                        error.message.toLowerCase().includes("fetch");
  const isAsyncError = error instanceof AsyncError;

  const handleRetry = async () => {
    if (isAsyncError && error.retry) {
      setIsRetrying(true);
      try {
        await error.retry();
        resetError();
      } catch (e) {
        console.error("Retry failed:", e);
      } finally {
        setIsRetrying(false);
      }
    } else {
      resetError();
    }
  };

  return (
    <Alert variant="destructive" className="my-4">
      <div className="flex items-start gap-2">
        {isNetworkError ? (
          <WifiOff className="h-5 w-5 mt-0.5" />
        ) : (
          <AlertCircle className="h-5 w-5 mt-0.5" />
        )}
        <div className="flex-1">
          <AlertTitle>
            {isNetworkError ? "Connection Error" : "Request Failed"}
          </AlertTitle>
          <AlertDescription className="mt-2">
            {isNetworkError
              ? "Unable to connect to the server. Please check your internet connection."
              : error.message || "An unexpected error occurred while loading data."}
          </AlertDescription>
          {isAsyncError && error.statusCode && (
            <p className="text-xs text-muted-foreground mt-1">
              Error code: {error.statusCode}
            </p>
          )}
          <div className="mt-4">
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
              {isRetrying ? "Retrying..." : "Try Again"}
            </Button>
          </div>
        </div>
      </div>
    </Alert>
  );
}

export function AsyncErrorBoundary({ 
  children, 
  onError,
  fallback 
}: AsyncErrorBoundaryProps) {
  return (
    <ErrorBoundary
      onError={onError}
      fallback={fallback}
      level="section"
      isolate
    >
      {children}
    </ErrorBoundary>
  );
}

// Hook to handle async errors
export function useAsyncError() {
  const [, setError] = useState();
  
  return (error: Error) => {
    setError(() => {
      throw error;
    });
  };
}

// Wrapper for async operations with error handling
export async function handleAsyncError<T>(
  asyncFn: () => Promise<T>,
  options?: {
    fallbackValue?: T;
    onError?: (error: Error) => void;
    retryCount?: number;
    retryDelay?: number;
  }
): Promise<T> {
  const { fallbackValue, onError, retryCount = 0, retryDelay = 1000 } = options || {};
  
  let lastError: Error;
  
  for (let i = 0; i <= retryCount; i++) {
    try {
      return await asyncFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (i < retryCount) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
        continue;
      }
      
      if (onError) {
        onError(lastError);
      }
      
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
      
      throw lastError;
    }
  }
  
  throw lastError!;
}