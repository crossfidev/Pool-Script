const mongoose = require('mongoose');
const { Schema } = mongoose;

const Settings = new Schema({
  lastIndexedLevel: {
    type: Number,
    required: true,
    trim: true,
  },
}, {
  timestamps: true,
  autoIndex: false
});

module.exports = () => {
  return mongoose.model('Settings', Settings);
};
