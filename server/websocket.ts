import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  lastPing?: number;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
    host: '0.0.0.0',
    // Add this to handle the WebSocket upgrade specifically for our path
    verifyClient: (info) => {
      // Skip Vite HMR WebSocket connections
      const isViteHMR = info.req.headers['sec-websocket-protocol'] === 'vite-hmr';
      return !isViteHMR;
    }
  });

  // Heartbeat mechanism to detect broken connections
  const heartbeat = function(this: ExtendedWebSocket) {
    this.isAlive = true;
    this.lastPing = Date.now();
  };

  // Ping all clients every 30 seconds
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws: ExtendedWebSocket) => {
      if (ws.isAlive === false) {
        console.log('Terminating inactive WebSocket connection');
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("connection", (ws: ExtendedWebSocket) => {
    console.log('WebSocket client connected');
    
    // Initialize heartbeat
    ws.isAlive = true;
    ws.lastPing = Date.now();
    ws.on('pong', heartbeat);

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle ping messages from client
        if (data.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now(),
            clientTimestamp: data.timestamp
          }));
          return;
        }
        
        // Handle message acknowledgment requests
        if (data.messageId) {
          ws.send(JSON.stringify({
            type: 'ack',
            messageId: data.messageId
          }));
        }
        
        // Broadcast messages to all connected clients
        wss.clients.forEach((client: ExtendedWebSocket) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(message.toString());
          }
        });
      } catch (error) {
        // Handle non-JSON messages (backward compatibility)
        console.log('Received non-JSON message:', message.toString());
        
        // Broadcast messages to all connected clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(message.toString());
          }
        });
      }
    });

    ws.on("close", (code, reason) => {
      console.log(`WebSocket client disconnected: ${code} ${reason}`);
    });

    ws.on("error", (error) => {
      console.error('WebSocket error:', error);
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: Date.now(),
      clientId: Math.random().toString(36).substr(2, 9)
    }));
  });

  // Cleanup on server close
  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  return wss;
}