import { useState, useEffect, useRef, useCallback } from "react";
import type { WebSocketEventV2 } from "../types/events";

export interface UseWebSocketOptionsV2 {
  sessionId?: string;
  onEvent?: (event: WebSocketEventV2) => void;
}

export function useWebSocketV2({ sessionId, onEvent }: UseWebSocketOptionsV2) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const sendEvent = useCallback((event: string, payload: Record<string, any> = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event, payload }));
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const baseUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;
    const wsProtocol = baseUrl.startsWith("https") ? "wss:" : "ws:";
    const host = baseUrl.replace(/^https?:\/\//, "");
    const wsUrl = `${wsProtocol}//${host}/ws/mock-interview-v2/${sessionId}`;
    console.log(`[WS-v2] Connecting to ${wsUrl}...`);

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log(`[WS-v2] Connected for session=${sessionId}`);
        setIsConnected(true);
      };

      ws.onmessage = (messageEvent) => {
        try {
          const data: WebSocketEventV2 = JSON.parse(messageEvent.data);
          onEventRef.current?.(data);
        } catch (e) {
          console.warn("[WS-v2] Parse error:", e);
        }
      };

      ws.onclose = () => {
        console.log(`[WS-v2] Disconnected for session=${sessionId}`);
        setIsConnected(false);
      };

      ws.onerror = (err) => {
        console.warn("[WS-v2] Error:", err);
      };
    } catch (err) {
      console.warn("[WS-v2] Could not instantiate WebSocket:", err);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [sessionId]);

  return {
    isConnected,
    sendEvent,
  };
}
