const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student reference is required']
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    default: null // Null if general daily attendance
  },
  date: {
    type: String, // YYYY-MM-DD
    required: [true, 'Date is required']
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['Present', 'Absent', 'Leave', 'Medical Leave']
  },
  location: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },
  verifiedBy: {
    type: String,
    enum: ['Manual', 'Face Recognition', 'QR Code Scan', 'Geolocation GPS'],
    default: 'Manual'
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher reference is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index: student, subject, date to prevent double markings for same class
attendanceSchema.index({ studentId: 1, subjectId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
