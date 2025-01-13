import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";

export default function Settings() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const clearData = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/settings/clear-data", {
        method: "POST",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Data cleared",
        description: "All your data has been cleared successfully. You will now be logged out.",
      });
      // Force reload to clear client state
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const exportData = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/settings/export-data", {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ai-ceo-data.json";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Data exported",
        description: "Your data has been exported successfully"
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-2">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>CEO Configuration</CardTitle>
            <CardDescription>
              Update your business details and CEO preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/configure-ceo")}>
              Configure CEO
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>
              Download all your data including business information, tasks, and chat history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => exportData.mutate()}
              disabled={exportData.isPending}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {exportData.isPending ? "Exporting..." : "Export Data"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clear Data</CardTitle>
            <CardDescription>
              Remove all your data and start fresh. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Clear All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all your:
                    <ul className="list-disc mt-2 ml-6">
                      <li>Business configuration and CEO settings</li>
                      <li>Chat history and conversations</li>
                      <li>Tasks and progress tracking</li>
                      <li>Analytics and insights</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => clearData.mutate()}
                    disabled={clearData.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {clearData.isPending ? "Clearing..." : "Yes, clear everything"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
