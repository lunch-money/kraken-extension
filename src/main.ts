import KrakenAPI from './api/krakenAPI.js';
import {
  LunchMoneyCryptoConnection,
  LunchMoneyCryptoConnectionContext,
  LunchMoneyCryptoConnectionConfig,
} from './types/lunchMoney.js';

export { LunchMoneyCryptoConnection } from './types/lunchMoney.js';

export interface LunchMoneyKrakenConnectionConfig extends LunchMoneyCryptoConnectionConfig {
  apiKey: string;
  apiSecret: string;
}

export interface LunchMoneyKrakenConnectionContext extends LunchMoneyCryptoConnectionContext {
  KrakenClientConstructor: KrakenAPI;
}

export const LunchMoneyKrakenConnection: LunchMoneyCryptoConnection<
  LunchMoneyKrakenConnectionConfig,
  LunchMoneyKrakenConnectionContext
> = {
  async initiate(config, context) {
    const kraken = new KrakenAPI(config.apiKey, config.apiSecret);
    await kraken.TestFlight();

    return LunchMoneyKrakenConnection.getBalances(config, context);
  },
  async getBalances(config) {
    const kraken = new KrakenAPI(config.apiKey, config.apiSecret);
    const balances = await kraken.GetAccountBalances();

    return {
      providerName: 'kraken',
      balances: balances.response,
    };
  },
};
