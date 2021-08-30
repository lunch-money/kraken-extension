import * as crypto from 'crypto';
import { BinaryToTextEncoding } from 'crypto';
import qs from 'qs';
import { StatusResponse, LunchMoneyKrakenConnectionConfig, KrakenResponse } from '../types/kraken.js';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export default class KrakenAPI {
  readonly client: AxiosInstance;
  readonly connection: LunchMoneyKrakenConnectionConfig;

  config = {
    url: 'https://api.kraken.com/',
    version: 0,
  };

  routes = {
    PUBLIC_SYSTEM_STATUS: 'public/SystemStatus',
    PRIVATE_BALANCE: 'private/Balance',
  };

  constructor(connection: LunchMoneyKrakenConnectionConfig) {
    this.client = axios.create({
      baseURL: this.config.url + this.config.version,
      headers: {
        'User-Agent': 'LunchMoney Kraken Client',
        'API-Key': connection.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      // always resolve as errors are custom handled
      validateStatus: () => {
        return true;
      },
    });

    this.connection = connection;
  }

  // Query Funds permission
  async getAccountBalances(): Promise<AxiosResponse<KrakenResponse<Map<string, string>>>> {
    const nonce = KrakenAPI.genNonce();
    let payload: Record<string, string | number> = { nonce: nonce };

    if (this.connection.otp) {
      payload = { ...payload, otp: this.connection.otp };
    }

    return this.client.post<KrakenResponse<Map<string, string>>>(
      this.routes.PRIVATE_BALANCE,
      KrakenAPI.formUrlEncoded(payload),
      this.options(this.routes.PRIVATE_BALANCE, payload, this.connection.apiSecret, nonce),
    );
  }

  async getSystemStatus(): Promise<AxiosResponse<KrakenResponse<StatusResponse>>> {
    return this.client.get<KrakenResponse<StatusResponse>>(this.routes.PUBLIC_SYSTEM_STATUS, {
      responseType: 'json',
    });
  }

  options(path: string, payload: Record<string, unknown>, secret: string, nonce: number): AxiosRequestConfig {
    return {
      headers: {
        'API-Sign': KrakenAPI.getMessageSignature('/' + this.config.version + '/' + path, payload, secret, nonce),
      },
      responseType: 'json',
    };
  }

  static getMessageSignature(path: string, request: Record<string, unknown>, key: string, nonce: number): string {
    const message = qs.stringify(request);
    const secret_buffer = new Buffer(key, 'base64');
    const hash = crypto.createHash('sha256');
    const hmac = crypto.createHmac('sha512', secret_buffer);
    const hash_digest = hash.update(nonce + message).digest(<BinaryToTextEncoding>'binary');

    return hmac.update(path + hash_digest, 'binary').digest('base64');
  }

  static genNonce(): number {
    return Date.now() * 1000;
  }

  static formUrlEncoded(payload: Record<string, string | number>): string {
    return Object.keys(payload).reduce(function (p, c) {
      let prefix = '&';

      if (!p) {
        prefix = '';
      }

      return p + prefix + `${c}=${encodeURIComponent(payload[c])}`;
    }, '');
  }
}
