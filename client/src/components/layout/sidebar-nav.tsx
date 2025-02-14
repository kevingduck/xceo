import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, MessageSquare, CheckSquare, BarChart, Briefcase, Database, Settings, Users, Package, FlaskConical } from "lucide-react";
import { useUser } from "@/hooks/use-user";

const allNavItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard
  },
  {
    title: "AI Chat",
    href: "/chat",
    icon: MessageSquare
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: CheckSquare
  },
  {
    title: "Business",
    href: "/business",
    icon: Briefcase
  },
  {
    title: "Offerings",
    href: "/offerings",
    icon: Package
  },
  {
    title: "Research",
    href: "/research",
    icon: FlaskConical
  },
  {
    title: "Team",
    href: "/team",
    icon: Users
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings
  },
  {
    title: "Admin",
    href: "/admin",
    icon: Database,
    adminOnly: true
  }
];

interface SidebarNavProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function SidebarNav({ mobile, onClose }: SidebarNavProps) {
  const [location] = useLocation();
  const { user } = useUser();

  // Filter out admin-only items for non-admin users
  const navItems = allNavItems.filter(item => !item.adminOnly || user?.role === "admin");

  return (
    <div className={cn(
      "flex flex-col h-full",
      mobile ? "bg-background" : "bg-card"
    )}>
      <div className="h-14 border-b flex items-center px-4">
        <span className="font-bold text-xl">AI CEO</span>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;

            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => mobile && onClose?.()}
              >
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium cursor-pointer",
                    "transition-colors duration-200",
                    "hover:bg-accent hover:text-accent-foreground",
                    "active:bg-accent/80",
                    "touch-manipulation",
                    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                    // Add tooltip-like behavior for collapsed state
                    "group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center",
                    "group-data-[collapsible=icon]:tooltip-content group-data-[collapsible=icon]:tooltip-right"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">
                    {item.title}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}