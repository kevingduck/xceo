import { useMutation, useQuery } from "@tanstack/react-query";

export function useGitHub() {
  const { data: repos } = useQuery({
    queryKey: ["/api/github/repos"],
    enabled: false
  });

  const createIssue = useMutation({
    mutationFn: async ({ repo, title, body }: { repo: string, title: string, body: string }) => {
      const response = await fetch(`/api/github/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, title, body }),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to create issue");
      }

      return response.json();
    }
  });

  return {
    repos,
    createIssue: createIssue.mutateAsync
  };
}
