import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Package,
  Plus,
  Calendar,
  Edit2,
  Trash2,
  Star,
  ChevronDown,
  ChevronUp,
  Clock,
  Tag,
} from "lucide-react";

// Form schemas based on the backend types
const offeringFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["product", "service"]),
  status: z.enum(["active", "discontinued", "planned"]).default("active"),
  price: z.object({
    amount: z.number().min(0, "Price must be positive"),
    currency: z.string().default("USD"),
    billingCycle: z.string().optional(),
  }).optional(),
});

const featureFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["available", "deprecated", "coming_soon"]).default("available"),
});

const roadmapItemFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  plannedDate: z.string().optional(),
  status: z.enum(["planned", "in_progress", "completed", "delayed"]).default("planned"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export default function OfferingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showOfferingForm, setShowOfferingForm] = useState(false);
  const [editingOffering, setEditingOffering] = useState<any>(null);
  const [selectedOffering, setSelectedOffering] = useState<any>(null);
  const [showFeatureForm, setShowFeatureForm] = useState(false);
  const [showRoadmapForm, setShowRoadmapForm] = useState(false);

  // Queries
  const { data: offerings = [], isLoading: isLoadingOfferings } = useQuery({
    queryKey: ["/api/offerings"],
  });

  const { data: features = [], isLoading: isLoadingFeatures } = useQuery({
    queryKey: ["/api/offerings", selectedOffering?.id, "features"],
    enabled: !!selectedOffering,
  });

  const { data: roadmapItems = [], isLoading: isLoadingRoadmap } = useQuery({
    queryKey: ["/api/offerings", selectedOffering?.id, "roadmap"],
    enabled: !!selectedOffering,
  });

  // Mutations
  const addOffering = useMutation({
    mutationFn: async (data: z.infer<typeof offeringFormSchema>) => {
      const res = await fetch("/api/offerings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offerings"] });
      setShowOfferingForm(false);
      toast({
        title: "Success",
        description: "Offering added successfully",
      });
    },
  });

  const updateOffering = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof offeringFormSchema> }) => {
      const res = await fetch(`/api/offerings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offerings"] });
      setShowOfferingForm(false);
      setEditingOffering(null);
      toast({
        title: "Success",
        description: "Offering updated successfully",
      });
    },
  });

  const deleteOffering = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/offerings/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offerings"] });
      setSelectedOffering(null);
      toast({
        title: "Success",
        description: "Offering deleted successfully",
      });
    },
  });

  // Form hooks
  const offeringForm = useForm<z.infer<typeof offeringFormSchema>>({
    resolver: zodResolver(offeringFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "product",
      status: "active",
      price: {
        amount: 0,
        currency: "USD",
      },
    },
  });

  // Helper functions
  const handleEditOffering = (offering: any) => {
    setEditingOffering(offering);
    setShowOfferingForm(true);
    offeringForm.reset({
      name: offering.name,
      description: offering.description,
      type: offering.type,
      status: offering.status,
      price: offering.price,
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-green-500/10 text-green-600",
      discontinued: "bg-red-500/10 text-red-600",
      planned: "bg-blue-500/10 text-blue-600",
      "in_progress": "bg-yellow-500/10 text-yellow-600",
      completed: "bg-green-500/10 text-green-600",
      delayed: "bg-red-500/10 text-red-600",
    };
    return colors[status as keyof typeof colors] || "bg-gray-500/10 text-gray-600";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Offerings</h1>
        <Button onClick={() => {
          setEditingOffering(null);
          setShowOfferingForm(true);
          offeringForm.reset();
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Offering
        </Button>
      </div>

      {/* Offerings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoadingOfferings ? (
          <p>Loading offerings...</p>
        ) : offerings.length === 0 ? (
          <p>No offerings yet. Add your first offering to get started.</p>
        ) : (
          offerings.map((offering: any) => (
            <Card key={offering.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{offering.name}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditOffering(offering)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteOffering.mutate(offering.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {offering.type === "product" ? "Product" : "Service"}
                  </Badge>
                  <Badge className={getStatusColor(offering.status)}>
                    {offering.status.charAt(0).toUpperCase() + offering.status.slice(1)}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {offering.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {offering.price && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Tag className="h-4 w-4 mr-2" />
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: offering.price.currency
                    }).format(offering.price.amount)}
                    {offering.price.billingCycle && ` / ${offering.price.billingCycle}`}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Offering Dialog */}
      <Dialog open={showOfferingForm} onOpenChange={setShowOfferingForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOffering ? "Edit Offering" : "Add Offering"}
            </DialogTitle>
          </DialogHeader>
          <Form {...offeringForm}>
            <form onSubmit={offeringForm.handleSubmit((data) =>
              editingOffering
                ? updateOffering.mutate({ id: editingOffering.id, data })
                : addOffering.mutate(data)
            )}>
              <div className="space-y-4">
                <FormField
                  control={offeringForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter offering name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={offeringForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter offering description"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={offeringForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={offeringForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="discontinued">Discontinued</SelectItem>
                            <SelectItem value="planned">Planned</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-4">
                  <FormField
                    control={offeringForm.control}
                    name="price.amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter price"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={offeringForm.control}
                    name="price.billingCycle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Cycle (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., month, year"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowOfferingForm(false);
                    setEditingOffering(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingOffering ? "Update Offering" : "Add Offering"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
