import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import { FloatingChat } from "@/components/widgets/floating-chat";
import { ErrorBoundary } from "@/components/error-boundary";
import { DevErrorTrigger } from "@/components/dev-error-trigger";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useRoutePreloader, addPreloadListeners } from "@/lib/route-preloader";
import { usePerformanceMonitor } from "@/lib/performance-monitor";

// Lazy-loaded route components
import {
  LazyAuthPage,
  LazyConfigureCEO,
  LazyDashboard,
  LazyChat,
  LazyTasks,
  LazyBusiness,
  LazyAnalytics,
  LazyTeam,
  LazyAdmin,
  LazySettings,
  LazyNotFound,
  LazyOfferings,
  LazyResearch
} from "@/components/lazy-routes";

function ProtectedRoutes() {
  const { user, isLoading } = useUser();
  const [location] = useLocation();
  const { startPreloading, preloadByContext } = useRoutePreloader();

  // Start preloading critical routes when component mounts
  useEffect(() => {
    startPreloading();
    
    // Add hover listeners for navigation elements
    const timer = setTimeout(() => {
      addPreloadListeners();
    }, 1000); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, [startPreloading]);

  // Preload contextual routes when location changes
  useEffect(() => {
    preloadByContext(location);
  }, [location, preloadByContext]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <LazyAuthPage />
      </Suspense>
    );
  }

  // Allow direct access to configure-ceo page
  if (window.location.pathname === "/configure-ceo") {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <LazyConfigureCEO />
      </Suspense>
    );
  }

  // Show configuration page if business details aren't set and not already on configure-ceo page
  if (!user.businessName) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <LazyConfigureCEO />
      </Suspense>
    );
  }

  return (
    <DashboardLayout>
      <ErrorBoundary level="page">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }>
          <Switch>
            <Route path="/" component={LazyDashboard} />
            <Route path="/chat" component={LazyChat} />
            <Route path="/tasks" component={LazyTasks} />
            <Route path="/business" component={LazyBusiness} />
            <Route path="/offerings" component={LazyOfferings} />
            <Route path="/team" component={LazyTeam} />
            <Route path="/analytics" component={LazyAnalytics} />
            <Route path="/research" component={LazyResearch} />
            <Route path="/configure-ceo" component={LazyConfigureCEO} />
            <Route path="/settings" component={LazySettings} />
            {/* Only render admin route if user is admin */}
            {user.role === "admin" && <Route path="/admin" component={LazyAdmin} />}
            <Route component={LazyNotFound} />
          </Switch>
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary level="component" isolate>
        <FloatingChat />
      </ErrorBoundary>
    </DashboardLayout>
  );
}

function App() {
  const { logSummary } = usePerformanceMonitor();

  // Log performance summary after the app has loaded
  useEffect(() => {
    const timer = setTimeout(() => {
      if (process.env.NODE_ENV === 'development') {
        logSummary();
      }
    }, 5000); // Wait 5 seconds to capture most lazy loading

    return () => clearTimeout(timer);
  }, [logSummary]);

  return (
    <ErrorBoundary 
      level="page"
      onError={(error, errorInfo) => {
        console.error("App level error:", error, errorInfo);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ProtectedRoutes />
        <Toaster />
        <DevErrorTrigger />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;