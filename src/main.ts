import KrakenAPI from './api/krakenAPI.js';
import { CryptoBalance, LunchMoneyCryptoConnectionBalances, LunchMoneyCryptoConnection } from './types/lunchMoney.js';
import {
  KrakenResponse,
  KrakenSystemStatus,
  KrakenValidation,
  KrakenWarnings,
  LunchMoneyKrakenConnectionConfig,
  LunchMoneyKrakenConnectionContext,
  StatusResponse,
} from './types/kraken.js';
import { Response } from 'got';

export { LunchMoneyCryptoConnection } from './types/lunchMoney.js';

export const LunchMoneyKrakenConnection: LunchMoneyCryptoConnection<
  LunchMoneyKrakenConnectionConfig,
  LunchMoneyKrakenConnectionContext
> = {
  async initiate(config, context): Promise<LunchMoneyCryptoConnectionBalances> {
    const kraken = context ? context.kraken : new KrakenAPI(config);
    const response = await kraken.getSystemStatus();
    const validation = validateResponse(response) as KrakenValidation<StatusResponse, KrakenWarnings>;

    if (validation.result.status !== KrakenSystemStatus.ONLINE) {
      throw new Error(`Kraken API is not available while being in mode ${validation.result.status}.`);
    }

    return await LunchMoneyKrakenConnection.getBalances(config);
  },
  async getBalances(config, context): Promise<LunchMoneyCryptoConnectionBalances> {
    const kraken = context ? context.kraken : new KrakenAPI(config);
    const response = await kraken.getAccountBalances();
    const validation = validateResponse(response) as KrakenValidation<Map<string, string>, KrakenWarnings>;

    const balances: CryptoBalance[] = [];

    for (const [key, value] of Object.entries(validation.result)) {
      let type = 'crypto';

      if (key.startsWith('Z')) {
        type = 'cash';
      }

      let cleaned: string | null = null;
      if (key.startsWith('Z') || key.startsWith('X')) {
        cleaned = key.substr(1);
      }

      if (balances.filter((balance) => balance.raw === key).length !== 0) {
        throw new Error(`Error received duplicated asset ${key}.`);
      }

      balances.push(<CryptoBalance>{
        type: type,
        raw: key,
        asset: cleaned ?? key,
        amount: value,
      });
    }

    if (validation.warnings !== null) {
      console.warn(`Received following warnings from Kraken: ${validation.warnings.join(', ')}`);
    }

    return {
      providerName: 'kraken',
      balances: balances,
    };
  },
};

export function validateResponse(
  response: Response<KrakenResponse<unknown>>,
): KrakenValidation<unknown, KrakenWarnings> {
  let warnings: KrakenWarnings | null = null;

  if (response.statusCode !== 200 || response.body.result === null) {
    throw new Error(`Received unknown response from Kraken: ${response.statusCode} ${response.body}`);
  }

  if (response.body.error && response.body.error.length !== 0) {
    const error = response.body.error
      .filter((e) => e.startsWith('E'))
      .map((e) => e.substr(1))
      .join(', ');

    if (error.length) {
      throw new Error(`Error receiving response from Kraken: ${error}`);
    }

    warnings = response.body.error.filter((e) => e.startsWith('W')).map((e) => e.substr(1));
  }

  return { result: response.body.result, warnings: warnings };
}
