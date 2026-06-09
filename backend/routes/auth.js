const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Student = require('../models/student');
const Faculty = require('../models/faculty');
const AuditLog = require('../models/auditLog');
const { sendMail } = require('../services/mail');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforstudentattendanceapp';

// REGISTER User
router.post('/register', async (req, res) => {
  const { name, email, password, role, profileData } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ msg: 'Please enter all required fields.' });
  }

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists.' });
    }

    user = new User({
      name,
      email,
      password,
      role
    });

    // Handle profiling linking based on role
    if (role === 'student' && profileData) {
      const student = new Student({
        name,
        email,
        rollNumber: profileData.rollNumber,
        registrationNumber: profileData.registrationNumber || `REG-${Date.now()}`,
        branch: profileData.branch || 'CSE',
        department: profileData.department || 'CSE',
        section: profileData.section || 'A',
        year: profileData.year || '1st Year',
        semester: profileData.semester || '1st Sem',
        gender: profileData.gender || 'Male',
        parentName: profileData.parentName || 'Parent Name',
        parentContact: profileData.parentContact || '9999999999'
      });
      await student.save();
      user.associatedId = student._id;
    } else if ((role === 'faculty' || role === 'hod') && profileData) {
      const faculty = new Faculty({
        name,
        email,
        employeeId: profileData.employeeId || `EMP-${Date.now()}`,
        department: profileData.department || 'CSE',
        mobile: profileData.mobile || '9999999999'
      });
      await faculty.save();
      user.associatedId = faculty._id;
    } else if (role === 'parent' && profileData) {
      // Parent is linked to their student's ID
      const student = await Student.findOne({ rollNumber: profileData.studentRollNumber });
      if (student) {
        user.associatedId = student._id;
      }
    }

    await user.save();

    // Log this action
    await new AuditLog({
      action: 'USER_REGISTER',
      user: user._id,
      ipAddress: req.ip,
      details: `User registered with role: ${role}`
    }).save();

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, associatedId: user.associatedId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        associatedId: user.associatedId
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN User
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: 'Please enter all fields.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials.' });
    }

    // Log this action
    await new AuditLog({
      action: 'USER_LOGIN',
      user: user._id,
      ipAddress: req.ip,
      details: `User logged in with role: ${user.role}`
    }).save();

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, associatedId: user.associatedId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        associatedId: user.associatedId
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FORGOT PASSWORD Reset Request
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ msg: 'Email is required.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: 'No user registered with this email address.' });
    }

    // Generate mock temporary reset token
    const resetToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '15m' });
    
    // Simulate sending email containing reset link
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
    await sendMail({
      to: email,
      subject: 'College ERP Password Reset Request',
      text: `Reset link: ${resetLink}. Expire in 15 minutes.`,
      html: `<p>Please reset your password by clicking here: <a href="${resetLink}">Reset Password</a></p>`
    });

    res.json({ msg: 'Password reset link sent to your registered email.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ msg: 'Token and new password are required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    user.password = password; // Pre-save hook hashes it automatically
    await user.save();

    // Log this action
    await new AuditLog({
      action: 'PASSWORD_RESET',
      user: user._id,
      ipAddress: req.ip,
      details: 'Password was reset successfully'
    }).save();

    res.json({ msg: 'Password reset successful! You can now log in.' });
  } catch (err) {
    res.status(400).json({ msg: 'Invalid or expired token.' });
  }
});

module.exports = router;
