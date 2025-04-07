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

// According to https://support.kraken.com/hc/en-us/articles/360001206766-Bitcoin-currency-code-XBT-vs-BTC
// Kraken API returns some legacy symbols which should be remapped
const KRAKEN_SYMBOL_MAP: { [key: string]: string } = {
  XETC: 'ETC',
  XETH: 'ETH',
  XLTC: 'LTC',
  XMLN: 'MLN',
  XREP: 'REP',
  XXBT: 'BTC',
  XXDG: 'DOGE',
  XXLM: 'XLM',
  XXMR: 'XMR',
  XXRP: 'XRP',
  XZEC: 'ZEC',
  ZAUD: 'AUD',
  ZCAD: 'CAD',
  ZEUR: 'EUR',
  ZGBP: 'GBP',
  ZJPY: 'JPY',
  ZUSD: 'USD',
  XBT: 'BTC',
  XDG: 'DOGE',
};

function transformSymbol(symbol: string): { symbol: string; type: string } {
  // Define the mapping of symbols

  // Check if the symbol exists in the map
  if (KRAKEN_SYMBOL_MAP[symbol]) {
    // Determine the type based on the original symbol's prefix
    const type = symbol.startsWith('Z') ? 'cash' : 'crypto';
    return { symbol: KRAKEN_SYMBOL_MAP[symbol], type };
  }

  // Return original symbol if not a a transform
  return { symbol, type: 'crypto' };
}

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

      // Maps some special kraken symbols to common ones.
      const { symbol, type } = transformSymbol(key);
      // Create or update Lunch Money Connector balance object
      let balance = updateBalance(balances[symbol], value);
      if (!balance) {
        balance = <CryptoBalance>{
          type: type,
          raw: key,
          asset: symbol,
          amount: value,
        };
      } else if (balance.type != type) {
        // Cash types generally start with a Z but the Kraken API returns different symbols
        // for staking and bonus programs like EUR.M or EUR.HOLD.  If any of the symbols
        // maps to cash treat it as cash
        if (type === 'cash') {
          balance.type = type;
        }
      }

      balances[symbol] = balance;
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
 * If passed, increases crypto balance by given value
 */
export function updateBalance(balance: CryptoBalance | null, value: string): CryptoBalance | null {
  if (balance == null) {
    return null;
  }
  // parseFloat can give too much precision.  Get the length of the original values
  const precision = Math.max(balance.amount.split('.')[1].length, value.split('.')[1].length);

  // Round the new balance to the determined precision
  balance.amount = (Number.parseFloat(balance.amount) + Number.parseFloat(value)).toFixed(precision).toString();

  return balance;
}
