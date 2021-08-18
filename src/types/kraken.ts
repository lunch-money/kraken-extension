export interface KrakenResponse<T> {
  error: string[];
  result: T;
}

export interface StatusResponse {
  status: KrakenSystemStatus;
  timestamp: string;
}

export enum KrakenSystemStatus {
  ONLINE = 'online',
  MAINTENANCE = 'maintenance',
  CANCEL_ONLY = 'cancel_only',
  POST_ONLY = 'post_only',
}
