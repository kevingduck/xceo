import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, BarChart2, ListTodo } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

type FeatureSuggestion = {
  title: string;
  description: string;
  confidence: number;
  impact: "LOW" | "MEDIUM" | "HIGH";
  timeline: "SHORT" | "MEDIUM" | "LONG";
  supportingEvidence: string[];
};

export default function ResearchPage() {
  const [textInput, setTextInput] = useState("");
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<FeatureSuggestion[]>([]);

  const analyzeMutation = useMutation({
    mutationFn: async (feedback: string) => {
      const response = await fetch("/api/analyze-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedback }),
      });
      if (!response.ok) {
        throw new Error("Failed to analyze feedback");
      }
      return response.json() as Promise<FeatureSuggestion[]>;
    },
    onSuccess: (data) => {
      setSuggestions(data);
      toast({
        title: "Analysis Complete",
        description: `Generated ${data.length} feature suggestions`,
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // TODO: Implement file processing
    toast({
      title: "File Upload",
      description: "File upload functionality coming soon",
    });
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter some feedback text",
        variant: "destructive",
      });
      return;
    }

    analyzeMutation.mutate(textInput);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Research & Feature Discovery</h1>

      {/* Data Collection Section */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Data Collection
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Upload Files</label>
            <Input
              type="file"
              multiple
              accept=".csv,.xlsx,.pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              className="cursor-pointer"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Supported formats: CSV, Excel, PDF, Word, Text
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Direct Text Input</label>
            <Textarea
              placeholder="Paste feedback or notes here..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={5}
            />
          </div>

          <Button 
            onClick={handleTextSubmit}
            disabled={analyzeMutation.isPending}
          >
            {analyzeMutation.isPending ? (
              <>Analyzing...</>
            ) : (
              <>Analyze Feedback</>
            )}
          </Button>
        </div>
      </Card>

      {/* Analysis Results Section */}
      {suggestions.length > 0 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart2 className="w-5 h-5" />
            Analysis Results
          </h2>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Suggested Feature</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Confidence</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.map((suggestion, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{suggestion.title}</TableCell>
                  <TableCell className="max-w-md">
                    {suggestion.description}
                    {suggestion.supportingEvidence.length > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Evidence:
                        <ul className="list-disc list-inside">
                          {suggestion.supportingEvidence.map((evidence, i) => (
                            <li key={i}>{evidence}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{suggestion.confidence}%</TableCell>
                  <TableCell>{suggestion.impact}</TableCell>
                  <TableCell>{suggestion.timeline}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      <ListTodo className="w-4 h-4 mr-2" />
                      Create Task
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}