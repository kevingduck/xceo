import { useState } from "react";
import { useAIChat } from "@/hooks/use-ai-chat";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { ChatMessage } from "@/components/widgets/chat-message";
import { Send } from "lucide-react";

export default function Chat() {
  const [message, setMessage] = useState("");
  const { messages, sendMessage } = useAIChat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await sendMessage(message);
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <Card className="h-[calc(100vh-2rem)]">
      <CardContent className="p-6 flex flex-col h-full">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 mb-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
          </div>
        </ScrollArea>
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask your AI CEO anything..."
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
