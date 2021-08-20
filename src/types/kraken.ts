import { LunchMoneyCryptoConnectionConfig, LunchMoneyCryptoConnectionContext } from './lunchMoney.js';
import KrakenAPI from '../api/krakenAPI.js';

export interface LunchMoneyKrakenConnectionConfig extends LunchMoneyCryptoConnectionConfig {
  apiSecret: string;
  otp?: string | null;
}

export interface LunchMoneyKrakenConnectionContext extends LunchMoneyCryptoConnectionContext {
  kraken: KrakenAPI;
}

export interface KrakenResponse<T> {
  error: string[] | null | undefined;
  result: T | null | undefined;
}

export interface KrakenValidation<T, C> {
  result: T;
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
