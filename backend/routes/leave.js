const express = require('express');
const multer = require('multer');
const LeaveRequest = require('../models/leaveRequest');
const Student = require('../models/student');
const { uploadFile } = require('../services/cloudinary');
const { notifyUser } = require('../services/socket');
const auth = require('../middleware/authMiddleware');
const AuditLog = require('../models/auditLog');

const router = express.Router();

// Configure Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// POST /api/leave/apply - Student applies for leave
router.post('/apply', auth, upload.single('attachment'), async (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body;

  if (!leaveType || !startDate || !endDate || !reason) {
    return res.status(400).json({ msg: 'Please provide all required fields.' });
  }

  try {
    const studentId = req.user.associatedId;
    if (!studentId) {
      return res.status(400).json({ msg: 'Logged in user is not associated with a student record.' });
    }

    let attachmentUrl = '';
    if (req.file) {
      attachmentUrl = await uploadFile(req.file.buffer, 'leave_certificates');
    }

    const leaveRequest = new LeaveRequest({
      studentId,
      leaveType,
      startDate,
      endDate,
      reason,
      attachmentUrl
    });

    await leaveRequest.save();

    await new AuditLog({
      action: 'LEAVE_APPLY',
      user: req.user.id,
      ipAddress: req.ip,
      details: `Leave applied by student for: ${leaveType} (${startDate} to ${endDate})`
    }).save();

    // Find student department info to notify HOD/Faculty if needed
    const studentObj = await Student.findById(studentId);
    console.log(`Leave request generated for student ${studentObj?.name}`);

    res.status(201).json({ msg: 'Leave request submitted successfully.', leaveRequest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leave/student/:studentId - Get student leave requests
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ studentId: req.params.studentId })
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leave/pending - Get all pending leaves for review (HOD/Faculty)
router.get('/pending', auth, async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ status: 'Pending' })
      .populate('studentId', 'name rollNumber branch department section year')
      .sort({ createdAt: 1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leave/:id/review - Review leave requests (HOD/Faculty)
router.post('/:id/review', auth, async (req, res) => {
  const { status, remarks } = req.body;

  if (!status || !['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ msg: 'Status must be Approved or Rejected' });
  }

  try {
    const leave = await LeaveRequest.findById(req.params.id).populate('studentId');
    if (!leave) return res.status(404).json({ msg: 'Leave request not found' });

    leave.status = status;
    leave.remarks = remarks || '';
    leave.reviewedBy = req.user.id;
    await leave.save();

    await new AuditLog({
      action: `LEAVE_REVIEW_${status.toUpperCase()}`,
      user: req.user.id,
      ipAddress: req.ip,
      details: `Leave reviewed for student ID ${leave.studentId?._id}: ${status}`
    }).save();

    // Trigger Realtime Notification to student via Socket.io
    const message = `Your leave request for ${leave.leaveType} has been ${status.toLowerCase()}. Remarks: ${remarks || 'None'}`;
    // Link to Student User ID (we lookup User with associatedId of the student)
    const User = require('../models/user');
    const studentUser = await User.findOne({ associatedId: leave.studentId?._id });
    if (studentUser) {
      await notifyUser(studentUser._id, message, 'leave');
    }

    res.json({ msg: `Leave request has been ${status.toLowerCase()}`, leave });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
