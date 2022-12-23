const mongoose = require('mongoose');
const constants = require('../constants');
const { Schema } = mongoose;

const RewardState = new Schema({
  from: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  to: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  cycle: {
    type: Number,
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    index: true,
    enum: Object.values(constants.REWARD_TYPES)
  },
  paymentOperationHash: {
    type: String,
    trim: true,
    index: true,
  }
}, {
  timestamps: true,
  autoIndex: true
});

module.exports = () => {
  return mongoose.model('RewardState', RewardState);
};
