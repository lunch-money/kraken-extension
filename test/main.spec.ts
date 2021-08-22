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
      scope.post('/0/private/Balance').reply(200, {
        error: [],
        result: {
          ZEUR: '504861.8946',
          XXBT: '1011.1908877900',
        },
      });

      const response = await LunchMoneyKrakenConnection.getBalances(config);
      assert.strictEqual(response.providerName, 'kraken');
      assert.strictEqual(response.balances.length, 2);

      assert.strictEqual(response.balances[0].asset, 'EUR');
      assert.strictEqual(response.balances[0].raw, 'ZEUR');
      assert.strictEqual(response.balances[0].type, 'cash');
      assert.strictEqual(response.balances[0].amount, '504861.8946');

      assert.strictEqual(response.balances[1].asset, 'XBT');
      assert.strictEqual(response.balances[1].raw, 'XXBT');
      assert.strictEqual(response.balances[1].type, 'crypto');
      assert.strictEqual(response.balances[1].amount, '1011.1908877900');
    });
    it('Kraken responses with other status codes', async () => {
      scope.post('/0/private/Balance').reply(500, {});

      await expect(LunchMoneyKrakenConnection.getBalances(config)).to.be.rejectedWith(
        'Received unknown response from Kraken:',
      );
    });
    it('Kraken responses with empty body', async () => {
      scope.post('/0/private/Balance').reply(200, {
        error: [],
        result: {},
      });

      const response = await LunchMoneyKrakenConnection.getBalances(config);
      assert.strictEqual(response.providerName, 'kraken');
      assert.strictEqual(response.balances.length, 0);
    });
    it('Kraken responses with any error', async () => {
      scope.post('/0/private/Balance').reply(200, {
        error: ['EGeneral:Permission denied'],
        result: {},
      });

      await expect(LunchMoneyKrakenConnection.getBalances(config)).to.be.rejectedWith(
        'Error receiving response from Kraken: General:Permission denied',
      );
    });
  });
});
