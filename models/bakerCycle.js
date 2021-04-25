const mongoose = require('mongoose');
const { Schema } = mongoose;

const BakerCycle = new Schema({
  address: {
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

  minFullStakingBalance: {
    type: Number,
    required: true,
  },
  minOwnBalance: {
    type: Number,
    required: true,
  },
  minDelegatedBalance: {
    type: Number,
    required: true,
  },
  fullCycleDelegators: [{
    address: {
      type: String,
      required: true,
      trim: true,
    },
    minDelegatedBalance: {
      type: Number,
      required: true,
    }
  }]
}, {
  timestamps: true,
  autoIndex: true
});

module.exports = () => {
  return mongoose.model('BakerCycle', BakerCycle);
};
