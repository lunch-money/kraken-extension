import nock from 'nock';
import { LunchMoneyKrakenConnectionConfig } from '../src/types/kraken';
import { LunchMoneyKrakenConnection } from '../src/main';
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
          'EUR.HOLD': '500.4838',
          'EUR.M': '342.6940',
          'ETH2.S': '0.1908877900',
          ETH2: '0.1908877900',
        },
      });

      const response = await LunchMoneyKrakenConnection.getBalances(config);

      assert.strictEqual(response.providerName, 'kraken');
      assert.strictEqual(response.balances.length, 3);

      assert.strictEqual(response.balances[0].asset, 'EUR');
      assert.strictEqual(response.balances[0].raw, 'ZEUR');
      assert.strictEqual(response.balances[0].type, 'cash');
      assert.strictEqual(response.balances[0].amount, '505705.0724');

      assert.strictEqual(response.balances[1].asset, 'BTC');
      assert.strictEqual(response.balances[1].raw, 'XXBT');
      assert.strictEqual(response.balances[1].type, 'crypto');
      assert.strictEqual(response.balances[1].amount, '1011.1908877900');

      assert.strictEqual(response.balances[2].asset, 'ETH2');
      assert.strictEqual(response.balances[2].raw, 'ETH2');
      assert.strictEqual(response.balances[2].type, 'crypto');
      assert.strictEqual(response.balances[2].amount, '0.3817755800');
    });

    it('Kraken responses with multiple bitcoin balances', async () => {
      scope.post('/0/private/Balance').reply(200, {
        error: [],
        result: {
          CRO: '0.0000',
          'EUR.F': '200.0177',
          USDC: '0.00000000',
          'USDC.F': '0.00197533',
          USDT: '0.00000000',
          'XBT.F': '0.0000000004',
          'XBT.M': '0.0737591219',
          XXBT: '0.0000000000',
          XXRP: '2485.99000000',
          ZEUR: '0.0000',
        },
      });

      const response = await LunchMoneyKrakenConnection.getBalances(config);

      assert.strictEqual(response.providerName, 'kraken');
      assert.strictEqual(response.balances.length, 6);

      assert.strictEqual(response.balances[0].asset, 'CRO');
      assert.strictEqual(response.balances[0].raw, 'CRO');
      assert.strictEqual(response.balances[0].type, 'crypto');
      assert.strictEqual(response.balances[0].amount, '0.0000');

      assert.strictEqual(response.balances[1].asset, 'EUR');
      assert.strictEqual(response.balances[1].raw, 'EUR');
      assert.strictEqual(response.balances[1].type, 'cash');
      assert.strictEqual(response.balances[1].amount, '200.0177');

      assert.strictEqual(response.balances[2].asset, 'USDC');
      assert.strictEqual(response.balances[2].raw, 'USDC');
      assert.strictEqual(response.balances[2].type, 'crypto');
      assert.strictEqual(response.balances[2].amount, '0.00197533');

      assert.strictEqual(response.balances[3].asset, 'USDT');
      assert.strictEqual(response.balances[3].raw, 'USDT');
      assert.strictEqual(response.balances[3].type, 'crypto');
      assert.strictEqual(response.balances[3].amount, '0.00000000');

      assert.strictEqual(response.balances[4].asset, 'BTC');
      assert.strictEqual(response.balances[4].raw, 'XBT');
      assert.strictEqual(response.balances[4].type, 'crypto');
      assert.strictEqual(response.balances[4].amount, '0.0737591223');

      assert.strictEqual(response.balances[5].asset, 'XRP');
      assert.strictEqual(response.balances[5].raw, 'XXRP');
      assert.strictEqual(response.balances[5].type, 'crypto');
      assert.strictEqual(response.balances[5].amount, '2485.99000000');
    });

    it('Kraken responses with DOGE coin status code 200', async () => {
      scope.post('/0/private/Balance').reply(200, {
        error: [],
        result: {
          ZEUR: '504861.8946',
          XDG: '1011.1908877900',
          'EUR.HOLD': '500.4838',
          'EUR.M': '342.6940',
          'ETH2.S': '0.1908877900',
          ETH2: '0.1908877900',
          XXDG: '0.00006',
        },
      });

      const response = await LunchMoneyKrakenConnection.getBalances(config);

      assert.strictEqual(response.providerName, 'kraken');
      assert.strictEqual(response.balances.length, 3);

      assert.strictEqual(response.balances[0].asset, 'EUR');
      assert.strictEqual(response.balances[0].raw, 'ZEUR');
      assert.strictEqual(response.balances[0].type, 'cash');
      assert.strictEqual(response.balances[0].amount, '505705.0724');

      assert.strictEqual(response.balances[1].asset, 'DOGE');
      assert.strictEqual(response.balances[1].raw, 'XDG');
      assert.strictEqual(response.balances[1].type, 'crypto');
      assert.strictEqual(response.balances[1].amount, '1011.1909477900');

      assert.strictEqual(response.balances[2].asset, 'ETH2');
      assert.strictEqual(response.balances[2].raw, 'ETH2');
      assert.strictEqual(response.balances[2].type, 'crypto');
      assert.strictEqual(response.balances[2].amount, '0.3817755800');
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
