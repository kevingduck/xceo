import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { OnboardingFlow } from "@/components/onboarding-flow";

export default function ConfigureCEO() {
  const { user } = useUser();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const configureCEO = useMutation({
    mutationFn: async (data: {
      businessName: string;
      businessDescription: string;
      objectives: string[];
      teamSize?: string;
      revenue?: string;
      industry?: string;
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
        title: "Welcome to XCEO!",
        description: "Your AI CEO is ready to help you grow your business"
      });

      // Reload the entire app to ensure all data is refreshed
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Configuration failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleOnboardingComplete = async (data: {
    businessName: string;
    businessDescription: string;
    objectives: string[];
    teamSize: string;
    revenue: string;
    industry: string;
  }) => {
    await configureCEO.mutateAsync(data);
  };

  return (
    <OnboardingFlow 
      onComplete={handleOnboardingComplete}
      initialData={user ? {
        businessName: user.businessName || "",
        businessDescription: user.businessDescription || "",
        objectives: user.businessObjectives || [],
        teamSize: "",
        revenue: "",
        industry: ""
      } : undefined}
    />
  );
}