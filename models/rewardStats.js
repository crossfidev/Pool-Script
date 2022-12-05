const mongoose = require('mongoose');
const constants = require('../constants');
const { Schema } = mongoose;

const RewardStats = new Schema({
  addressTo: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  amountPlexGross: {
    type: Number,
    required: true,
    index: true,
  },
  rewardIds: {
    type: Array,
    required: true,
    index: true,
  },
}, {
  timestamps: true,
  autoIndex: true
});

module.exports = () => {
  return mongoose.model('RewardStats', RewardStats);
};
