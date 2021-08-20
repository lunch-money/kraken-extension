import * as Kraken from '../src/main.js';

Kraken.LunchMoneyKrakenConnection.initiate({
  apiKey: process.env.API_KEY ?? '',
  apiSecret: process.env.API_SECRET ?? '',
}).then((value) => console.log(value));
