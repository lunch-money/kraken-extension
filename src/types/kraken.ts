export interface UnsafeKrakenResponse<T> {
  error: string[] | null;
  result: T | null;
}

export interface SafeKrakenResponse<T> {
  error: string[];
  result: T;
}

export interface KrakenResponse<T, C> {
  response: T;
  warnings: C | null;
}

export interface KrakenValidation<T, C> {
  validated: T;
  warnings: C | null;
}

export type KrakenWarnings = string[];

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
