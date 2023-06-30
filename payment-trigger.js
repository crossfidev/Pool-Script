const config = require('./config');
const mongoose = require('mongoose');
const _ = require('lodash');

const {mpapi} = require('./js-rpcapi');
const lodash = require("lodash");
const runPayment = require("./payment");

mongoose.connect(config.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
}, async (error) => {
  if (error) throw error;

  const lastLevel = parseInt(process.env.LAST_LEVEL)

  if (!_.isNumber(lastLevel)) {
    throw new Error('LAST_LEVEL is not number')
  }
  await Promise.all(lodash.map(config.PAYMENT_SCRIPT.BAKER_PRIVATE_KEYS, async (privateKey) => {
    const bakerKeys = mpapi.crypto.extractKeys(privateKey);
    await runPayment({bakerKeys, cycle: lastLevel});
  }))

  process.exit(1);
})
