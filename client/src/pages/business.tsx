import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, History, Edit2, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BusinessInfo, BusinessInfoHistory } from "@db/schema";

interface Section {
  id: string;
  title: string;
  description: string;
}

// Map client-side section IDs to server-side section names
const sections: Section[] = [
  {
    id: "overview",
    title: "Business Overview",
    description: "General information about your business, mission, and objectives"
  },
  {
    id: "finance",
    title: "Financial Overview",
    description: "Key financial metrics, revenue streams, and financial goals"
  },
  {
    id: "market",
    title: "Market Intelligence",
    description: "Market trends, competitor analysis, and industry insights"
  },
  {
    id: "humanCapital",
    title: "Human Capital",
    description: "Team structure, hiring needs, and organizational development"
  },
  {
    id: "operations",
    title: "Operations",
    description: "Operational processes, efficiency metrics, and improvement initiatives"
  }
];

interface BusinessField {
  name: string;
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'list';
  description: string;
}

interface BusinessTemplate {
  name: string;
  fields: BusinessField[];
}

function formatFieldValue(value: any, type: string) {
  if (value === null || value === undefined) return '-';

  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(Number(value));
    case 'percentage':
      return `${value}%`;
    case 'date':
      return new Date(value).toLocaleDateString();
    case 'list':
      return Array.isArray(value) ? value.join('\n') : value;
    default:
      return value.toString();
  }
}

function FieldEditor({
  field,
  value,
  onSave,
  onCancel
}: {
  field: BusinessField;
  value: any;
  onSave: (value: any) => void;
  onCancel: () => void;
}) {
  const [currentValue, setCurrentValue] = useState(() => {
    if (field.type === 'list' && Array.isArray(value)) {
      return value.join('\n');
    }
    return value ?? '';
  });

  const handleSave = () => {
    let processedValue = currentValue;

    switch (field.type) {
      case 'list':
        processedValue = currentValue.split('\n').filter(Boolean);
        break;
      case 'number':
      case 'currency':
      case 'percentage':
        processedValue = currentValue === '' ? null : Number(currentValue);
        if (isNaN(processedValue)) {
          processedValue = null;
        }
        break;
      default:
        processedValue = currentValue || null;
    }

    onSave(processedValue);
  };

  const renderInput = () => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder={field.description}
            className="flex-1"
          />
        );
      case 'number':
      case 'currency':
        return (
          <Input
            type="number"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder={field.description}
            step={field.type === 'currency' ? '0.01' : '1'}
            className="flex-1"
          />
        );
      case 'percentage':
        return (
          <Input
            type="number"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder={field.description}
            min="0"
            max="100"
            step="0.1"
            className="flex-1"
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            className="flex-1"
          />
        );
      case 'list':
        return (
          <Textarea
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder={field.description}
            className="flex-1 min-h-[100px]"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {renderInput()}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          className="shrink-0"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function BusinessPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedInfo, setSelectedInfo] = useState<BusinessInfo | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const initializationAttempted = useRef(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load business info and templates
  const { data: businessInfo = [], isLoading: isBusinessLoading } = useQuery<BusinessInfo[]>({
    queryKey: ["/api/business-info"]
  });

  const { data: templates = [], isLoading: isTemplateLoading } = useQuery<BusinessTemplate[]>({
    queryKey: ["/api/business-info/templates"]
  });

  const { data: history = [], isLoading: isHistoryLoading } = useQuery<BusinessInfoHistory[]>({
    queryKey: ["/api/business-info/history", selectedInfo?.id],
    enabled: showHistory && !!selectedInfo
  });

  // Field update mutation
  const updateBusinessFields = useMutation({
    mutationFn: async ({
      id,
      fields
    }: {
      id: number;
      fields: Record<string, any>;
    }) => {
      const response = await fetch(`/api/business-info/${id}/fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
        credentials: "include"
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update field');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-info"] });
      // Update the cache immediately
      queryClient.setQueryData(["/api/business-info"], (oldData: any) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map(info => info.id === data.id ? data : info);
      });
      setEditingField(null);
      toast({
        title: "Field updated",
        description: "The field has been successfully updated"
      });
    },
    onError: (error: Error) => {
      console.error("Failed to update field:", error);
      toast({
        title: "Error updating field",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Add initialization mutation
  const initializeSections = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/business-info/initialize", {
        method: "POST",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log("Sections initialized:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/business-info"] });
      toast({
        title: "Sections initialized",
        description: `Business sections have been created successfully: ${data.sections?.map((s: any) => s.section).join(', ')}`
      });
    },
    onError: (error: Error) => {
      console.error("Failed to initialize sections:", error);
      if (error.message.includes("configure your business")) {
        toast({
          title: "Configuration Required",
          description: <div>
            Please configure your business details first.
            <Link href="/configure-ceo" className="ml-2 underline text-primary">
              Configure Now
            </Link>
          </div>
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  });

  // Add initialization check with retry
  useEffect(() => {
    if (!isBusinessLoading && businessInfo.length === 0 && !initializationAttempted.current) {
      console.log("Attempting to initialize business sections");
      initializationAttempted.current = true;
      initializeSections.mutate();
    } else if (!isBusinessLoading && businessInfo.length > 0) {
      console.log("Business sections found:", businessInfo.map(b => ({
        id: b.id,
        section: b.section
      })));
    }
  }, [isBusinessLoading, businessInfo.length]);

  // Update the field editor save handler
  const handleFieldSave = async (field: BusinessField, value: any) => {
    if (!currentSection?.title) {
      toast({
        title: "Error",
        description: "Invalid section selected",
        variant: "destructive"
      });
      return;
    }

    if (!currentSectionData?.id) {
      console.log("Current section not found, attempting to initialize");

      try {
        const result = await initializeSections.mutateAsync();
        console.log("Initialization result:", result);

        // Refresh business info after initialization
        await queryClient.invalidateQueries({ queryKey: ["/api/business-info"] });

        // Get updated section data
        const updatedBusinessInfo = queryClient.getQueryData(["/api/business-info"]) as BusinessInfo[];

        if (!updatedBusinessInfo) {
          throw new Error("Failed to fetch updated business info");
        }

        console.log("Updated business info:", updatedBusinessInfo);

        const updatedSection = updatedBusinessInfo.find(
          info => info.section === currentSection.title
        );

        console.log("Found section after update:", updatedSection);

        if (!updatedSection?.id) {
          throw new Error(`Section "${currentSection.title}" not found after initialization`);
        }

        // Now proceed with the update using the new section
        await updateBusinessFields.mutateAsync({
          id: updatedSection.id,
          fields: {
            [field.name]: {
              value,
              type: field.type
            }
          }
        });
      } catch (error) {
        console.error("Failed to initialize and update section:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update section",
          variant: "destructive"
        });
        setEditingField(null);
      }
    } else {
      // Normal update flow
      try {
        await updateBusinessFields.mutateAsync({
          id: currentSectionData.id,
          fields: {
            [field.name]: {
              value,
              type: field.type
            }
          }
        });
      } catch (error) {
        console.error("Failed to update field:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update field",
          variant: "destructive"
        });
      }
    }
  };

  // Find business info for current section with proper type checking
  const currentSection = sections.find(s => s.id === activeSection);
  const currentSectionData = businessInfo.find(info =>
    info.section === currentSection?.title
  );

  // Get template for current section
  const currentTemplate = templates.find(t =>
    t.name === currentSection?.title
  );

  // Update section selection logic
  useEffect(() => {
    console.log("Current section:", currentSection);
    console.log("Available business info:", businessInfo);
    console.log("Selected section data:", currentSectionData);
  }, [activeSection, businessInfo]);


  if (isBusinessLoading || isTemplateLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Business Management</h1>
        <p className="text-muted-foreground">
          Manage and track your business information across different areas
        </p>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="mb-4">
          {sections.map((section) => (
            <TabsTrigger key={section.id} value={section.id}>
              {section.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {sections.map((section) => (
          <TabsContent key={section.id} value={section.id} className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedInfo(currentSectionData || null);
                      setShowHistory(true);
                    }}
                  >
                    <History className="h-4 w-4 mr-2" />
                    View History
                  </Button>
                </div>

                {currentTemplate?.fields && (
                  <div className="grid gap-6">
                    {currentTemplate.fields.map((field) => (
                      <div key={field.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">
                              {field.name
                                .split('_')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ')}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {field.description}
                            </p>
                          </div>
                          {editingField !== field.name && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingField(field.name)}
                              className="shrink-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>

                        {editingField === field.name ? (
                          <FieldEditor
                            field={field}
                            value={currentSectionData?.fields?.[field.name]?.value}
                            onSave={(value) => handleFieldSave(field, value)}
                            onCancel={() => setEditingField(null)}
                          />
                        ) : (
                          <div className="bg-muted rounded-md p-2">
                            {updateBusinessFields.isPending && editingField === field.name ? (
                              <div className="flex items-center space-x-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Updating...</span>
                              </div>
                            ) : currentSectionData?.fields?.[field.name] ? (
                              <p className="text-sm">
                                {formatFieldValue(
                                  currentSectionData.fields[field.name].value,
                                  field.type
                                )}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                Not set
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Change History</DialogTitle>
            <DialogDescription>
              View the history of changes made to this section
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isHistoryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-muted-foreground italic">No history available</p>
            ) : (
              history.map((entry) => (
                <Card key={entry.id}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Updated on {new Date(entry.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none">
                    {entry.content}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}