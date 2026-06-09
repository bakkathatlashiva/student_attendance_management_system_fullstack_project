const express = require('express');
const AuditLog = require('../models/auditLog');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

const authorizedRole = (req, res, next) => {
  const allowed = ['superadmin', 'admin'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ msg: 'Access denied: Insufficient privileges' });
  }
  next();
};

// GET /api/audit-logs - List audit logs (Admin/Super Admin only)
router.get('/', auth, authorizedRole, async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('user', 'name email role')
      .sort({ timestamp: -1 })
      .limit(100); // return last 100 entries
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
