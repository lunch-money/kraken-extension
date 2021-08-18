import * as crypto from 'crypto';
import { BinaryToTextEncoding } from 'crypto';
import qs from 'qs';
import got, { Got } from 'got';
import { KrakenResponse, KrakenSystemStatus, StatusResponse } from '../types/kraken';

export default class KrakenAPI {
  private readonly client: Got;

  private config = {
    url: 'https://api.kraken.com/',
    version: 0,
  };

  private routes = {
    PUBLIC_SYSTEM_STATUS: '/public/SystemStatus',
  };

  constructor(key: string) {
    this.client = got.extend({
      prefixUrl: this.config.url + this.config.version,
      headers: {
        // If the Content-Type header is not present, it will be set to application/x-www-form-urlencoded.
        'user-agent': 'LunchMoney Kraken Client',
        'api-key': key,
      },
    });
  }

  public async Prepare(): Promise<boolean> {
    if ((await this.checkSystemStatus()) !== KrakenSystemStatus.ONLINE) {
    }
    return true;
  }

  private async checkSystemStatus(): Promise<KrakenSystemStatus> {
    const response = await this.client<KrakenResponse<StatusResponse>>(this.routes.PUBLIC_SYSTEM_STATUS);

    if (response.statusCode !== 200) {
      throw new Error(``);
    }

    return response.body.result.status;
  }

  private static getMessageSignature(path: string, request: string, key: string, nonce: number): string {
    const message = qs.stringify(request);
    const secret_buffer = new Buffer(key, 'base64');
    const hash = crypto.createHash('sha256');
    const hmac = crypto.createHmac('sha512', secret_buffer);
    const hash_digest = hash.update(nonce + message).digest(<BinaryToTextEncoding>'binary');

    return hmac.update(path + hash_digest, 'binary').digest('base64');
  }
}
