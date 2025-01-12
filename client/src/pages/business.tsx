import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BusinessTour } from "@/components/business-tour";
import "@/styles/tour.css";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, History, Edit2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { BusinessInfo, BusinessInfoHistory } from "@db/schema";

interface Section {
  id: string;
  title: string;
  description: string;
}

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

// Bidirectional mapping between UI section IDs and database section names
const sectionMappings: Record<string, string> = {
  'overview': 'Business Overview',
  'finance': 'Financial Overview',
  'market': 'Market Intelligence',
  'humanCapital': 'Human Capital',
  'operations': 'Operations',
  'Business Overview': 'overview',
  'Financial Overview': 'finance',
  'Market Intelligence': 'market',
  'Human Capital': 'humanCapital',
  'Operations': 'operations'
};

interface BusinessField {
  name: string;
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'list';
  description: string;
}

interface BusinessTemplate {
  name: string;
  template: string;
  fields: BusinessField[];
}

const getSectionFromTitle = (title: string): string => {
  if (title in sectionMappings) {
    return sectionMappings[title];
  }

  const section = sections.find(s =>
    s.title === title ||
    s.id === title.toLowerCase().replace(/\s+/g, '')
  );

  return section?.id || 'overview';
};

const getTitleFromSection = (sectionId: string): string => {
  const section = sections.find(s => s.id === sectionId);
  return section?.title || sectionId;
};

// Helper function to format field values based on type
const formatFieldValue = (value: any, type: string) => {
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
      return Array.isArray(value) ? value.join(', ') : value;
    default:
      return value.toString();
  }
};

// Field Editor Component
function FieldEditor({
  field,
  value,
  onChange
}: {
  field: BusinessField;
  value: any;
  onChange: (value: any) => void;
}) {
  switch (field.type) {
    case 'text':
      return (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.description}
        />
      );
    case 'number':
    case 'currency':
      return (
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={field.description}
          step={field.type === 'currency' ? '0.01' : '1'}
        />
      );
    case 'percentage':
      return (
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={field.description}
          min="0"
          max="100"
          step="0.1"
        />
      );
    case 'date':
      return (
        <Input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'list':
      return (
        <Textarea
          value={Array.isArray(value) ? value.join('\n') : value || ''}
          onChange={(e) => onChange(e.target.value.split('\n').filter(Boolean))}
          placeholder={field.description}
        />
      );
    default:
      return null;
  }
}

export default function BusinessPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [selectedInfo, setSelectedInfo] = useState<BusinessInfo | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const updateBusinessInfo = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const response = await fetch(`/api/business-info/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-info"] });
      setIsEditing(false);
      toast({
        title: "Changes saved",
        description: "Your business information has been updated"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

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
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-info"] });
      setEditingField(null);
      toast({
        title: "Field updated",
        description: "The field has been successfully updated"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const createBusinessInfo = useMutation({
    mutationFn: async ({
      section,
      title,
      content
    }: {
      section: string;
      title: string;
      content: string;
    }) => {
      const response = await fetch("/api/business-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, title, content }),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-info"] });
      setIsEditing(false);
      toast({
        title: "Created",
        description: "New business information section has been created"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleEdit = () => {
    const currentSection = sections.find(s => s.id === activeSection);
    if (!currentSection) return;

    const info = businessInfo.find(info => {
      const infoSection = getSectionFromTitle(info.section);
      return infoSection === activeSection;
    });

    setSelectedInfo(info || null);
    setEditedContent(info?.content || "");
    setIsEditing(true);
  };

  const handleSave = () => {
    const currentSection = sections.find(s => s.id === activeSection);
    if (!currentSection) return;

    if (selectedInfo) {
      updateBusinessInfo.mutate({
        id: selectedInfo.id,
        content: editedContent
      });
    } else {
      createBusinessInfo.mutate({
        section: currentSection.title,
        title: currentSection.title,
        content: editedContent
      });
    }
  };

  const handleFieldUpdate = (infoId: number, fieldName: string, value: any) => {
    updateBusinessFields.mutate({
      id: infoId,
      fields: {
        [fieldName]: {
          value,
          type: templates
            .find(t => t.name === sectionMappings[activeSection])
            ?.fields.find(f => f.name === fieldName)?.type || 'text'
        }
      }
    });
  };

  // Find business info for current section
  const currentSectionData = businessInfo.find(info => {
    const infoSection = getSectionFromTitle(info.section);
    return infoSection === activeSection;
  });

  // Get template for current section
  const currentTemplate = templates.find(t => t.name === sectionMappings[activeSection]);

  // Add state for first visit check
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    const hasCompletedTour = localStorage.getItem("businessTourCompleted");
    return !hasCompletedTour;
  });

  const handleTourComplete = () => {
    localStorage.setItem("businessTourCompleted", "true");
    setIsFirstVisit(false);
  };

  if (isBusinessLoading || isTemplateLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BusinessTour isFirstVisit={isFirstVisit} />

      <div className="business-header">
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
                    className="history-button"
                    onClick={() => {
                      setSelectedInfo(currentSectionData || null);
                      setShowHistory(true);
                    }}
                    disabled={!currentSectionData}
                  >
                    <History className="h-4 w-4 mr-2" />
                    View History
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleEdit}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    {currentSectionData ? "Edit" : "Add Information"}
                  </Button>
                </div>

                <div className="section-content prose prose-sm max-w-none whitespace-pre-wrap">
                  {currentSectionData?.content || (
                    <p className="text-muted-foreground italic">
                      No information available yet. Click Add Information to get started.
                    </p>
                  )}
                </div>

                {/* Fields Section */}
                {currentTemplate && (
                  <Card className="mt-6 fields-section">
                    <CardHeader>
                      <CardTitle className="text-lg">Fields</CardTitle>
                      <CardDescription>
                        Track and update specific metrics for this section
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        {currentTemplate.fields.map((field) => (
                          <div key={field.name} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <label className="text-sm font-medium">
                                  {field.name.split('_').map(word =>
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                  ).join(' ')}
                                </label>
                                <p className="text-xs text-muted-foreground">
                                  {field.description}
                                </p>
                              </div>
                              {currentSectionData && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingField(field.name)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>

                            {editingField === field.name ? (
                              <div className="flex items-center gap-2">
                                <FieldEditor
                                  field={field}
                                  value={currentSectionData?.fields?.[field.name]?.value}
                                  onChange={(value) =>
                                    handleFieldUpdate(currentSectionData.id, field.name, value)
                                  }
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingField(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="bg-muted rounded-md p-2">
                                {currentSectionData?.fields?.[field.name] ? (
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
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedInfo ? "Edit" : "Add"} Information</DialogTitle>
            <DialogDescription>
              {selectedInfo ? "Update" : "Add"} content for {getTitleFromSection(activeSection)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[300px]"
              placeholder={`Enter ${getTitleFromSection(activeSection)} information here...`}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateBusinessInfo.isPending || createBusinessInfo.isPending}
            >
              {updateBusinessInfo.isPending || createBusinessInfo.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                      {entry.reason && (
                        <Badge variant="outline">{entry.reason}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none whitespace-pre-wrap">
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