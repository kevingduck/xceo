import { SidebarNav } from "./sidebar-nav";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { LogOut, Menu } from "lucide-react";
import { FloatingChat } from "@/components/widgets/floating-chat";
import { SidebarProvider, Sidebar, SidebarTrigger } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { user, logout } = useUser();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <Sidebar>
          <SidebarNav />
        </Sidebar>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 border-b flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              {/* Mobile menu trigger */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                  <SidebarNav mobile onClose={() => {}} />
                </SheetContent>
              </Sheet>

              {/* Desktop sidebar trigger */}
              <SidebarTrigger className="hidden md:flex" />

              <span className="font-semibold">Welcome, {user?.username}</span>
            </div>

            <Button variant="ghost" size="icon" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </header>

          <main className="flex-1 overflow-auto p-4">
            {children}
          </main>

          <FloatingChat />
        </div>
      </div>
    </SidebarProvider>
  );
}