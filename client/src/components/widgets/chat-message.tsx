import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@db/schema";
import { useAIChat } from "@/hooks/use-ai-chat";

type SuggestedAction = {
  label: string;
  type: 'field_update' | 'task_creation' | 'analysis';
  value: string;
};

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isAI = message.role === "assistant";
  const { sendMessage } = useAIChat();

  // Parse suggested actions from metadata if they exist
  const suggestedActions: SuggestedAction[] = 
    isAI && message.metadata?.suggestedActions 
      ? message.metadata.suggestedActions 
      : [];

  // Split content into paragraphs and handle line breaks
  const formattedContent = message.content.split('\n').map((paragraph, index) => (
    <p key={index} className={index > 0 ? "mt-2" : ""}>
      {paragraph}
    </p>
  ));

  const handleActionClick = async (action: SuggestedAction) => {
    await sendMessage(action.value);
  };

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

      <div className="flex-1 space-y-4">
        <div
          className={cn(
            "rounded-lg px-4 py-2 max-w-[80%]",
            isAI ? "bg-primary text-primary-foreground" : "bg-muted",
            "whitespace-pre-wrap"
          )}
        >
          {formattedContent}
        </div>

        {isAI && suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {suggestedActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleActionClick(action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}