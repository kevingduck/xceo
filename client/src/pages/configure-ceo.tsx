import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function ConfigureCEO() {
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [objectives, setObjectives] = useState("");
  const { user } = useUser();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Initialize form with existing data if available
  useEffect(() => {
    if (user?.businessName) {
      setBusinessName(user.businessName);
      setBusinessDescription(user.businessDescription || "");
      setObjectives((user.businessObjectives || []).join("\n"));
    }
  }, [user]);

  const configureCEO = useMutation({
    mutationFn: async (data: {
      businessName: string;
      businessDescription: string;
      objectives: string[];
    }) => {
      const response = await fetch("/api/configure-ceo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration successful",
        description: "Your AI CEO settings have been updated successfully"
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
      queryClient.invalidateQueries({ queryKey: ["/api/business-info"] });

      // Redirect to home page and force a reload to ensure fresh state
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Configuration failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !businessDescription.trim() || !objectives.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const objectivesList = objectives
      .split("\n")
      .map(o => o.trim())
      .filter(Boolean);

    if (objectivesList.length === 0) {
      toast({
        title: "Missing objectives",
        description: "Please add at least one business objective",
        variant: "destructive"
      });
      return;
    }

    await configureCEO.mutateAsync({
      businessName,
      businessDescription,
      objectives: objectivesList
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/20 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{user?.businessName ? "Update" : "Configure"} Your AI CEO</CardTitle>
          <CardDescription>
            Tell me about your business and what you'd like me to help you achieve
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Business Name</label>
              <Input
                placeholder="Enter your business name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Business Description</label>
              <Textarea
                placeholder="What does your business do? What are your main products or services?"
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Business Objectives</label>
              <Textarea
                placeholder="List your key business objectives (one per line)"
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                className="min-h-[150px]"
              />
              <p className="text-sm text-muted-foreground">
                Examples:
                <br />- Increase revenue by 20% this year
                <br />- Launch 2 new product lines
                <br />- Expand to international markets
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={configureCEO.isPending}
            >
              {configureCEO.isPending ? "Saving..." : (user?.businessName ? "Update" : "Configure") + " AI CEO"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}