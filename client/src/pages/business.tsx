import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, History, Edit2 } from "lucide-react";
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
  // UI ID to Database Name
  'overview': 'Business Overview',
  'finance': 'Financial Overview', 
  'market': 'Market Intelligence',
  'humanCapital': 'Human Capital',
  'operations': 'Operations',
  // Database Name to UI ID
  'Business Overview': 'overview',
  'Financial Overview': 'finance',
  'Market Intelligence': 'market',
  'Human Capital': 'humanCapital',
  'Operations': 'operations'
};

const getSectionFromTitle = (title: string): string => {
  console.log('Getting section for title:', title);

  // Direct lookup in mappings
  if (title in sectionMappings) {
    const mapped = sectionMappings[title];
    console.log('Found direct mapping:', mapped);
    return mapped;
  }

  // Fallback to finding the UI section ID
  const section = sections.find(s => 
    s.title === title || 
    s.id === title.toLowerCase().replace(/\s+/g, '')
  );

  if (section) {
    console.log('Found section by ID/title:', section.id);
    return section.id;
  }

  console.log('No mapping found, defaulting to overview');
  return 'overview';
};

const getTitleFromSection = (sectionId: string): string => {
  const section = sections.find(s => s.id === sectionId);
  return section?.title || sectionId;
};

export default function BusinessPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [selectedInfo, setSelectedInfo] = useState<BusinessInfo | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: businessInfo = [], isLoading: isBusinessLoading } = useQuery<BusinessInfo[]>({
    queryKey: ["/api/business-info"]
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
        const errorText = await response.text();
        throw new Error(errorText);
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

  const createBusinessInfo = useMutation({
    mutationFn: async ({ section, title, content }: { section: string; title: string; content: string }) => {
      console.log('Creating business info with section:', section);
      const response = await fetch("/api/business-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, title, content }),
        credentials: "include"
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
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
      console.log(`Looking for section match: ${info.section} -> ${infoSection} comparing with ${activeSection}`);
      return infoSection === activeSection;
    });

    console.log("Selected info for editing:", info);
    setSelectedInfo(info || null);
    setEditedContent(info?.content || "");
    setIsEditing(true);
  };

  const handleSave = () => {
    const currentSection = sections.find(s => s.id === activeSection);
    if (!currentSection) return;

    console.log('Saving section:', {
      activeSection,
      mappedSection: sectionMappings[activeSection],
      currentSection
    });

    if (selectedInfo) {
      updateBusinessInfo.mutate({
        id: selectedInfo.id,
        content: editedContent
      });
    } else {
      createBusinessInfo.mutate({
        section: currentSection.title, // Use the display title as stored in the database
        title: currentSection.title,
        content: editedContent
      });
    }
  };

  // Find business info for current section
  const currentSectionData = businessInfo.find(info => {
    const infoSection = getSectionFromTitle(info.section);
    console.log(`Checking section: ${info.section} (${infoSection}) against active ${activeSection}`);
    return infoSection === activeSection;
  });

  console.log("Active section:", activeSection);
  console.log("Business info data:", businessInfo);
  console.log("Current section data:", currentSectionData);

  if (isBusinessLoading) {
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
          <TabsContent key={section.id} value={section.id} className="mt-0">
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
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {currentSectionData?.content || (
                    <p className="text-muted-foreground italic">
                      No information available yet. Click Add Information to get started.
                    </p>
                  )}
                </div>
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