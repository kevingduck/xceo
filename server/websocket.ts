import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

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

  wss.on("connection", (ws) => {
    console.log('WebSocket client connected');

    ws.on("message", (message) => {
      // Broadcast messages to all connected clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message.toString());
        }
      });
    });

    ws.on("close", () => {
      console.log('WebSocket client disconnected');
    });

    ws.on("error", (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return wss;
}