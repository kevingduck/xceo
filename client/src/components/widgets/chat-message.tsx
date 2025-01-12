import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@db/schema";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isAI = message.role === "assistant";

  // Split content into paragraphs and handle line breaks
  const formattedContent = message.content.split('\n').map((paragraph, index) => (
    <p key={index} className={index > 0 ? "mt-2" : ""}>
      {paragraph}
    </p>
  ));

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
          isAI ? "bg-primary text-primary-foreground" : "bg-muted",
          "whitespace-pre-wrap"
        )}
      >
        {formattedContent}
      </div>
    </div>
  );
}