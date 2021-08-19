import * as crypto from 'crypto';
import { BinaryToTextEncoding } from 'crypto';
import qs from 'qs';
import got, { Got, Response } from 'got';
import {
  KrakenResponse,
  KrakenSystemStatus,
  KrakenValidation,
  KrakenWarnings,
  SafeKrakenResponse,
  StatusResponse,
  UnsafeKrakenResponse,
} from '../types/kraken.js';
import { OptionsOfJSONResponseBody } from 'got/dist/source/types';
import { CryptoBalance } from '../types/lunchMoney.js';

export default class KrakenAPI {
  private readonly client: Got;
  private readonly key: string;
  private readonly secret: string;

  private cachedTestFlight: KrakenResponse<CryptoBalance[], KrakenWarnings> | null = null;

  private config = {
    url: 'https://api.kraken.com/',
    version: 0,
  };

  private routes = {
    PUBLIC_SYSTEM_STATUS: 'public/SystemStatus',
    PRIVATE_BALANCE: 'private/Balance',
  };

  constructor(key: string, secret: string) {
    this.client = got.extend({
      prefixUrl: this.config.url + this.config.version,
      headers: {
        // If the Content-Type header is not present, it will be set to application/x-www-form-urlencoded.
        'User-Agent': 'LunchMoney Kraken Client',
        'API-Key': key,
      },
    });

    this.key = key;
    this.secret = secret;
  }

  public async TestFlight(cache = false): Promise<boolean> {
    const { response } = await this.getSystemStatus();

    if (response !== KrakenSystemStatus.ONLINE) {
      throw new Error(`Kraken API is not available while being in mode ${response}.`);
    }

    // no way to check permissions directly so we are trying to fetch balances
    // and optional cache results one time
    try {
      const balances = await this.GetAccountBalances();

      if (cache) {
        this.cachedTestFlight = balances;
      }
    } catch (e) {
      throw new Error(`Kraken test flight failed: ${e}`);
    }

    return true;
  }

  // Query Funds permission
  public async GetAccountBalances(): Promise<KrakenResponse<CryptoBalance[], KrakenWarnings>> {
    if (this.cachedTestFlight !== null) {
      const cachedResult = this.cachedTestFlight;
      this.cachedTestFlight = null;

      return cachedResult;
    }

    const nonce = KrakenAPI.genNonce();

    // result format: "DAI": "9999.9999999999"
    const response = await this.client.post<UnsafeKrakenResponse<Map<string, string>>>(
      this.routes.PRIVATE_BALANCE,
      this.options(this.routes.PRIVATE_BALANCE, { nonce: nonce }, this.secret, nonce),
    );

    const {
      validated,
      warnings,
    }: KrakenValidation<SafeKrakenResponse<Map<string, string>>, KrakenWarnings> = KrakenAPI.validateResponse(response);

    const balances: CryptoBalance[] = [];

    for (const [key, value] of Object.entries(validated.result)) {
      balances.push(<CryptoBalance>{ asset: key, amount: value });
    }

    return {
      response: balances,
      warnings: warnings,
    };
  }

  protected async getSystemStatus(): Promise<KrakenResponse<KrakenSystemStatus, KrakenWarnings>> {
    const response = await this.client<UnsafeKrakenResponse<StatusResponse>>(this.routes.PUBLIC_SYSTEM_STATUS, {
      responseType: 'json',
    });

    const {
      validated,
      warnings,
    }: KrakenValidation<SafeKrakenResponse<StatusResponse>, KrakenWarnings> = KrakenAPI.validateResponse(response);

    return {
      response: validated.result.status,
      warnings: warnings,
    };
  }

  protected static validateResponse(
    response: Response<UnsafeKrakenResponse<any>>,
  ): KrakenValidation<SafeKrakenResponse<any>, KrakenWarnings> {
    let warnings: KrakenWarnings | null = null;

    if (response.statusCode !== 200 || response.body.result === null) {
      throw new Error(`Received unknown response from Kraken: ${response.statusCode} ${response.body}`);
    }

    if (response.body.error && response.body.error.length !== 0) {
      warnings = KrakenAPI.handleErrors(response.body.error);
    }

    // validate response format

    return {
      validated: response.body as SafeKrakenResponse<any>,
      warnings: warnings,
    };
  }

  protected static handleErrors(errors: string[]): KrakenWarnings {
    const error = errors
      .filter((e) => e.startsWith('E'))
      .map((e) => e.substr(1))
      .join(', ');

    if (error.length) {
      throw new Error(`Error receiving response from Kraken: ${error}`);
    }

    return errors.filter((e) => e.startsWith('W')).map((e) => e.substr(1));
  }

  protected options(
    path: string,
    payload: Record<string, unknown>,
    secret: string,
    nonce: number,
  ): OptionsOfJSONResponseBody {
    return {
      headers: {
        'API-Sign': KrakenAPI.getMessageSignature('/' + this.config.version + '/' + path, payload, secret, nonce),
      },
      responseType: 'json',
      form: payload,
    };
  }

  protected static getMessageSignature(
    path: string,
    request: Record<string, unknown>,
    key: string,
    nonce: number,
  ): string {
    const message = qs.stringify(request);
    const secret_buffer = new Buffer(key, 'base64');
    const hash = crypto.createHash('sha256');
    const hmac = crypto.createHmac('sha512', secret_buffer);
    const hash_digest = hash.update(nonce + message).digest(<BinaryToTextEncoding>'binary');

    return hmac.update(path + hash_digest, 'binary').digest('base64');
  }

  protected static genNonce(): number {
    return Date.now() * 1000;
  }
}
