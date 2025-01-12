import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "@db/schema";

export function useAIChat() {
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat"]
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, role: "user" }),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
    }
  });

  return {
    messages,
    sendMessage: sendMessage.mutateAsync
  };
}
