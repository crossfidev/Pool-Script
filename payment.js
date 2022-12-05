const lodash = require('lodash');

const {mpapi} = require('./js-rpcapi');
const config = require('./config');

const Reward = require('./models/reward')();

const runPaymentScript = async ({bakerKeys, lastLevel}) => {
  console.log(`Start payment from ${bakerKeys.pkh}`);
  const Operation = require('./models/operation')(bakerKeys.pkh);

  console.log('Rewarding period is up to ', lastLevel);
  if (!lastLevel) {
    console.log('Cant load last block');
    return;
  }

  const streamReward = Reward.find({
    from: bakerKeys.pkh,
    level: {$lte: lastLevel},
    paymentOperationHash: null,
    amount: {$gt: 0}
  }).cursor();

  const rewardsByAddress = {};

  let countLoadedDocs = 0;

  for (let doc = await streamReward.next(); doc != null; doc = await streamReward.next()) {
    countLoadedDocs++;

    if (countLoadedDocs % 1000 === 0) {
      console.log('Loaded docs', countLoadedDocs);
    }

    if (rewardsByAddress[doc.to]) {
      rewardsByAddress[doc.to].amountPlexGross += doc.amount;
      rewardsByAddress[doc.to].rewardIds.push(doc._id);
    } else {
      rewardsByAddress[doc.to] = {
        amountPlexGross: doc.amount,
        rewardIds: [doc._id]
      };
    }
  }

  console.log('Total loaded docs', countLoadedDocs);

  const bakerCommission = lodash.isNumber(config.PAYMENT_SCRIPT.BAKERS_COMMISSIONS[bakerKeys.pkh]) ?
    config.PAYMENT_SCRIPT.BAKERS_COMMISSIONS[bakerKeys.pkh] :
    config.PAYMENT_SCRIPT.DEFAULT_BAKER_COMMISSION;

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
      console.log('Updated rewards with hash', await Reward.updateMany({
        _id: {$in: lodash.flatMapDeep(operations, 'rewardIds')}
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
      return;
    }
  }

  let operations = [];

  for (const addressTo of lodash.keys(rewardsByAddress)) {
    const {amountPlexGross, rewardIds} = rewardsByAddress[addressTo]

    const commission = lodash.isNumber(config.PAYMENT_SCRIPT.ADDRESSES_COMMISSIONS[addressTo]) ?
      config.PAYMENT_SCRIPT.ADDRESSES_COMMISSIONS[addressTo] :
      bakerCommission;

    let amountPlex = amountPlexGross * (1 - commission);
    if (amountPlex >= config.PAYMENT_SCRIPT.MIN_PAYMENT_AMOUNT) {
      const fee = 1;
      const gasLimit = 0.010307;
      const storageLimit = 0.000257;
      operations.push({
        to: addressTo,
        fee,
        gasLimit,
        storageLimit,
        amountPlex,
        amountPlexGross,
        rewardIds
      });
    }

    if (operations.length >= lodash.min([config.PAYMENT_SCRIPT.MAX_COUNT_OPERATIONS_IN_ONE_BLOCK, 199])) {
      console.log('Count operations', operations.length);
      console.log('Total plex rewards:', operations.reduce((acc, operation) => acc + operation.amountPlex, 0));

      await oneChunk(operations)
      operations = []
    }
  }
};

module.exports = {
  runPaymentScript
}
