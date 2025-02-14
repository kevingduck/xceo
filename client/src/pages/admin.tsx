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
import { Search, Trash2, Edit, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SelectUser, BusinessInfo, ChatMessage, Task, Analytics } from "@db/schema";

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

  const tables = [
    { id: "users", name: "Users", data: users },
    { id: "business_info", name: "Business Info", data: businessInfo },
    { id: "tasks", name: "Tasks", data: tasks },
    { id: "chat_messages", name: "Chat Messages", data: chatMessages },
    { id: "analytics", name: "Analytics", data: analytics },
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

    // If we're editing a user, only send necessary fields
    if (activeTable === 'users') {
      const { password, createdAt, updatedAt, ...userUpdateData } = data;
      updateItemMutation.mutate({
        table: activeTable,
        id,
        data: userUpdateData
      });
    } else {
      updateItemMutation.mutate({
        table: activeTable,
        id,
        data
      });
    }
  };

  const renderValue = (value: any, item: any, key: string) => {
    if (editingItem?.id === item.id) {
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
      if (typeof value === 'boolean') {
        return (
          <input
            type="checkbox"
            checked={editingItem[key]}
            onChange={(e) => setEditingItem({ ...editingItem, [key]: e.target.checked })}
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
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}