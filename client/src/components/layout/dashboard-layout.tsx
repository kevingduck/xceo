import { SidebarNav } from "./sidebar-nav";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { LogOut } from "lucide-react";

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { user, logout } = useUser();

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b flex items-center justify-between px-4">
          <div className="font-semibold">Welcome, {user?.username}</div>
          <Button variant="ghost" size="icon" onClick={() => logout()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
