const express = require('express');
const Subject = require('../models/subject');
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

// GET /api/subjects - Get all subjects
router.get('/', auth, async (req, res) => {
  try {
    const { department } = req.query;
    const query = {};
    if (department) query.department = department;

    const subjects = await Subject.find(query).populate('facultyIds', 'name email');
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subjects - Create a new subject
router.post('/', auth, authorizedRole, async (req, res) => {
  const { name, code, department, facultyIds } = req.body;

  if (!name || !code || !department) {
    return res.status(400).json({ msg: 'Please provide all required fields' });
  }

  try {
    const existingCode = await Subject.findOne({ code: code.toUpperCase() });
    if (existingCode) {
      return res.status(400).json({ msg: `Subject code "${code}" is already registered.` });
    }

    const subject = new Subject({
      name,
      code,
      department,
      facultyIds: facultyIds || []
    });

    await subject.save();

    await new AuditLog({
      action: 'SUBJECT_CREATE',
      user: req.user.id,
      ipAddress: req.ip,
      details: `Subject created: ${name} (${code})`
    }).save();

    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/subjects/:id - Update subject details
router.put('/:id', auth, authorizedRole, async (req, res) => {
  const { name, code, department, facultyIds } = req.body;

  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ msg: 'Subject not found' });
    }

    if (code && code.toUpperCase() !== subject.code) {
      const existingCode = await Subject.findOne({ code: code.toUpperCase() });
      if (existingCode) {
        return res.status(400).json({ msg: `Subject code "${code}" is already in use.` });
      }
      subject.code = code.toUpperCase();
    }

    if (name) subject.name = name;
    if (department) subject.department = department;
    if (facultyIds) subject.facultyIds = facultyIds;

    await subject.save();

    await new AuditLog({
      action: 'SUBJECT_UPDATE',
      user: req.user.id,
      ipAddress: req.ip,
      details: `Subject updated: ${subject.name}`
    }).save();

    res.json(subject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/subjects/:id - Delete subject
router.delete('/:id', auth, authorizedRole, async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ msg: 'Subject not found' });
    }

    await Subject.findByIdAndDelete(req.params.id);

    await new AuditLog({
      action: 'SUBJECT_DELETE',
      user: req.user.id,
      ipAddress: req.ip,
      details: `Subject deleted: ${subject.name} (${subject.code})`
    }).save();

    res.json({ msg: 'Subject deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
