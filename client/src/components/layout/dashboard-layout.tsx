import { SidebarNav } from "./sidebar-nav";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { LogOut, Menu } from "lucide-react";
import { FloatingChat } from "@/components/widgets/floating-chat";
import { SidebarProvider, Sidebar, SidebarTrigger } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { user, logout } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Desktop Sidebar */}
        <Sidebar>
          <SidebarNav />
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b flex items-center justify-between px-2 sm:px-4">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile menu trigger */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[280px]">
                  <SidebarNav mobile onClose={() => setIsOpen(false)} />
                </SheetContent>
              </Sheet>

              {/* Desktop sidebar trigger */}
              <SidebarTrigger className="hidden md:flex" />

              <span className="font-semibold truncate">
                Welcome, {user?.username}
                {user?.role === 'admin' && <span className="ml-1 text-sm text-muted-foreground">(Admin)</span>}
              </span>
            </div>

            <Button variant="ghost" size="icon" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </header>

          <main className="flex-1 overflow-auto p-2 sm:p-4">
            <div className="mx-auto max-w-[1200px]">
              {children}
            </div>
          </main>

          <FloatingChat />
        </div>
      </div>
    </SidebarProvider>
  );
}