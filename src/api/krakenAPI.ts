import * as crypto from 'crypto';
import { BinaryToTextEncoding } from 'crypto';
import qs from 'qs';
import got, { Got, Response } from 'got';
import { StatusResponse, LunchMoneyKrakenConnectionConfig, KrakenResponse } from '../types/kraken.js';
import { OptionsOfJSONResponseBody } from 'got/dist/source/types';

export default class KrakenAPI {
  readonly client: Got;
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
    this.client = got.extend({
      prefixUrl: this.config.url + this.config.version,
      headers: {
        // If the Content-Type header is not present, it will be set to application/x-www-form-urlencoded.
        'User-Agent': 'LunchMoney Kraken Client',
        'API-Key': connection.apiKey,
      },
    });

    this.connection = connection;
  }

  // Query Funds permission
  async getAccountBalances(): Promise<Response<KrakenResponse<Map<string, string>>>> {
    const nonce = KrakenAPI.genNonce();

    return this.client.post<KrakenResponse<Map<string, string>>>(
      this.routes.PRIVATE_BALANCE,
      this.options(this.routes.PRIVATE_BALANCE, { nonce: nonce }, this.connection.apiSecret, nonce),
    );
  }

  async getSystemStatus(): Promise<Response<KrakenResponse<StatusResponse>>> {
    return this.client.get<KrakenResponse<StatusResponse>>(this.routes.PUBLIC_SYSTEM_STATUS, {
      responseType: 'json',
    });
  }

  options(path: string, payload: Record<string, unknown>, secret: string, nonce: number): OptionsOfJSONResponseBody {
    return {
      headers: {
        'API-Sign': KrakenAPI.getMessageSignature('/' + this.config.version + '/' + path, payload, secret, nonce),
      },
      responseType: 'json',
      form: payload,
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
}
