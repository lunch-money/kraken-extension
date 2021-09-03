import KrakenAPI from './api/krakenAPI';
import { CryptoBalance, LunchMoneyCryptoConnectionBalances, LunchMoneyCryptoConnection } from './types/lunchMoney';
import {
  KrakenResponse,
  KrakenSystemStatus,
  KrakenValidation,
  KrakenWarnings,
  LunchMoneyKrakenConnectionConfig,
  LunchMoneyKrakenConnectionContext,
  StatusResponse,
} from './types/kraken';
import { AxiosResponse } from 'axios';

export { LunchMoneyCryptoConnection } from './types/lunchMoney';

export const LunchMoneyKrakenConnection: LunchMoneyCryptoConnection<
  LunchMoneyKrakenConnectionConfig,
  LunchMoneyKrakenConnectionContext
> = {
  /**
   * Checks kraken's system status to be ONLINE and runs getBalances. Unfortunately, kraken does not provide us
   * with an endpoint to fetch api-key permissions. While this might be possible in future, functions will throw
   * "EGeneral:Permission denied" in the meantime.
   */
  async initiate(config, context): Promise<LunchMoneyCryptoConnectionBalances> {
    const kraken = context ? context.kraken : new KrakenAPI(config);
    const response = await kraken.getSystemStatus();
    const validation = validateResponse(response) as KrakenValidation<StatusResponse, KrakenWarnings>;

    if (validation.result.status !== KrakenSystemStatus.ONLINE) {
      throw new Error(`Kraken API is not available while being in mode ${validation.result.status}.`);
    }

    return await LunchMoneyKrakenConnection.getBalances(config);
  },
  /**
   * Utils getAccountBalance endpoint to receive crypto accounts.
   * Assets are prefixed with (Z) for cash and (X) for crypto which makes it possible to return along with parsed asset
   * type (cash/crypto) and raw title (X/Z<Asset>) for each account.
   *
   * Some asset titles do not comply with common used terms (XBT = BTC, ETH2.S = sub account type staking). For that
   * we have implemented a mapping function.
   *
   * @see https://docs.kraken.com/rest/#operation/getAccountBalance
   */
  async getBalances(config, context): Promise<LunchMoneyCryptoConnectionBalances> {
    const kraken = context ? context.kraken : new KrakenAPI(config);
    const response = await kraken.getAccountBalances();
    const validation = validateResponse(response) as KrakenValidation<Map<string, string>, KrakenWarnings>;

    const balances: Record<string, CryptoBalance> = {};

    Object.entries(validation.result).forEach(function ([key, value]) {
      if (key.includes('.')) {
        const parts = key.split('.');
        key = parts[0];
      }

      let type = 'crypto';

      if (key.startsWith('Z')) {
        type = 'cash';
      }

      let cleaned: string | null = null;
      if (key.startsWith('Z') || key.startsWith('X')) {
        cleaned = key.substr(1);
      }

      let balance = updateBalance(balances[cleaned ?? key], value);
      if (!balance) {
        balance = <CryptoBalance>{
          type: type,
          raw: key,
          asset: krakenToCommon(cleaned ?? key),
          amount: value,
        };
      }

      balances[cleaned ?? key] = balance;
    });

    if (validation.warnings !== null) {
      console.warn(`Received following warnings from Kraken: ${validation.warnings.join(', ')}`);
    }

    return {
      providerName: 'kraken',
      balances: Object.values(balances),
    };
  },
};

/**
 * Checks against faulty formats, non-200 status and parses errors / warnings from response if available.
 * Kraken prefixes errors (E) and warnings (W), some common errors are:
 *
 * - EAPI:Invalid signature (OTP required)
 * - EGeneral:Permission denied (Wrong or none permission granted)
 */
export function validateResponse(
  response: AxiosResponse<KrakenResponse<unknown>>,
): KrakenValidation<unknown, KrakenWarnings> {
  let warnings: KrakenWarnings | null = null;

  if (response.status !== 200 || response.data.result === null) {
    throw new Error(`Received unknown response from Kraken: ${response.status} ${JSON.stringify(response.data)}`);
  }

  if (response.data.error && response.data.error.length !== 0) {
    const error = response.data.error
      .filter((e) => e.startsWith('E'))
      .map((e) => e.substr(1))
      .join(', ');

    if (error.length) {
      throw new Error(`Error receiving response from Kraken: ${error}`);
    }

    warnings = response.data.error.filter((e) => e.startsWith('W')).map((e) => e.substr(1));
  }

  return { result: response.data.result, warnings: warnings };
}

/**
 * Maps some special kraken symbols to common ones.
 */
export function krakenToCommon(ticker: string): string {
  const mapping: Record<string, string> = {
    XBT: 'BTC',
  };

  return mapping[ticker] ?? ticker;
}

/**
 * If passed, increases crypto balance by given value
 */
export function updateBalance(balance: CryptoBalance | null, value: string): CryptoBalance | null {
  if (balance == null) {
    return null;
  }

  balance.amount = (Number.parseFloat(balance.amount) + Number.parseFloat(value)).toString();
  return balance;
}
