const express = require('express');
const Timetable = require('../models/timetable');
const Student = require('../models/student');
const auth = require('../middleware/authMiddleware');
const AuditLog = require('../models/auditLog');

const router = express.Router();

const authorizedRole = (req, res, next) => {
  const allowed = ['superadmin', 'admin', 'hod'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ msg: 'Access denied: Insufficient privileges' });
  }
  next();
};

// GET /api/timetable - Get all timetables
router.get('/', auth, async (req, res) => {
  try {
    const { department, branch, section, year, semester } = req.query;
    const query = {};
    if (department) query.department = department;
    if (branch) query.branch = branch;
    if (section) query.section = section;
    if (year) query.year = year;
    if (semester) query.semester = semester;

    const schedules = await Timetable.find(query)
      .populate('slots.subjectId', 'name code')
      .populate('slots.teacherId', 'name email');
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/student/:studentId - Get specific student timetable
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).json({ msg: 'Student not found' });

    const schedules = await Timetable.find({
      branch: student.branch,
      section: student.section,
      year: student.year,
      semester: student.semester
    })
    .populate('slots.subjectId', 'name code')
    .populate('slots.teacherId', 'name email');

    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/faculty/:facultyId - Get specific faculty timetable
router.get('/faculty/:facultyId', auth, async (req, res) => {
  try {
    const schedules = await Timetable.find({
      'slots.teacherId': req.params.facultyId
    })
    .populate('slots.subjectId', 'name code')
    .populate('slots.teacherId', 'name email');

    // Filter slots only belonging to this faculty
    const filteredSchedules = schedules.map(s => {
      const cloned = s.toObject();
      cloned.slots = cloned.slots.filter(slot => slot.teacherId._id.toString() === req.params.facultyId);
      return cloned;
    });

    res.json(filteredSchedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timetable - Save or upsert a timetable day schedule
router.post('/', auth, authorizedRole, async (req, res) => {
  const { department, branch, year, section, semester, day, slots } = req.body;

  if (!department || !branch || !year || !section || !semester || !day || !slots) {
    return res.status(400).json({ msg: 'Please enter all required fields.' });
  }

  try {
    // Upsert the day's schedule
    const schedule = await Timetable.findOneAndUpdate(
      { department, branch, year, section, semester, day },
      { slots },
      { new: true, upsert: true, runValidators: true }
    );

    await new AuditLog({
      action: 'TIMETABLE_SAVE',
      user: req.user.id,
      ipAddress: req.ip,
      details: `Timetable updated for ${branch} - ${section} on ${day}`
    }).save();

    res.status(200).json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
