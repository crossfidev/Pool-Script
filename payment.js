const lodash = require('lodash');
const mpapi = require('./utils/mpapi');
const config = require('./config');
const _ = require("lodash");
const RewardState = require('./models/rewardState')();

module.exports = async ({bakerKeys, cycle}) => {
  const logger = (...args) => console.log(`${bakerKeys.pkh} => `, ...args);

  logger('Start payment');

  const Operation = require('./models/operation')(bakerKeys.pkh);

  logger('Rewarding period is up to ', cycle);
  if (!cycle) {
    logger('Cant load last block');
    return;
  }

  const rewardStatesGroup = RewardState.aggregate([
    {
      $match: {
        from: bakerKeys.pkh,
        cycle: {$lte: cycle},
        paymentOperationHash: null,
        amount: {$gt: 0}
      },
    },
    {
      $group: {
        _id: "$to",
        amount: {
          $sum: "$amount",
        },
        rewardIds: {
          $push: '$_id'
        }
      },
    }
  ]).cursor()


  let countLoadedDocs = 0;

  const operations = []

  const bakerCommission = lodash.isNumber(config.PAYMENT_SCRIPT.BAKERS_COMMISSIONS[bakerKeys.pkh]) ?
    config.PAYMENT_SCRIPT.BAKERS_COMMISSIONS[bakerKeys.pkh] :
    config.PAYMENT_SCRIPT.DEFAULT_BAKER_COMMISSION;

  for await (const rewardState of rewardStatesGroup) {
    countLoadedDocs++;

    if (countLoadedDocs % 100 === 0) {
      logger('Loaded docs', countLoadedDocs);
    }

    const commission = lodash.isNumber(config.PAYMENT_SCRIPT.ADDRESSES_COMMISSIONS[rewardState._id]) ?
      config.PAYMENT_SCRIPT.ADDRESSES_COMMISSIONS[rewardState._id] :
      bakerCommission;

    let amountPlex = rewardState.amount * (1 - commission);

    if (amountPlex >= config.PAYMENT_SCRIPT.MIN_PAYMENT_AMOUNT) {
      const fee = 1;
      const gasLimit = 0.010307;
      const storageLimit = 0.000257;

      operations.push({
        to: rewardState._id,
        fee,
        gasLimit,
        storageLimit,
        amountPlex,
        amountPlexGross: rewardState.amount,
        rewardIds: rewardState.rewardIds
      });
    }
  }

  logger('operations', operations);

  logger('Total loaded docs', countLoadedDocs);

  const oneChunk = async (operations) => {
    const sendOperations = async (operations) => {
      try {
        logger('Try to send operations');
        const res = await mpapi.rpc.sendOperation(bakerKeys.pkh, operations.map(operation => ({
          "kind": "transaction",
          "fee": mpapi.utility.mutez(operation.fee).toString(),
          "gas_limit": mpapi.utility.mutez(operation.gasLimit).toString(),
          "storage_limit": mpapi.utility.mutez(operation.storageLimit).toString(),
          "amount": mpapi.utility.mutez(operation.amountPlex).toString(),
          "destination": operation.to
        })), bakerKeys);

        if (!res.hash) {
          throw new Error('Hash is undefined')
        }

        logger(`Hash operation => ${res.hash}`)

        await mpapi.rpc.awaitOperation(res.hash, 10 * 1000, 61 * 60 * 1000);

        return res.hash
      } catch (error) {
        logger('RPC Error:', error);
        return new Promise(resolve => setTimeout(async () => {
          resolve(await sendOperations(operations))
        }, 1000 * 60));
      }
    }
    try {
      const hash = await sendOperations(operations);

      logger('Operation hash', hash);
      logger('Updated rewards with hash', await RewardState.updateMany({
        _id: {$in: lodash.flatMap(operations, 'rewardIds')}
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

      logger('Block hash:', hash)
    } catch (error) {
      logger('Error', error);
      await new Promise(rs => setTimeout(rs, 60 * 1000))
      return;
    }
  }

  const operationsLimit = lodash.min([config.PAYMENT_SCRIPT.MAX_COUNT_OPERATIONS_IN_ONE_BLOCK, 199])

  for (const operationChunk of _.chunk(operations, operationsLimit)) {
    await oneChunk(operationChunk)
  }
};
