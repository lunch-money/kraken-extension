import nock from 'nock';
import { LunchMoneyKrakenConnectionConfig } from '../src/types/kraken.js';
import { LunchMoneyKrakenConnection } from '../src/main.js';
import { assert, expect } from 'chai';
import { it } from 'mocha';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

describe('LunchMoneyKrakenConnection', () => {
  const config: LunchMoneyKrakenConnectionConfig = { apiKey: '', apiSecret: '', otp: '' };
  const scope = nock('https://api.kraken.com');

  describe('initiate', () => {
    it('Kraken responses with systems online', async () => {
      scope.get('/0/public/SystemStatus').reply(200, {
        error: [],
        result: {
          status: 'online',
          timestamp: '2021-03-22T17:18:03Z',
        },
      });

      scope.post('/0/private/Balance').reply(200, {
        error: [],
        result: {
          ZEUR: '0.0001',
          XXBT: '0.0000028420',
          XETH: '0.0000097500',
          DAI: '0.0000042000',
          ETH2: '0.0000143990',
        },
      });

      expect(async () => {
        await LunchMoneyKrakenConnection.initiate(config);
      }).to.not.throw(Error);
    });
    it('Kraken responses with systems status other', async () => {
      scope.get('/0/public/SystemStatus').reply(200, {
        error: [],
        result: {
          status: 'maintenance',
          timestamp: '2021-03-22T17:18:03Z',
        },
      });

      await expect(LunchMoneyKrakenConnection.initiate(config)).to.be.rejectedWith(
        'Kraken API is not available while being in mode maintenance.',
      );
    });
  });
  describe('getBalances', () => {
    it('Kraken responses with status code 200', async () => {
      nock('https://api.kraken.com')
        .post('/0/private/Balance')
        .reply(200, {
          error: [],
          result: {
            ZEUR: '0.0001',
            XXBT: '0.0000028420',
            XETH: '0.0000097500',
            DAI: '0.0000042000',
            ETH2: '0.0000143990',
          },
        });

      const response = await LunchMoneyKrakenConnection.getBalances(config);
      assert.strictEqual(response.providerName, 'kraken');
      assert.strictEqual(response.balances.length, 5);
    });
  });
});
