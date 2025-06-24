import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Download, Trash2, RefreshCw } from "lucide-react";
import { errorLogger } from "@/lib/error-logger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ErrorLogViewer() {
  const [logs, setLogs] = useState(errorLogger.getLogs());
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const refreshLogs = () => {
    setLogs(errorLogger.getLogs());
  };

  const clearLogs = () => {
    errorLogger.clearLogs();
    refreshLogs();
  };

  const downloadLogs = () => {
    errorLogger.downloadLogs();
  };

  useEffect(() => {
    // Auto-refresh logs every 5 seconds
    const interval = setInterval(refreshLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const errorLogs = logs.filter(log => log.level === "error");
  const warningLogs = logs.filter(log => log.level === "warning");

  const LogItem = ({ log }: { log: any }) => (
    <div
      className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => setSelectedLog(log)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge
              variant={log.level === "error" ? "destructive" : "secondary"}
              className="text-xs"
            >
              {log.level}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(log.timestamp).toLocaleString()}
            </span>
          </div>
          <p className="text-sm font-medium mt-1 line-clamp-2">{log.message}</p>
          {log.metadata?.type && (
            <p className="text-xs text-muted-foreground mt-1">
              Type: {log.metadata.type}
            </p>
          )}
        </div>
        <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Error Logs</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={refreshLogs}
                size="sm"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                onClick={downloadLogs}
                size="sm"
                variant="outline"
                disabled={logs.length === 0}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                onClick={clearLogs}
                size="sm"
                variant="outline"
                disabled={logs.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All ({logs.length})</TabsTrigger>
              <TabsTrigger value="errors">Errors ({errorLogs.length})</TabsTrigger>
              <TabsTrigger value="warnings">Warnings ({warningLogs.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {logs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No logs to display
                    </p>
                  ) : (
                    logs.map((log, index) => (
                      <LogItem key={index} log={log} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="errors">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {errorLogs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No error logs to display
                    </p>
                  ) : (
                    errorLogs.map((log, index) => (
                      <LogItem key={index} log={log} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="warnings">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {warningLogs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No warning logs to display
                    </p>
                  ) : (
                    warningLogs.map((log, index) => (
                      <LogItem key={index} log={log} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
            <DialogDescription>
              {selectedLog && new Date(selectedLog.timestamp).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-1">Message</h4>
                  <p className="text-sm text-muted-foreground">{selectedLog.message}</p>
                </div>
                
                {selectedLog.stack && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Stack Trace</h4>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                      {selectedLog.stack}
                    </pre>
                  </div>
                )}
                
                {selectedLog.componentStack && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Component Stack</h4>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                      {selectedLog.componentStack}
                    </pre>
                  </div>
                )}
                
                {selectedLog.metadata && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Metadata</h4>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-1">URL</h4>
                    <p className="text-muted-foreground text-xs">{selectedLog.url}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">User Agent</h4>
                    <p className="text-muted-foreground text-xs">{selectedLog.userAgent}</p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}