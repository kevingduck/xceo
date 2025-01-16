import { useState, useRef, useEffect } from "react";
import { useAIChat } from "@/hooks/use-ai-chat";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/widgets/chat-message";
import { Send, Loader2, MessageSquare, X, Minimize2, Maximize2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { messages, sendMessage } = useAIChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Increased threshold to 50 messages since Claude can handle more context
  const shouldSummarize = messages.length >= 50;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    try {
      setIsLoading(true);
      if (shouldSummarize) {
        await sendMessage(
          "Please summarize our conversation so far and create business context from it. " +
          "Focus on key decisions, insights, and action items. Include patterns and relationships you've identified across our discussions."
        );
        setMessage("");
      }
      await sendMessage(message);
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        size="icon"
        variant="outline"
        className="fixed bottom-4 right-4 rounded-full h-12 w-12 shadow-lg hover:shadow-xl transition-all"
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className={`
      fixed bottom-4 right-4 
      ${isMinimized ? 'w-64 h-12' : 'w-96 h-[600px]'}
      shadow-xl transition-all duration-200 flex flex-col
    `}>
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <span className="font-medium">AI CEO Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Content */}
      {!isMinimized && (
        <>
          <ScrollArea
            ref={scrollRef}
            className="flex-1 p-4"
          >
            <div className="space-y-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && (
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>
          </ScrollArea>

          <form
            onSubmit={handleSubmit}
            className="p-4 border-t mt-auto"
          >
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message your AI CEO..."
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </>
      )}
    </Card>
  );
}