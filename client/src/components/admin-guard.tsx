import { ReactNode, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Log admin access attempts
    if (!isLoading && user) {
      if (user.role !== 'admin') {
        console.warn(`Unauthorized admin access attempt by user: ${user.username}`);
        // In production, this could send to a logging service
      }
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      toast({
        title: "Access Denied",
        description: "You must be an admin to view this page",
        variant: "destructive"
      });
      setLocation("/");
    }
  }, [user, isLoading, toast, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
}