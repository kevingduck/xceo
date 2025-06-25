import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Trash2, Edit, Save, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { 
  SelectUser, 
  BusinessInfo, 
  ChatMessage, 
  Task, 
  Analytics,
  TeamMember,
  Position,
  Candidate,
  Offering,
  PricingTier,
  Attachment,
  ConversationSummary,
  BusinessInfoHistory,
  OfferingFeature,
  RoadmapItem,
  PricingFeature
} from "@db/schema";
import { ErrorBoundary } from "@/components/error-boundary";
import { ErrorLogViewer } from "@/components/error-log-viewer";

export default function AdminPage() {
  const [activeTable, setActiveTable] = useState("users");
  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [editingItem, setEditingItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Add auth check
  useEffect(() => {
    fetch('/api/user')
      .then(res => res.json())
      .then(user => {
        if (!user || user.role !== 'admin') {
          window.location.href = '/';
          toast({
            title: "Access Denied",
            description: "You must be an admin to view this page",
            variant: "destructive"
          });
        }
      });
  }, []);

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

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/admin/team-members"],
  });

  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: ["/api/admin/positions"],
  });

  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ["/api/admin/candidates"],
  });

  const { data: offerings = [] } = useQuery<Offering[]>({
    queryKey: ["/api/admin/offerings"],
  });

  const { data: pricingTiers = [] } = useQuery<PricingTier[]>({
    queryKey: ["/api/admin/pricing-tiers"],
  });

  const { data: conversationSummaries = [] } = useQuery<ConversationSummary[]>({
    queryKey: ["/api/admin/conversation-summaries"],
  });

  const { data: businessInfoHistory = [] } = useQuery<BusinessInfoHistory[]>({
    queryKey: ["/api/admin/business-info-history"],
  });

  const { data: attachments = [] } = useQuery<Attachment[]>({
    queryKey: ["/api/admin/attachments"],
  });

  const { data: offeringFeatures = [] } = useQuery<OfferingFeature[]>({
    queryKey: ["/api/admin/offering-features"],
  });

  const { data: roadmapItems = [] } = useQuery<RoadmapItem[]>({
    queryKey: ["/api/admin/roadmap-items"],
  });

  const { data: pricingFeatures = [] } = useQuery<PricingFeature[]>({
    queryKey: ["/api/admin/pricing-features"],
  });

  const tables = [
    { id: "users", name: "Users", data: users },
    { id: "business_info", name: "Business Info", data: businessInfo },
    { id: "business_info_history", name: "Business Info History", data: businessInfoHistory },
    { id: "tasks", name: "Tasks", data: tasks },
    { id: "chat_messages", name: "Chat Messages", data: chatMessages },
    { id: "conversation_summaries", name: "Conversation Summaries", data: conversationSummaries },
    { id: "analytics", name: "Analytics", data: analytics },
    { id: "team_members", name: "Team Members", data: teamMembers },
    { id: "positions", name: "Positions", data: positions },
    { id: "candidates", name: "Candidates", data: candidates },
    { id: "offerings", name: "Offerings", data: offerings },
    { id: "offering_features", name: "Offering Features", data: offeringFeatures },
    { id: "pricing_tiers", name: "Pricing Tiers", data: pricingTiers },
    { id: "pricing_features", name: "Pricing Features", data: pricingFeatures },
    { id: "roadmap_items", name: "Roadmap Items", data: roadmapItems },
    { id: "attachments", name: "Attachments", data: attachments },
    { id: "error_logs", name: "Error Logs", data: [] }, // Special tab for error logs
  ];

  const deleteItemMutation = useMutation({
    mutationFn: async ({ table, ids }: { table: string, ids: number[] }) => {
      const response = await fetch(`/api/admin/${table}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/${variables.table}`] });
      toast({
        title: "Success",
        description: "Items deleted successfully"
      });
      setSelectedItems({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ table, id, data }: { table: string, id: number, data: any }) => {
      const response = await fetch(`/api/admin/${table}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/${variables.table}`] });
      toast({
        title: "Success",
        description: "Item updated successfully"
      });
      setEditingItem(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const activeData = tables.find((t) => t.id === activeTable)?.data || [];

  const filteredData = activeData.filter((item: any) => {
    const searchLower = search.toLowerCase();
    return Object.values(item).some((value) =>
      value && value.toString().toLowerCase().includes(searchLower)
    );
  });

  const handleSelectAll = (checked: boolean) => {
    const newSelected: Record<string, boolean> = {};
    if (checked) {
      filteredData.forEach((item: any) => {
        newSelected[item.id] = true;
      });
    }
    setSelectedItems(newSelected);
  };

  const handleDeleteSelected = () => {
    const ids = Object.entries(selectedItems)
      .filter(([_, selected]) => selected)
      .map(([id]) => parseInt(id));

    if (ids.length > 0) {
      deleteItemMutation.mutate({ table: activeTable, ids });
    }
  };

  const handleSaveEdit = (item: any) => {
    const { id, ...data } = item;

    // Remove read-only fields before updating
    const { createdAt, updatedAt, password, ...updateData } = data;
    
    updateItemMutation.mutate({
      table: activeTable,
      id,
      data: updateData
    });
  };

  const renderValue = (value: any, item: any, key: string) => {
    if (editingItem?.id === item.id) {
      // Special handling for known fields
      if (key === 'role') {
        return (
          <select
            value={editingItem[key]}
            onChange={(e) => setEditingItem({ ...editingItem, [key]: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        );
      }
      if (key === 'status' && activeTable === 'positions') {
        return (
          <select
            value={editingItem[key]}
            onChange={(e) => setEditingItem({ ...editingItem, [key]: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="on_hold">On Hold</option>
          </select>
        );
      }
      if (key === 'status' && activeTable === 'candidates') {
        return (
          <select
            value={editingItem[key]}
            onChange={(e) => setEditingItem({ ...editingItem, [key]: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="new">New</option>
            <option value="screening">Screening</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
        );
      }
      if (typeof value === 'boolean') {
        return (
          <input
            type="checkbox"
            checked={editingItem[key]}
            onChange={(e) => setEditingItem({ ...editingItem, [key]: e.target.checked })}
          />
        );
      }
      if (typeof value === 'object') {
        return (
          <Textarea
            value={JSON.stringify(editingItem[key], null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setEditingItem({ ...editingItem, [key]: parsed });
              } catch {
                // Keep the string value if it's not valid JSON yet
              }
            }}
            className="w-full font-mono text-xs"
            rows={3}
          />
        );
      }
      if (typeof value === 'string' || typeof value === 'number') {
        return (
          <Input
            value={editingItem[key]}
            onChange={(e) => setEditingItem({ ...editingItem, [key]: e.target.value })}
            className="w-full"
          />
        );
      }
    }

    // Display logic
    if (value === null || value === undefined) return <span className="text-muted-foreground">-</span>;
    if (typeof value === "boolean") {
      return <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>;
    }
    if (value instanceof Date) {
      return new Date(value).toLocaleString();
    }
    if (typeof value === "object") {
      return (
        <pre className="text-xs bg-muted p-1 rounded max-w-xs overflow-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    if (key === 'password') return "••••••••";
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

      <ErrorBoundary level="section">
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTable} onValueChange={setActiveTable}>
              <div className="flex justify-between items-center mb-4 gap-4">
                <ScrollArea className="flex-1">
                  <TabsList className="flex w-max">
                    {tables.map((table) => (
                      <TabsTrigger key={table.id} value={table.id} className="whitespace-nowrap">
                        {table.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </ScrollArea>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search content..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 w-[250px]"
                  />
                </div>
                {Object.values(selectedItems).some(Boolean) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the selected items.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelected}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>

            {tables.map((table) => (
              <TabsContent key={table.id} value={table.id}>
                {table.id === "error_logs" ? (
                  <ErrorLogViewer />
                ) : (
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
                            <TableHead className="w-12">
                              <input
                                type="checkbox"
                                checked={
                                  filteredData.length > 0 &&
                                  filteredData.every((item: any) => selectedItems[item.id])
                                }
                                onChange={(e) => handleSelectAll(e.target.checked)}
                              />
                            </TableHead>
                            {filteredData[0] &&
                              Object.keys(filteredData[0]).map((key) => (
                                <TableHead key={key}>{key}</TableHead>
                              ))}
                            <TableHead className="w-20">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredData.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={selectedItems[item.id] || false}
                                  onChange={(e) =>
                                    setSelectedItems({
                                      ...selectedItems,
                                      [item.id]: e.target.checked,
                                    })
                                  }
                                />
                              </TableCell>
                              {Object.entries(item).map(([key, value]: [string, any]) => (
                                <TableCell key={key}>
                                  {renderValue(value, item, key)}
                                </TableCell>
                              ))}
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {editingItem?.id === item.id ? (
                                    <>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleSaveEdit(editingItem)}
                                      >
                                        <Save className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setEditingItem(null)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setEditingItem({ ...item })}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="icon" variant="ghost">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This action cannot be undone. This will permanently delete this item.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            deleteItemMutation.mutate({
                                              table: activeTable,
                                              ids: [item.id],
                                            })
                                          }
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
          </CardContent>
        </Card>
      </ErrorBoundary>
    </div>
  );
}