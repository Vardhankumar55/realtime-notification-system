import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

/**
 * WebSocket / STOMP service.
 *
 * Usage:
 *   wsService.connect(userEmail, (notification) => { ... });
 *   wsService.disconnect();
 *
 * The server pushes to: /user/{email}/queue/notifications
 * This client subscribes to that topic automatically.
 */

const WS_URL = process.env.REACT_APP_WS_URL || "http://localhost:8080/ws";

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  connect(userEmail, isAdmin, onNotification, onReply, onDirectMessage, onConnect, onError) {
    if (this.connected) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,

      onConnect: () => {
        this.connected = true;
        console.log("✅ WebSocket connected");

        // Subscribe to user-specific notification topic
        this.client.subscribe(
          `/topic/notifications/${userEmail.toLowerCase()}`,
          (message) => {
            try {
              const notification = JSON.parse(message.body);
              onNotification(notification);
            } catch (e) {
              console.error("Failed to parse WS message", e);
            }
          }
        );

        // Subscribe to broadcast notifications
        this.client.subscribe("/topic/notifications/all", (message) => {
          try {
            const notification = JSON.parse(message.body);
            onNotification(notification);
          } catch (e) {
            console.error("Failed to parse WS broadcast", e);
          }
        });

        // Admin-only subscription for user replies
        if (isAdmin) {
          this.client.subscribe("/topic/admin/replies", (message) => {
            try {
              const reply = JSON.parse(message.body);
              if (onReply) onReply(reply);
            } catch (e) {
              console.error("Failed to parse WS reply", e);
            }
          });
        }

        this.client.subscribe(`/topic/messages/${userEmail.toLowerCase()}`, (message) => {
          try {
            const directMessage = JSON.parse(message.body);
            if (onDirectMessage) onDirectMessage(directMessage);
          } catch (e) {
            console.error("Failed to parse WS direct message", e);
          }
        });

        if (onConnect) onConnect();
      },

      onStompError: (frame) => {
        console.error("STOMP error:", frame);
        this.connected = false;
        if (onError) onError(frame);
      },

      onDisconnect: () => {
        this.connected = false;
        console.log("WebSocket disconnected");
      },
    });

    this.client.activate();
  }

  disconnect() {
    if (this.client && this.connected) {
      this.client.deactivate();
      this.connected = false;
    }
  }

  isConnected() {
    return this.connected;
  }
}

// Singleton instance shared across the app
const wsService = new WebSocketService();
export default wsService;
