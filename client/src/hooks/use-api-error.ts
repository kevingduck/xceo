import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ApiClientError } from '@/lib/api-client';
import { errorLogger } from '@/lib/error-logger';

interface UseApiErrorOptions {
  showToast?: boolean;
  fallbackMessage?: string;
  onError?: (error: ApiClientError) => void;
}

export function useApiError() {
  const { toast } = useToast();

  const handleApiError = useCallback(
    (error: unknown, options: UseApiErrorOptions = {}) => {
      const { showToast = true, fallbackMessage = 'An error occurred', onError } = options;

      let apiError: ApiClientError;
      
      if (error instanceof ApiClientError) {
        apiError = error;
      } else if (error instanceof Error) {
        apiError = new ApiClientError(500, 'UNKNOWN_ERROR', error.message);
      } else {
        apiError = new ApiClientError(500, 'UNKNOWN_ERROR', fallbackMessage);
      }

      // Log the error
      errorLogger.logError(apiError, {
        code: apiError.code,
        statusCode: apiError.statusCode,
        details: apiError.details,
      });

      // Call custom error handler if provided
      if (onError) {
        onError(apiError);
      }

      // Show toast notification
      if (showToast) {
        const title = getErrorTitle(apiError.code);
        const description = getErrorMessage(apiError);

        toast({
          title,
          description,
          variant: 'destructive',
        });
      }

      return apiError;
    },
    [toast]
  );

  return { handleApiError };
}

function getErrorTitle(code: string): string {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 'Invalid Input';
    case 'AUTHENTICATION_ERROR':
      return 'Authentication Required';
    case 'AUTHORIZATION_ERROR':
      return 'Access Denied';
    case 'NOT_FOUND':
      return 'Not Found';
    case 'CONFLICT':
      return 'Conflict';
    case 'NETWORK_ERROR':
      return 'Connection Error';
    case 'TIMEOUT':
      return 'Request Timeout';
    case 'DATABASE_ERROR':
      return 'Database Error';
    default:
      return 'Error';
  }
}

function getErrorMessage(error: ApiClientError): string {
  // Handle validation errors with field details
  if (error.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
    return error.details
      .map((detail: any) => `${detail.field}: ${detail.message}`)
      .join(', ');
  }

  // Handle network errors with helpful messages
  if (error.code === 'NETWORK_ERROR') {
    return 'Please check your internet connection and try again.';
  }

  if (error.code === 'TIMEOUT') {
    return 'The request took too long. Please try again.';
  }

  // Return the error message or a fallback
  return error.message || 'An unexpected error occurred. Please try again.';
}