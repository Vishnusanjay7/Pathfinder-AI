export interface WebSocketEventV2 {
  event: string;
  session_id: string;
  timestamp?: string;
  payload: Record<string, any>;
}
