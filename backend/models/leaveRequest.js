const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student reference is required']
  },
  leaveType: {
    type: String,
    enum: ['Casual Leave', 'Medical Leave', 'Emergency Leave'],
    required: [true, 'Leave type is required']
  },
  startDate: {
    type: String, // YYYY-MM-DD
    required: [true, 'Start date is required']
  },
  endDate: {
    type: String, // YYYY-MM-DD
    required: [true, 'End date is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true
  },
  attachmentUrl: {
    type: String, // Cloudinary link
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  remarks: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
