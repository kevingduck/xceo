import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import type { SelectUser, BusinessInfo, ChatMessage, Task, Analytics } from "@db/schema";

export default function AdminPage() {
  const [activeTable, setActiveTable] = useState("users");
  const [search, setSearch] = useState("");

  const { data: users = [] } = useQuery<SelectUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: businessInfo = [] } = useQuery<BusinessInfo[]>({
    queryKey: ["/api/admin/business-info"],
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/admin/tasks"],
  });

  const { data: chatMessages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/admin/chat-messages"],
  });

  const { data: analytics = [] } = useQuery<Analytics[]>({
    queryKey: ["/api/admin/analytics"],
  });

  const tables = [
    { id: "users", name: "Users", data: users },
    { id: "business_info", name: "Business Info", data: businessInfo },
    { id: "tasks", name: "Tasks", data: tasks },
    { id: "chat_messages", name: "Chat Messages", data: chatMessages },
    { id: "analytics", name: "Analytics", data: analytics },
  ];

  const activeData = tables.find((t) => t.id === activeTable)?.data || [];
  
  const filteredData = activeData.filter((item: any) => {
    const searchLower = search.toLowerCase();
    return Object.values(item).some((value) => 
      value && value.toString().toLowerCase().includes(searchLower)
    );
  });

  const renderValue = (value: any) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value);
    return value.toString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Database Admin</h1>
        <p className="text-muted-foreground">
          Manage and view your database content
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTable} onValueChange={setActiveTable}>
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                {tables.map((table) => (
                  <TabsTrigger key={table.id} value={table.id}>
                    {table.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-[250px]"
                />
              </div>
            </div>

            {tables.map((table) => (
              <TabsContent key={table.id} value={table.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {table.name}
                      <Badge variant="secondary">
                        {filteredData.length} records
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      View and manage {table.name.toLowerCase()} data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {filteredData[0] &&
                              Object.keys(filteredData[0]).map((key) => (
                                <TableHead key={key}>{key}</TableHead>
                              ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredData.map((item: any, index: number) => (
                            <TableRow key={index}>
                              {Object.values(item).map((value: any, i: number) => (
                                <TableCell key={i}>
                                  {renderValue(value)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
