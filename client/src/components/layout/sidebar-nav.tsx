import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, MessageSquare, CheckSquare, BarChart } from "lucide-react";

const navItems = [
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
    title: "Analytics",
    href: "/analytics",
    icon: BarChart
  }
];

export function SidebarNav() {
  const [location] = useLocation();

  return (
    <div className="w-64 border-r bg-card">
      <div className="h-14 border-b flex items-center px-4">
        <span className="font-bold text-xl">AI CEO</span>
      </div>
      
      <nav className="p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <a
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                  "hover:bg-accent hover:text-accent-foreground",
                  location === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </a>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
