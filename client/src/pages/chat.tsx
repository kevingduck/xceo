import { useState, useEffect, useRef } from "react";
import { useAIChat } from "@/hooks/use-ai-chat";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { ChatMessage } from "@/components/widgets/chat-message";
import { Send, Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticMessage, setOptimisticMessage] = useState<{ content: string; timestamp: string } | null>(null);
  const { messages, sendMessage } = useAIChat();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or when optimistic message is shown
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, optimisticMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage("");
    
    // Show user message immediately
    setOptimisticMessage({
      content: userMessage,
      timestamp: new Date().toISOString()
    });

    try {
      setIsLoading(true);
      await sendMessage(userMessage);
      setOptimisticMessage(null); // Clear optimistic message after success
    } catch (error) {
      console.error("Failed to send message:", error);
      setOptimisticMessage(null); // Clear optimistic message on error
      setMessage(userMessage); // Restore message on error
      toast({
        title: "Error sending message",
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-[calc(100vh-2rem)]">
      <CardContent className="p-6 flex flex-col h-full">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4 mb-4">
            <ErrorBoundary level="component" isolate>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {optimisticMessage && (
                <ChatMessage 
                  message={{
                    id: 'optimistic',
                    role: 'user',
                    content: optimisticMessage.content,
                    createdAt: new Date(optimisticMessage.timestamp),
                    metadata: {},
                    businessId: 0,
                    threadId: null
                  }}
                />
              )}
            </ErrorBoundary>
            {isLoading && (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask your AI CEO anything..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}