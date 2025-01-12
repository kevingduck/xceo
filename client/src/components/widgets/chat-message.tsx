import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@db/schema";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isAI = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-3 items-start",
        isAI ? "flex-row" : "flex-row-reverse"
      )}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={isAI ? "/ai-avatar.svg" : undefined} />
        <AvatarFallback>{isAI ? "AI" : "ME"}</AvatarFallback>
      </Avatar>
      
      <div
        className={cn(
          "rounded-lg px-4 py-2 max-w-[80%]",
          isAI ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
