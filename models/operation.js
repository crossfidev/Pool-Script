const mongoose = require('mongoose');
const { Schema } = mongoose;

const Operation = new Schema({
    to: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    from: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    amountPlex: {
      type: Number,
      required: true,
    },
    amountPlexGross: {
      type: Number,
      required: true,
    },
    fee: {
      type: Number,
      required: true,
    },
    operationHash: {
      type: String,
      required: true,
      trim: true,
      index: true
    }
}, {
    timestamps: true,
    autoIndex: true,
});

module.exports = (bakerAddress) => {
  return mongoose.model(`Operations-${bakerAddress}`, Operation, `operations-${bakerAddress}`);
};
