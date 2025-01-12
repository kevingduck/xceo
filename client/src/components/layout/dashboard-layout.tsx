import { SidebarNav } from "./sidebar-nav";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { LogOut, PlayCircle } from "lucide-react";
import { FloatingChat } from "@/components/widgets/floating-chat";
import { useState } from "react";
import { ShepherdProvider } from "@/components/shepherd-provider";
import { BusinessTour } from "@/components/business-tour";

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { user, logout } = useUser();
  const [isTourOpen, setIsTourOpen] = useState(false);

  return (
    <ShepherdProvider>
      <div className="flex h-screen bg-background">
        <SidebarNav />

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 border-b flex items-center justify-between px-4">
            <div className="font-semibold">Welcome, {user?.username}</div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsTourOpen(true)}
                className="flex items-center gap-2"
              >
                <PlayCircle className="h-4 w-4" />
                Start Tour
              </Button>
              <Button variant="ghost" size="icon" onClick={() => logout()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4">
            <BusinessTour 
              isFirstVisit={isTourOpen} 
              onComplete={() => setIsTourOpen(false)} 
            />
            {children}
          </main>

          <FloatingChat />
        </div>
      </div>
    </ShepherdProvider>
  );
}