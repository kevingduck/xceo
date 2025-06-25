import { ReactNode } from "react";
import { useUser } from "@/hooks/use-user";
import { Navigate } from "wouter";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    // Log admin access attempts
    if (!isLoading && user) {
      if (user.role !== 'admin') {
        console.warn(`Unauthorized admin access attempt by user: ${user.username}`);
        // In production, this could send to a logging service
      }
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    toast({
      title: "Access Denied",
      description: "You must be an admin to view this page",
      variant: "destructive"
    });
    
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}