import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { errorLogger } from "@/lib/error-logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  level?: "page" | "section" | "component";
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;
  private previousResetKeys: Array<string | number> = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error caught by boundary:", error, errorInfo);
    }

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Update state with error info
    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Log to external service (you can integrate with Sentry, LogRocket, etc.)
    this.logErrorToService(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    
    // Reset error boundary when resetKeys change
    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => key !== this.previousResetKeys[idx])) {
        this.resetErrorBoundary();
      }
    }
    
    // Reset on any props change if specified
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
    
    this.previousResetKeys = resetKeys || [];
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Use the centralized error logger
    errorLogger.logError(
      error,
      {
        level: this.props.level || "component",
        errorBoundary: true,
        errorCount: this.state.errorCount,
      },
      errorInfo?.componentStack || ''
    );
  };

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    });
  };

  handleReset = () => {
    this.resetErrorBoundary();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    const { hasError, error, errorCount } = this.state;
    const { children, fallback, isolate, level = "component" } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      // Different UI based on error boundary level
      if (level === "page") {
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="max-w-lg w-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                  <CardTitle>Something went wrong</CardTitle>
                </div>
                <CardDescription>
                  We encountered an unexpected error. Please try refreshing the page or return to the home page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {process.env.NODE_ENV === "development" && (
                  <Alert variant="destructive">
                    <AlertTitle>Error Details (Development Only)</AlertTitle>
                    <AlertDescription className="mt-2 font-mono text-xs">
                      {error.message}
                    </AlertDescription>
                  </Alert>
                )}
                
                {errorCount > 2 && (
                  <Alert>
                    <AlertTitle>Multiple errors detected</AlertTitle>
                    <AlertDescription>
                      If the problem persists, please contact support.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button onClick={this.handleReset} variant="default">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                  <Button onClick={this.handleGoHome} variant="outline">
                    <Home className="mr-2 h-4 w-4" />
                    Go Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      if (level === "section") {
        return (
          <Card className="border-destructive">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-base">Section Error</CardTitle>
                </div>
                <Button
                  onClick={this.handleReset}
                  variant="ghost"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This section couldn't load properly. Try refreshing it.
              </p>
            </CardContent>
          </Card>
        );
      }

      // Component level error (minimal UI)
      if (isolate) {
        return (
          <Alert variant="destructive" className="my-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Component Error</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>This component failed to load.</span>
              <Button
                onClick={this.handleReset}
                variant="ghost"
                size="sm"
                className="h-auto p-1"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        );
      }

      // Default component error
      return (
        <div className="p-4 border border-destructive rounded-md">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Failed to render this component.
          </p>
          <Button onClick={this.handleReset} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      );
    }

    return children;
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook to trigger error boundary (for testing/development)
export function useErrorHandler() {
  return (error: Error) => {
    throw error;
  };
}