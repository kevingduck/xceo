import { useEffect, useRef, useState, useCallback } from 'react';

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface WebSocketOptions {
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  maxReconnectInterval?: number;
  reconnectDecay?: number;
  heartbeatInterval?: number;
  enableHeartbeat?: boolean;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface QueuedMessage {
  data: string;
  timestamp: number;
  id: string;
}

export function useWebSocket(options: WebSocketOptions = {}) {
  const {
    maxReconnectAttempts = 5,
    reconnectInterval = 1000,
    maxReconnectInterval = 30000,
    reconnectDecay = 1.5,
    heartbeatInterval = 30000,
    enableHeartbeat = true,
    onMessage,
    onError,
    onConnect,
    onDisconnect
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastPongTime, setLastPongTime] = useState<number>(Date.now());
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<QueuedMessage[]>([]);
  const isManualCloseRef = useRef(false);
  const isPageVisibleRef = useRef(true);
  const pendingMessagesRef = useRef<Set<string>>(new Set());

  const wsUrl = useRef('');

  // Initialize WebSocket URL
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl.current = `${protocol}//${window.location.host}/ws`;
  }, []);

  // Calculate next reconnect delay with exponential backoff
  const getReconnectDelay = useCallback((attemptNumber: number) => {
    const delay = Math.min(
      reconnectInterval * Math.pow(reconnectDecay, attemptNumber),
      maxReconnectInterval
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }, [reconnectInterval, reconnectDecay, maxReconnectInterval]);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Start heartbeat mechanism
  const startHeartbeat = useCallback(() => {
    if (!enableHeartbeat) return;

    clearInterval(heartbeatIntervalRef.current!);
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Check if we received a pong recently
        const timeSinceLastPong = Date.now() - lastPongTime;
        if (timeSinceLastPong > heartbeatInterval * 2) {
          console.warn('WebSocket heartbeat timeout, reconnecting...');
          wsRef.current.close();
          return;
        }

        // Send ping
        try {
          wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch (error) {
          console.error('Failed to send ping:', error);
        }
      }
    }, heartbeatInterval);
  }, [enableHeartbeat, heartbeatInterval, lastPongTime]);

  // Process queued messages
  const processMessageQueue = useCallback(() => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;

    const queue = messageQueueRef.current;
    const currentTime = Date.now();
    
    // Remove messages older than 5 minutes
    messageQueueRef.current = queue.filter(msg => currentTime - msg.timestamp < 5 * 60 * 1000);

    // Send queued messages
    messageQueueRef.current.forEach(msg => {
      try {
        wsRef.current!.send(msg.data);
        pendingMessagesRef.current.delete(msg.id);
      } catch (error) {
        console.error('Failed to send queued message:', error);
      }
    });

    messageQueueRef.current = [];
  }, []);

  // Connect WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    if (!isPageVisibleRef.current && reconnectAttempts > 0) {
      // Don't reconnect when page is hidden
      return;
    }

    setConnectionState('connecting');
    isManualCloseRef.current = false;

    try {
      const ws = new WebSocket(wsUrl.current);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionState('connected');
        setReconnectAttempts(0);
        setLastPongTime(Date.now());
        
        // Process any queued messages
        processMessageQueue();
        
        // Start heartbeat
        startHeartbeat();
        
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle pong messages
          if (data.type === 'pong') {
            setLastPongTime(Date.now());
            return;
          }
          
          // Handle message acknowledgments
          if (data.type === 'ack' && data.messageId) {
            pendingMessagesRef.current.delete(data.messageId);
            return;
          }
          
          onMessage?.(data);
        } catch (error) {
          // Handle non-JSON messages
          onMessage?.(event.data);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        clearTimers();
        
        if (isManualCloseRef.current) {
          setConnectionState('disconnected');
          onDisconnect?.();
          return;
        }

        setConnectionState('disconnected');
        onDisconnect?.();
        
        // Attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = getReconnectDelay(reconnectAttempts);
          console.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          
          setConnectionState('reconnecting');
          setReconnectAttempts(prev => prev + 1);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('Max reconnection attempts reached');
          setConnectionState('disconnected');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionState('disconnected');
    }
  }, [reconnectAttempts, maxReconnectAttempts, getReconnectDelay, processMessageQueue, startHeartbeat, onConnect, onMessage, onDisconnect, onError]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;
    clearTimers();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
    }
    
    setConnectionState('disconnected');
    setReconnectAttempts(0);
  }, [clearTimers]);

  // Send message with queuing support
  const sendMessage = useCallback((message: string, options: { priority?: boolean; id?: string } = {}) => {
    const messageId = options.id || Math.random().toString(36).substr(2, 9);
    const messageData = typeof message === 'string' ? message : JSON.stringify(message);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(messageData);
        if (options.id) {
          pendingMessagesRef.current.add(messageId);
        }
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
    
    // Queue message if not connected and not a priority message
    if (!options.priority) {
      const queuedMessage: QueuedMessage = {
        data: messageData,
        timestamp: Date.now(),
        id: messageId
      };
      
      messageQueueRef.current.push(queuedMessage);
      
      // Limit queue size
      if (messageQueueRef.current.length > 100) {
        messageQueueRef.current = messageQueueRef.current.slice(-50);
      }
    }
    
    return false;
  }, []);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden;
      
      if (document.hidden) {
        // Page is hidden, pause reconnection attempts
        console.log('Page hidden, pausing WebSocket reconnection');
        clearTimers();
      } else {
        // Page is visible, resume connection if needed
        console.log('Page visible, resuming WebSocket connection');
        if (connectionState === 'disconnected' || connectionState === 'reconnecting') {
          // Reset reconnect attempts when page becomes visible
          setReconnectAttempts(0);
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [connectionState, connect, clearTimers]);

  // Initialize connection
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []);

  // Auto-reconnect when online
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network back online, attempting to reconnect...');
      if (connectionState === 'disconnected') {
        setReconnectAttempts(0);
        connect();
      }
    };

    const handleOffline = () => {
      console.log('Network offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionState, connect]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    isReconnecting: connectionState === 'reconnecting',
    reconnectAttempts,
    sendMessage,
    connect,
    disconnect,
    queuedMessagesCount: messageQueueRef.current.length,
    pendingMessagesCount: pendingMessagesRef.current.size
  };
}
