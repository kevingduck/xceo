import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import { FloatingChat } from "@/components/widgets/floating-chat";

import AuthPage from "@/pages/auth-page";
import ConfigureCEO from "@/pages/configure-ceo";
import Dashboard from "@/pages/dashboard";
import Chat from "@/pages/chat";
import Tasks from "@/pages/tasks";
import Business from "@/pages/business";
import Analytics from "@/pages/analytics";
import Team from "@/pages/team";
import Admin from "@/pages/admin";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Offerings from "@/pages/offerings";
import Research from "@/pages/research";

function ProtectedRoutes() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Allow direct access to configure-ceo page
  if (window.location.pathname === "/configure-ceo") {
    return <ConfigureCEO />;
  }

  // Show configuration page if business details aren't set and not already on configure-ceo page
  if (!user.businessName) {
    return <ConfigureCEO />;
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/chat" component={Chat} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/business" component={Business} />
        <Route path="/offerings" component={Offerings} />
        <Route path="/team" component={Team} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/research" component={Research} />
        <Route path="/configure-ceo" component={ConfigureCEO} />
        <Route path="/settings" component={Settings} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
      <FloatingChat />
    </DashboardLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProtectedRoutes />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;