import React, { useState, useCallback } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { ConnectionStatus, ConnectionStatusCompact } from '@/components/ui/connection-status';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Trash2, RefreshCw } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  timestamp: number;
  type: 'sent' | 'received' | 'system';
}

export function WebSocketDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  const handleMessage = useCallback((data: any) => {
    const message: Message = {
      id: Math.random().toString(36).substr(2, 9),
      content: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      timestamp: Date.now(),
      type: data.type === 'connected' ? 'system' : 'received',
    };
    
    setMessages(prev => [...prev, message]);
  }, []);

  const handleError = useCallback((error: Event) => {
    console.error('WebSocket error in demo:', error);
    const message: Message = {
      id: Math.random().toString(36).substr(2, 9),
      content: `Error: ${error.type}`,
      timestamp: Date.now(),
      type: 'system',
    };
    setMessages(prev => [...prev, message]);
  }, []);

  const handleConnect = useCallback(() => {
    const message: Message = {
      id: Math.random().toString(36).substr(2, 9),
      content: 'Connected to WebSocket server',
      timestamp: Date.now(),
      type: 'system',
    };
    setMessages(prev => [...prev, message]);
  }, []);

  const handleDisconnect = useCallback(() => {
    const message: Message = {
      id: Math.random().toString(36).substr(2, 9),
      content: 'Disconnected from WebSocket server',
      timestamp: Date.now(),
      type: 'system',
    };
    setMessages(prev => [...prev, message]);
  }, []);

  const {
    connectionState,
    isConnected,
    isConnecting,
    isReconnecting,
    reconnectAttempts,
    sendMessage,
    connect,
    disconnect,
    queuedMessagesCount,
    pendingMessagesCount,
  } = useWebSocket({
    maxReconnectAttempts: 5,
    reconnectInterval: 1000,
    maxReconnectInterval: 30000,
    reconnectDecay: 1.5,
    heartbeatInterval: 30000,
    enableHeartbeat: true,
    onMessage: handleMessage,
    onError: handleError,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
  });

  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim()) return;

    const messageData = {
      content: inputMessage,
      timestamp: Date.now(),
      messageId: Math.random().toString(36).substr(2, 9),
    };

    const success = sendMessage(JSON.stringify(messageData), { 
      id: messageData.messageId 
    });

    const message: Message = {
      id: messageData.messageId,
      content: inputMessage,
      timestamp: Date.now(),
      type: 'sent',
    };

    setMessages(prev => [...prev, message]);
    setInputMessage('');

    if (!success) {
      const queuedMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        content: 'Message queued (not connected)',
        timestamp: Date.now(),
        type: 'system',
      };
      setMessages(prev => [...prev, queuedMessage]);
    }
  }, [inputMessage, sendMessage]);

  const handleClearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getMessageStyle = (type: Message['type']) => {
    switch (type) {
      case 'sent':
        return 'bg-blue-100 text-blue-900 border-blue-200 ml-8';
      case 'received':
        return 'bg-green-100 text-green-900 border-green-200 mr-8';
      case 'system':
        return 'bg-gray-100 text-gray-700 border-gray-200 mx-4';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">WebSocket Demo</h1>
          <p className="text-muted-foreground">
            Test the enhanced WebSocket connection with automatic reconnection
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatusCompact
            connectionState={connectionState}
            reconnectAttempts={reconnectAttempts}
            maxReconnectAttempts={5}
            queuedMessagesCount={queuedMessagesCount}
            pendingMessagesCount={pendingMessagesCount}
            onReconnect={connect}
          />
          <ConnectionStatus
            connectionState={connectionState}
            reconnectAttempts={reconnectAttempts}
            maxReconnectAttempts={5}
            queuedMessagesCount={queuedMessagesCount}
            pendingMessagesCount={pendingMessagesCount}
            onReconnect={connect}
            showDetails={true}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Connection Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Connection Controls
              <Badge variant={isConnected ? 'default' : 'destructive'}>
                {connectionState}
              </Badge>
            </CardTitle>
            <CardDescription>
              Control the WebSocket connection manually
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={connect} 
                disabled={isConnected || isConnecting}
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Connect
              </Button>
              <Button 
                onClick={disconnect} 
                disabled={!isConnected}
                variant="destructive"
                size="sm"
              >
                Disconnect
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant="outline">{connectionState}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Reconnect Attempts:</span>
                <span>{reconnectAttempts}/5</span>
              </div>
              <div className="flex justify-between">
                <span>Queued Messages:</span>
                <span>{queuedMessagesCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending Messages:</span>
                <span>{pendingMessagesCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Sender */}
        <Card>
          <CardHeader>
            <CardTitle>Send Message</CardTitle>
            <CardDescription>
              Send messages through the WebSocket connection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Input
                id="message"
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
              <Button 
                onClick={handleClearMessages}
                variant="outline"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Messages will be queued if not connected and sent when reconnected.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Messages */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Messages
            <Badge variant="outline">{messages.length} total</Badge>
          </CardTitle>
          <CardDescription>
            Real-time message history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Send a message to get started!
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg border ${getMessageStyle(message.type)}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                      >
                        {message.type}
                      </Badge>
                      <span className="text-xs opacity-70">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm font-mono whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}