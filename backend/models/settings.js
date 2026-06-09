const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  minAttendance: {
    type: Number,
    default: 75
  },
  totalSemClasses: {
    type: Number,
    default: 90
  },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'dark'
  }
});

module.exports = mongoose.model('Settings', settingsSchema);
