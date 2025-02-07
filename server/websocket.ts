import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
    host: '0.0.0.0'
  });

  wss.on("connection", (ws) => {
    ws.on("message", (message) => {
      // Broadcast messages to all connected clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message.toString());
        }
      });
    });
  });

  return wss;
}