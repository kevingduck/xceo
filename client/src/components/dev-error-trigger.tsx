import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bug } from "lucide-react";
import { useErrorHandler } from "@/hooks/use-error-handler";

// Only render in development
export function DevErrorTrigger() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }
  const [asyncError, setAsyncError] = useState(false);
  const { createAsyncError } = useErrorHandler();

  const triggerError = (type: string) => {
    switch (type) {
      case "sync":
        throw new Error("Test sync error from DevErrorTrigger");
      
      case "async":
        setAsyncError(true);
        setTimeout(() => {
          throw new Error("Test async error from DevErrorTrigger");
        }, 100);
        break;
      
      case "network":
        throw createAsyncError(
          "Network request failed",
          "NETWORK_ERROR",
          0
        );
      
      case "404":
        throw createAsyncError(
          "Resource not found",
          "NOT_FOUND",
          404
        );
      
      case "500":
        throw createAsyncError(
          "Internal server error",
          "SERVER_ERROR",
          500
        );
      
      case "promise":
        Promise.reject(new Error("Unhandled promise rejection"));
        break;
      
      case "reference":
        // @ts-ignore - Intentional error
        nonExistentFunction();
        break;
      
      case "type":
        // @ts-ignore - Intentional error
        const num: number = "not a number";
        break;
    }
  };

  if (asyncError) {
    throw new Error("Async error triggered");
  }

  return (
      <div className="fixed bottom-4 left-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-background/80 backdrop-blur"
              title="Development Error Triggers"
            >
              <Bug className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Trigger Test Errors</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => triggerError("sync")}>
              Sync Error
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => triggerError("async")}>
              Async Error
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => triggerError("network")}>
              Network Error
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => triggerError("404")}>
              404 Error
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => triggerError("500")}>
              500 Error
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => triggerError("promise")}>
              Unhandled Promise
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => triggerError("reference")}>
              Reference Error
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => triggerError("type")}>
              Type Error
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
}