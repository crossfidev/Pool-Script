const lodash = require('lodash');

const {mpapi} = require('./js-rpcapi');
const config = require('./config');
const _ = require("lodash");

const RewardState = require('./models/rewardState')();

const runPaymentScript = async ({bakerKeys, cycle}) => {
  console.log(`Start payment from ${bakerKeys.pkh}`);
  const Operation = require('./models/operation')(bakerKeys.pkh);

  console.log('Rewarding period is up to ', cycle);
  if (!cycle) {
    console.log('Cant load last block');
    return;
  }

  const streamRewardState = RewardState.find({
    from: bakerKeys.pkh,
    cycle: {$lte: cycle},
    paymentOperationHash: null,
    amount: {$gt: 0}
  }).cursor();

  let countLoadedDocs = 0;

  const operations = []

  const bakerCommission = lodash.isNumber(config.PAYMENT_SCRIPT.BAKERS_COMMISSIONS[bakerKeys.pkh]) ?
    config.PAYMENT_SCRIPT.BAKERS_COMMISSIONS[bakerKeys.pkh] :
    config.PAYMENT_SCRIPT.DEFAULT_BAKER_COMMISSION;


  for (let doc = await streamRewardState.next(); doc != null; doc = await streamRewardState.next()) {
    countLoadedDocs++;

    if (countLoadedDocs % 10 === 0) {
      console.log('Loaded docs', countLoadedDocs);
    }

    const commission = lodash.isNumber(config.PAYMENT_SCRIPT.ADDRESSES_COMMISSIONS[doc.to]) ?
      config.PAYMENT_SCRIPT.ADDRESSES_COMMISSIONS[doc.to] :
      bakerCommission;

    let amountPlex = doc.amount * (1 - commission);

    if (amountPlex >= config.PAYMENT_SCRIPT.MIN_PAYMENT_AMOUNT) {
      const fee = 1;
      const gasLimit = 0.010307;
      const storageLimit = 0.000257;
      operations.push({
        to: doc.to,
        fee,
        gasLimit,
        storageLimit,
        amountPlex,
        amountPlexGross: doc.amount,
        rewardId: doc._id
      });
    }
  }

  console.log('Total loaded docs', countLoadedDocs);
  const currentDate = new Date();

  const oneChunk = async (operations) => {
    try {
      const sendOperations = async (operations) => {
        try {
          console.log('Try to send operations');
          const {hash = `${bakerKeys.pkh}-${currentDate}`} = await mpapi.rpc.sendOperation(bakerKeys.pkh, operations.map(operation => ({
            "kind": "transaction",
            "fee": mpapi.utility.mutez(operation.fee).toString(),
            "gas_limit": mpapi.utility.mutez(operation.gasLimit).toString(),
            "storage_limit": mpapi.utility.mutez(operation.storageLimit).toString(),
            "amount": mpapi.utility.mutez(operation.amountPlex).toString(),
            "destination": operation.to
          })), bakerKeys);

          return hash;
        } catch (error) {
          console.log('RPC Error:', error);
          return await sendOperations(operations);
        }
      }
      const hash = await sendOperations(operations);

      console.log('Operation hash', hash);
      console.log('Updated rewards with hash', await RewardState.updateMany({
        _id: {$in: lodash.map(operations, 'rewardId')}
      }, {
        $set: {
          paymentOperationHash: hash
        }
      }));

      await Operation.insertMany(operations.map(operation => ({
        to: operation.to,
        from: bakerKeys.pkh,
        amountPlex: operation.amountPlex,
        amountPlexGross: operation.amountPlexGross,
        operationHash: hash,
        fee: operation.fee,
      })));

      const blockHash = await mpapi.rpc.awaitOperation(hash, 10 * 1000, 61 * 60 * 1000);
      console.log('Block hash:', blockHash)
    } catch (error) {
      console.log('Error', error);
      await new Promise(rs => setTimeout(rs, 60 * 1000))
      return;
    }
  }

  const operationsLimit = lodash.min([config.PAYMENT_SCRIPT.MAX_COUNT_OPERATIONS_IN_ONE_BLOCK, 199])

  for (const operationChunk of _.chunk(operations, operationsLimit)) {
    await oneChunk(operationChunk)
  }
};

module.exports = {
  runPaymentScript
}
