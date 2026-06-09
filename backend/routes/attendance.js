const express = require('express');
const Attendance = require('../models/attendance');
const Student = require('../models/student');
const Settings = require('../models/settings');
const auth = require('../middleware/authMiddleware');
const AuditLog = require('../models/auditLog');

const router = express.Router();

const authorizedRole = (req, res, next) => {
  const allowed = ['superadmin', 'admin', 'hod', 'faculty', 'student'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ msg: 'Access denied: Insufficient privileges' });
  }
  next();
};

// Haversine formula to compute distance in meters
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// GET /api/attendance - List attendance logs with filter options
router.get('/', auth, async (req, res) => {
  try {
    const { date, studentId, subjectId, branch, section, year, status } = req.query;

    const query = {};
    if (date) query.date = date;
    if (status) query.status = status;
    if (studentId) query.studentId = studentId;
    if (subjectId) query.subjectId = subjectId;

    let studentFilter = {};
    let filterByStudentFields = false;

    if (branch) { studentFilter.branch = branch; filterByStudentFields = true; }
    if (section) { studentFilter.section = section; filterByStudentFields = true; }
    if (year) { studentFilter.year = year; filterByStudentFields = true; }

    if (filterByStudentFields) {
      const studentIds = await Student.find(studentFilter).select('_id');
      query.studentId = { $in: studentIds.map(s => s._id) };
    }

    const logs = await Attendance.find(query)
      .populate('studentId', 'name rollNumber branch section year email mobile parentName')
      .populate('subjectId', 'name code')
      .populate('teacherId', 'name email')
      .sort({ date: -1, createdAt: -1 });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance - Save attendance (Manual, QR, Geolocation, Face Recognition)
router.post('/', auth, authorizedRole, async (req, res) => {
  const { 
    studentId, 
    studentIds, 
    subjectId, 
    status, 
    date, 
    location, 
    verifiedBy, 
    qrTimestamp 
  } = req.body;
  
  const targetDate = date || new Date().toISOString().split('T')[0];

  if (!status) {
    return res.status(400).json({ msg: 'Status is required.' });
  }

  try {
    const teacherId = req.user.role === 'student' ? req.body.teacherId || null : req.user.id;

    // 1. Validate time-limited QR codes (if QR scan is used)
    if (verifiedBy === 'QR Code Scan' && qrTimestamp) {
      const now = Date.now();
      const difference = Math.abs(now - parseInt(qrTimestamp));
      if (difference > 60 * 1000) { // 60 seconds QR expiration limit
        return res.status(400).json({ msg: 'QR code expired. Please scan a fresh code.' });
      }
    }

    // 2. Geolocation check (if coordinates are provided)
    if (location && location.latitude && location.longitude) {
      // Default Campus center: lat 17.4063, lng 78.4691, radius 200m
      let campusLat = 17.4063;
      let campusLng = 78.4691;
      let allowedRadius = 200;

      const settings = await Settings.findOne();
      if (settings && settings.locationBoundary) {
        campusLat = settings.locationBoundary.latitude || campusLat;
        campusLng = settings.locationBoundary.longitude || campusLng;
        allowedRadius = settings.locationBoundary.radius || allowedRadius;
      }

      const distance = getDistanceInMeters(
        location.latitude, 
        location.longitude, 
        campusLat, 
        campusLng
      );

      if (distance > allowedRadius) {
        return res.status(400).json({ 
          msg: `Outside Campus Boundary! You are ${Math.round(distance)}m away from campus. Attendance denied.` 
        });
      }
    }

    // Handle Bulk Mark (Faculty only)
    if (studentIds && Array.isArray(studentIds)) {
      if (req.user.role === 'student') {
        return res.status(403).json({ msg: 'Access denied: Students cannot perform bulk marking.' });
      }
      const operations = studentIds.map(sid => ({
        updateOne: {
          filter: { studentId: sid, subjectId: subjectId || null, date: targetDate },
          update: { 
            studentId: sid, 
            subjectId: subjectId || null, 
            date: targetDate, 
            status, 
            teacherId, 
            verifiedBy: verifiedBy || 'Manual' 
          },
          upsert: true
        }
      }));

      await Attendance.bulkWrite(operations);

      await new AuditLog({
        action: 'ATTENDANCE_BULK_SAVE',
        user: req.user.id,
        ipAddress: req.ip,
        details: `Bulk marked ${studentIds.length} students as ${status} for subject ID: ${subjectId}`
      }).save();

      return res.json({ msg: `Bulk attendance marked for ${studentIds.length} students.` });
    }

    // Handle Single Mark
    const finalStudentId = studentId || req.user.associatedId;
    if (!finalStudentId) {
      return res.status(400).json({ msg: 'Please supply studentId.' });
    }

    const record = await Attendance.findOneAndUpdate(
      { studentId: finalStudentId, subjectId: subjectId || null, date: targetDate },
      { 
        studentId: finalStudentId, 
        subjectId: subjectId || null, 
        date: targetDate, 
        status, 
        teacherId, 
        location: location || { latitude: null, longitude: null }, 
        verifiedBy: verifiedBy || 'Manual' 
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Audit Log for single marking
    await new AuditLog({
      action: 'ATTENDANCE_MARK',
      user: req.user.id,
      ipAddress: req.ip,
      details: `Student marked: ${finalStudentId} as ${status}. Verification: ${verifiedBy || 'Manual'}`
    }).save();

    res.json({ msg: 'Attendance logged successfully', record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/attendance/:id - Update record
router.put('/:id', auth, async (req, res) => {
  const { status, date } = req.body;
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ msg: 'Record not found.' });

    if (status) record.status = status;
    if (date) record.date = date;
    record.teacherId = req.user.id;

    await record.save();

    await new AuditLog({
      action: 'ATTENDANCE_EDIT',
      user: req.user.id,
      ipAddress: req.ip,
      details: `Edited record ID: ${record._id}. Status set to ${record.status}`
    }).save();

    res.json({ msg: 'Record updated', record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/attendance/:id - Delete record
router.delete('/:id', auth, async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ msg: 'Record not found.' });

    await Attendance.findByIdAndDelete(req.params.id);

    await new AuditLog({
      action: 'ATTENDANCE_DELETE',
      user: req.user.id,
      ipAddress: req.ip,
      details: `Deleted record ID: ${record._id}`
    }).save();

    res.json({ msg: 'Record deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
