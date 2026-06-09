const express = require('express');
const multer = require('multer');
const Student = require('../models/student');
const Attendance = require('../models/attendance');
const { uploadFile } = require('../services/cloudinary');
const auth = require('../middleware/authMiddleware');
const AuditLog = require('../models/auditLog');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB limit
});

const authorizedRole = (req, res, next) => {
  const allowed = ['superadmin', 'admin', 'hod', 'faculty'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ msg: 'Access denied: Insufficient privileges' });
  }
  next();
};

// GET /api/students - Search and list students
router.get('/', auth, async (req, res) => {
  try {
    const { branch, section, year, semester, department, search, sort, page = 1, limit = 50 } = req.query;
    const query = {};

    if (branch) query.branch = branch;
    if (section) query.section = section;
    if (year) query.year = year;
    if (semester) query.semester = semester;
    if (department) query.department = department;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOption = { name: 1 };
    if (sort) {
      const parts = sort.split(':');
      sortOption = { [parts[0]]: parts[1] === 'desc' ? -1 : 1 };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const students = await Student.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    const total = await Student.countDocuments(query);

    res.json({
      students,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/students/:id - Get student details by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ msg: 'Student not found.' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students - Add a student with photo upload
router.post('/', auth, authorizedRole, upload.single('photo'), async (req, res) => {
  const { 
    name, 
    rollNumber, 
    registrationNumber, 
    branch, 
    department, 
    section, 
    year, 
    semester, 
    mobile, 
    email, 
    gender,
    bloodGroup,
    address,
    parentName,
    parentContact
  } = req.body;

  if (!name || !rollNumber || !registrationNumber || !branch || !department || !section || !year || !semester || !mobile || !email || !gender || !parentName || !parentContact) {
    return res.status(400).json({ msg: 'Please enter all required fields.' });
  }

  try {
    const existingRoll = await Student.findOne({ rollNumber: rollNumber.toUpperCase() });
    if (existingRoll) {
      return res.status(400).json({ msg: `Roll number "${rollNumber}" already exists.` });
    }

    const existingReg = await Student.findOne({ registrationNumber: registrationNumber.toUpperCase() });
    if (existingReg) {
      return res.status(400).json({ msg: `Registration number "${registrationNumber}" already exists.` });
    }

    const existingEmail = await Student.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ msg: `Email "${email}" already registered.` });
    }

    let photoUrl = '';
    if (req.file) {
      photoUrl = await uploadFile(req.file.buffer, 'student_photos');
    }

    const student = new Student({
      name,
      rollNumber,
      registrationNumber,
      branch,
      department,
      section,
      year,
      semester,
      mobile,
      email,
      gender,
      bloodGroup: bloodGroup || '',
      address: address || '',
      parentName,
      parentContact,
      photoUrl
    });

    await student.save();

    await new AuditLog({
      action: 'STUDENT_CREATE',
      user: req.user.id,
      ipAddress: req.ip,
      details: `Student created: ${name} (${rollNumber})`
    }).save();

    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students/bulk - Bulk upload students
router.post('/bulk', auth, authorizedRole, async (req, res) => {
  const { students } = req.body;

  if (!students || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ msg: 'Please supply a non-empty array of student objects.' });
  }

  try {
    const imported = [];
    const skipped = [];

    for (const s of students) {
      // Uniqueness validation checks
      const match = await Student.findOne({
        $or: [
          { rollNumber: s.rollNumber.toUpperCase() },
          { registrationNumber: s.registrationNumber.toUpperCase() },
          { email: s.email.toLowerCase() }
        ]
      });

      if (match) {
        skipped.push({ name: s.name, rollNumber: s.rollNumber, reason: 'Duplicate roll/registration/email' });
        continue;
      }

      const newStudent = new Student({
        name: s.name,
        rollNumber: s.rollNumber,
        registrationNumber: s.registrationNumber,
        branch: s.branch || 'CSE',
        department: s.department || 'CSE',
        section: s.section || 'A',
        year: s.year || '1st Year',
        semester: s.semester || '1st Sem',
        mobile: s.mobile || '9999999999',
        email: s.email,
        gender: s.gender || 'Male',
        parentName: s.parentName || 'Parent Name',
        parentContact: s.parentContact || '9999999999',
        bloodGroup: s.bloodGroup || '',
        address: s.address || ''
      });

      await newStudent.save();
      imported.push(newStudent);
    }

    await new AuditLog({
      action: 'STUDENT_BULK_UPLOAD',
      user: req.user.id,
      ipAddress: req.ip,
      details: `Bulk uploaded ${imported.length} student records, skipped ${skipped.length}`
    }).save();

    res.json({
      msg: `Bulk import completed. Imported: ${imported.length}, Skipped: ${skipped.length}`,
      importedCount: imported.length,
      skippedCount: skipped.length,
      skippedDetails: skipped
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/students/:id - Edit student
router.put('/:id', auth, authorizedRole, upload.single('photo'), async (req, res) => {
  const { 
    name, 
    rollNumber, 
    registrationNumber, 
    branch, 
    department, 
    section, 
    year, 
    semester, 
    mobile, 
    email, 
    gender,
    bloodGroup,
    address,
    parentName,
    parentContact,
    faceDescriptor
  } = req.body;

  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ msg: 'Student not found.' });

    // Validate edits
    if (rollNumber && rollNumber.toUpperCase() !== student.rollNumber) {
      const match = await Student.findOne({ rollNumber: rollNumber.toUpperCase() });
      if (match) return res.status(400).json({ msg: 'Roll number in use.' });
      student.rollNumber = rollNumber.toUpperCase();
    }

    if (registrationNumber && registrationNumber.toUpperCase() !== student.registrationNumber) {
      const match = await Student.findOne({ registrationNumber: registrationNumber.toUpperCase() });
      if (match) return res.status(400).json({ msg: 'Registration number in use.' });
      student.registrationNumber = registrationNumber.toUpperCase();
    }

    if (email && email.toLowerCase() !== student.email) {
      const match = await Student.findOne({ email: email.toLowerCase() });
      if (match) return res.status(400).json({ msg: 'Email in use.' });
      student.email = email.toLowerCase();
    }

    if (name) student.name = name;
    if (branch) student.branch = branch;
    if (department) student.department = department;
    if (section) student.section = section;
    if (year) student.year = year;
    if (semester) student.semester = semester;
    if (mobile) student.mobile = mobile;
    if (gender) student.gender = gender;
    if (bloodGroup) student.bloodGroup = bloodGroup;
    if (address) student.address = address;
    if (parentName) student.parentName = parentName;
    if (parentContact) student.parentContact = parentContact;
    if (faceDescriptor) student.faceDescriptor = faceDescriptor;

    if (req.file) {
      student.photoUrl = await uploadFile(req.file.buffer, 'student_photos');
    }

    await student.save();

    await new AuditLog({
      action: 'STUDENT_UPDATE',
      user: req.user.id,
      ipAddress: req.ip,
      details: `Student details updated: ${student.name} (${student.rollNumber})`
    }).save();

    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/students/:id - Delete student
router.delete('/:id', auth, authorizedRole, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ msg: 'Student not found.' });

    await Attendance.deleteMany({ studentId: student._id });
    await Student.findByIdAndDelete(req.params.id);

    await new AuditLog({
      action: 'STUDENT_DELETE',
      user: req.user.id,
      ipAddress: req.ip,
      details: `Student deleted: ${student.name} (${student.rollNumber})`
    }).save();

    res.json({ msg: 'Student deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
