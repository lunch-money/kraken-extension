/**
 * Serializable configuration for the connection
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type LunchMoneyCryptoConnectionConfig = {
  cryptoAccountId: string | null;
  apiKey: string;
};

export type LunchMoneyCryptoConnectionContext = {
  [key: string]: any;
};

export interface CryptoBalance {
  type: 'crypto' | 'cash';
  raw: string;
  asset: string;
  amount: string;
}

export const providerNames = ['coinbase', 'coinbase_pro', 'kraken', 'binance', 'wallet_ethereum'] as const;
export type ProviderName = typeof providerNames[number];

export interface LunchMoneyCryptoConnectionBalances {
  providerName: ProviderName;
  balances: CryptoBalance[];
}

export type LunchMoneyCryptoConnectionInitialization = LunchMoneyCryptoConnectionBalances;

export interface LunchMoneyCryptoConnection<
  TConfig extends LunchMoneyCryptoConnectionConfig,
  TContext extends LunchMoneyCryptoConnectionContext,
> {
  initiate(config: TConfig, context?: TContext): Promise<LunchMoneyCryptoConnectionInitialization>;
  getBalances(config: TConfig, context?: TContext): Promise<LunchMoneyCryptoConnectionBalances>;
}
