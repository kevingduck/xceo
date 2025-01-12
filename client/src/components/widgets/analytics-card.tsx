import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from "lucide-react";

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  change: string;
}

export function AnalyticsCard({ title, value, change }: AnalyticsCardProps) {
  const isPositive = change.startsWith("+");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`flex items-center text-sm ${isPositive ? "text-green-500" : "text-red-500"}`}>
          {isPositive ? (
            <ArrowUp className="h-4 w-4 mr-1" />
          ) : (
            <ArrowDown className="h-4 w-4 mr-1" />
          )}
          {change}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
