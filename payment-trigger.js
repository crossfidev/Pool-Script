const payment = require('./payment');
const async = require('async');
const config = require('./config');
const mongoose = require('mongoose');

const {mpapi} = require('./js-rpcapi');

mongoose.connect(config.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
}, async (error) => {
  if (error) throw error;

  await async.eachLimit(config.PAYMENT_SCRIPT.BAKER_PRIVATE_KEYS, 1, async (privateKey) => {
    const bakerKeys = mpapi.crypto.extractKeys(privateKey);
    await payment.runPaymentScript({bakerKeys, lastLevel: process.env.LAST_LEVEL});
  });

  process.exit(1);
})
