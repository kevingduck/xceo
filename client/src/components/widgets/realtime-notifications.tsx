import React, { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { ConnectionStatusCompact } from '@/components/ui/connection-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, X, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

const notificationIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const notificationStyles = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  error: 'bg-red-50 border-red-200 text-red-800',
};

export function RealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMessage = useCallback((data: any) => {
    // Handle different types of real-time messages
    if (data.type === 'notification') {
      const notification: Notification = {
        id: data.id || Math.random().toString(36).substr(2, 9),
        type: data.notificationType || 'info',
        title: data.title || 'New Notification',
        message: data.message || '',
        timestamp: data.timestamp || Date.now(),
        read: false,
      };
      
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
    }
  }, []);

  const handleConnect = useCallback(() => {
    // Send any pending notification requests or sync
    console.log('Notification service connected');
  }, []);

  const {
    connectionState,
    isConnected,
    sendMessage,
    connect,
    queuedMessagesCount,
    pendingMessagesCount,
  } = useWebSocket({
    maxReconnectAttempts: 10, // More attempts for notifications
    reconnectInterval: 2000,
    heartbeatInterval: 60000, // Longer interval for notifications
    onMessage: handleMessage,
    onConnect: handleConnect,
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Request notification updates when connected
  useEffect(() => {
    if (isConnected) {
      sendMessage(JSON.stringify({
        type: 'subscribe',
        channel: 'notifications',
        timestamp: Date.now(),
      }));
    }
  }, [isConnected, sendMessage]);

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Connection Status */}
      <div className="absolute -bottom-1 -right-1">
        <ConnectionStatusCompact
          connectionState={connectionState}
          queuedMessagesCount={queuedMessagesCount}
          pendingMessagesCount={pendingMessagesCount}
          onReconnect={connect}
          className="w-4 h-4"
        />
      </div>

      {/* Notifications Panel */}
      {isExpanded && (
        <Card className="absolute top-12 right-0 w-80 z-50 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary">{unreadCount} new</Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {notifications.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  Mark all read
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                >
                  Clear all
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                  <p className="text-xs">You'll see real-time updates here</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => {
                    const Icon = notificationIcons[notification.type];
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          'p-4 hover:bg-muted/50 transition-colors cursor-pointer relative',
                          !notification.read && 'bg-muted/30'
                        )}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'p-1 rounded-full',
                            notificationStyles[notification.type]
                          )}>
                            <Icon className="h-3 w-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-medium truncate">
                                {notification.title}
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeNotification(notification.id);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatTime(notification.timestamp)}
                              </span>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Demo function to simulate notifications (for testing)
export function useNotificationSimulator() {
  const { sendMessage, isConnected } = useWebSocket();

  const simulateNotification = useCallback((type: Notification['type'] = 'info') => {
    if (!isConnected) return false;

    const notifications = {
      info: {
        title: 'System Update',
        message: 'A new feature has been added to your dashboard.',
      },
      success: {
        title: 'Task Completed',
        message: 'Your export has been successfully generated.',
      },
      warning: {
        title: 'Storage Warning',
        message: 'You are approaching your storage limit.',
      },
      error: {
        title: 'Connection Failed',
        message: 'Unable to sync with external service.',
      },
    };

    const notification = notifications[type];
    sendMessage(JSON.stringify({
      type: 'notification',
      notificationType: type,
      id: Math.random().toString(36).substr(2, 9),
      title: notification.title,
      message: notification.message,
      timestamp: Date.now(),
    }));

    return true;
  }, [sendMessage, isConnected]);

  return { simulateNotification, isConnected };
}