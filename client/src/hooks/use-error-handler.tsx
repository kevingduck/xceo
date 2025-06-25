import { useToast } from "@/hooks/use-toast";
import { errorLogger } from "@/lib/error-logger";
import { AsyncError } from "@/components/async-error-boundary";
import { ToastAction } from "@/components/ui/toast";

interface ErrorHandlerOptions {
  showToast?: boolean;
  fallbackMessage?: string;
  retry?: () => Promise<void>;
}

export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = (error: Error | unknown, options?: ErrorHandlerOptions) => {
    const {
      showToast = true,
      fallbackMessage = "An unexpected error occurred",
      retry
    } = options || {};

    // Convert unknown errors to Error instances
    const errorInstance = error instanceof Error ? error : new Error(String(error));
    
    // Log the error
    errorLogger.logError(errorInstance, {
      source: "useErrorHandler",
      showToast,
      hasRetry: !!retry
    });

    // Show toast notification if enabled
    if (showToast) {
      const isNetworkError = errorInstance.message.toLowerCase().includes("network") ||
                            errorInstance.message.toLowerCase().includes("fetch");
      
      toast({
        title: isNetworkError ? "Connection Error" : "Error",
        description: errorInstance.message || fallbackMessage,
        variant: "destructive",
        action: retry ? (
          <ToastAction 
            altText="Retry"
            onClick={async () => {
              try {
                await retry();
              } catch (retryError) {
                handleError(retryError, { ...options, retry: undefined });
              }
            }}
          >
            Retry
          </ToastAction>
        ) : undefined
      });
    }

    // Return the error for further handling if needed
    return errorInstance;
  };

  const createAsyncError = (
    message: string,
    code?: string,
    statusCode?: number,
    retry?: () => Promise<void>
  ) => {
    return new AsyncError(message, code, statusCode, retry);
  };

  return {
    handleError,
    createAsyncError
  };
}

// Global error handler for React Query
export const queryErrorHandler = (error: unknown) => {
  const errorInstance = error instanceof Error ? error : new Error(String(error));
  
  // Log all query errors
  errorLogger.logError(errorInstance, {
    source: "react-query",
    type: "query-error"
  });

  // Don't show toast for every query error to avoid spam
  // Individual queries can handle their own error display
  console.error("Query error:", errorInstance);
};