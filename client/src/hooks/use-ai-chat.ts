import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "@db/schema";
import { AsyncError } from "@/components/async-error-boundary";

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
        body: JSON.stringify({ 
          content, 
          role: "user",
          metadata: {
            shouldSummarize: messages.length >= 50 
          }
        }),
        credentials: "include"
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = "Failed to send message";
        
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = text || errorMessage;
        }
        
        throw new AsyncError(
          errorMessage,
          `CHAT_${response.status}`,
          response.status,
          async () => {
            // Retry function
            return sendMessage.mutateAsync(content);
          }
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
    }
  });

  return {
    messages,
    sendMessage: sendMessage.mutateAsync,
    isLoading: sendMessage.isPending
  };
}