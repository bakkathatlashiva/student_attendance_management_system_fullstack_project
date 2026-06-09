const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const db = require('./db');

// Import Models
const User = require('./models/user');
const Student = require('./models/student');
const Faculty = require('./models/faculty');
const Department = require('./models/department');
const Subject = require('./models/subject');
const Timetable = require('./models/timetable');
const LeaveRequest = require('./models/leaveRequest');
const Attendance = require('./models/attendance');
const Settings = require('./models/settings');
const AuditLog = require('./models/auditLog');

const seedDatabase = async () => {
  try {
    console.log('Clearing existing database tables...');
    await User.deleteMany({});
    await Student.deleteMany({});
    await Faculty.deleteMany({});
    await Department.deleteMany({});
    await Subject.deleteMany({});
    await Timetable.deleteMany({});
    await LeaveRequest.deleteMany({});
    await Attendance.deleteMany({});
    await Settings.deleteMany({});
    await AuditLog.deleteMany({});

    console.log('Database cleared. Seeding settings...');
    
    // Seed Settings
    const defaultSettings = new Settings({
      theme: 'dark',
      minAttendance: 75,
      totalSemClasses: 90,
      campusLocation: {
        lat: 12.9716, // Bangalore default
        lng: 77.5946,
        radius: 100 // 100 meters
      }
    });
    await defaultSettings.save();

    console.log('Seeding profiles...');

    // 1. Seed Faculty - HOD CSE
    const hodFaculty = new Faculty({
      name: 'Dr. Alan Turing',
      employeeId: 'EMP-CSE-001',
      department: 'CSE',
      mobile: '9876543210',
      email: 'hod@college.edu'
    });
    await hodFaculty.save();

    // 2. Seed Faculty - Professor
    const profFaculty = new Faculty({
      name: 'Dr. Jane Doe',
      employeeId: 'EMP-CSE-002',
      department: 'CSE',
      mobile: '9876543211',
      email: 'faculty@college.edu'
    });
    await profFaculty.save();

    // 3. Seed Students
    const student1 = new Student({
      name: 'Alice Smith',
      rollNumber: 'CSE-2023-001',
      registrationNumber: 'REG-2023-1001',
      branch: 'CSE',
      department: 'CSE',
      section: 'A',
      year: '3rd Year',
      semester: '5th Sem',
      mobile: '9876543220',
      email: 'student@college.edu',
      gender: 'Female',
      bloodGroup: 'O+',
      address: '123 Main St, Bangalore, India',
      parentName: 'Robert Smith',
      parentContact: '9876543221',
      photoUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
      faceDescriptor: '[0.1, -0.2, 0.5, 0.9, -0.15]'
    });
    await student1.save();

    const student2 = new Student({
      name: 'Bob Johnson',
      rollNumber: 'CSE-2023-002',
      registrationNumber: 'REG-2023-1002',
      branch: 'CSE',
      department: 'CSE',
      section: 'A',
      year: '3rd Year',
      semester: '5th Sem',
      mobile: '9876543230',
      email: 'bob@college.edu',
      gender: 'Male',
      bloodGroup: 'A+',
      address: '456 Oak Ave, Bangalore, India',
      parentName: 'Jack Johnson',
      parentContact: '9876543231',
      photoUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
      faceDescriptor: '[0.12, -0.22, 0.48, 0.91, -0.12]'
    });
    await student2.save();

    console.log('Profiles created. Seeding users with hashed passwords...');

    // 4. Seed Users for all 6 Roles
    // Pre-save hook hashes password, so we supply cleartext 'admin123'
    const users = [
      {
        name: 'Super Admin Principal',
        email: 'superadmin@college.edu',
        password: 'admin123',
        role: 'superadmin',
        associatedId: null
      },
      {
        name: 'Admin Registrar',
        email: 'admin@college.edu',
        password: 'admin123',
        role: 'admin',
        associatedId: null
      },
      {
        name: 'Dr. Alan Turing',
        email: 'hod@college.edu',
        password: 'admin123',
        role: 'hod',
        associatedId: hodFaculty._id
      },
      {
        name: 'Dr. Jane Doe',
        email: 'faculty@college.edu',
        password: 'admin123',
        role: 'faculty',
        associatedId: profFaculty._id
      },
      {
        name: 'Alice Smith',
        email: 'student@college.edu',
        password: 'admin123',
        role: 'student',
        associatedId: student1._id
      },
      {
        name: 'Robert Smith',
        email: 'parent@college.edu',
        password: 'admin123',
        role: 'parent',
        associatedId: student1._id // Parent is associated with student profile
      }
    ];

    const userDocs = {};
    for (const u of users) {
      const newUser = new User(u);
      await newUser.save();
      userDocs[u.role] = newUser;
    }

    console.log('Users created. Seeding departments & subjects...');

    // 5. Seed Departments
    const deptCSE = new Department({
      name: 'Computer Science & Engineering',
      code: 'CSE',
      hodId: hodFaculty._id
    });
    await deptCSE.save();

    // 6. Seed Subjects
    const subAI = new Subject({
      name: 'Artificial Intelligence',
      code: 'CS-501',
      department: 'CSE',
      facultyIds: [profFaculty._id, hodFaculty._id]
    });
    await subAI.save();

    const subDBMS = new Subject({
      name: 'Database Management Systems',
      code: 'CS-502',
      department: 'CSE',
      facultyIds: [profFaculty._id]
    });
    await subDBMS.save();

    console.log('Subjects seeded. Seeding Timetable...');

    // 7. Seed Timetable
    const monTimetable = new Timetable({
      department: 'CSE',
      branch: 'CSE',
      year: '3rd Year',
      section: 'A',
      semester: '5th Sem',
      day: 'Monday',
      slots: [
        {
          startTime: '09:00',
          endTime: '10:00',
          subjectId: subAI._id,
          teacherId: userDocs['faculty']._id,
          room: 'Lab-4'
        },
        {
          startTime: '10:00',
          endTime: '11:00',
          subjectId: subDBMS._id,
          teacherId: userDocs['faculty']._id,
          room: 'Room-302'
        }
      ]
    });
    await monTimetable.save();

    const wedTimetable = new Timetable({
      department: 'CSE',
      branch: 'CSE',
      year: '3rd Year',
      section: 'A',
      semester: '5th Sem',
      day: 'Wednesday',
      slots: [
        {
          startTime: '11:15',
          endTime: '12:15',
          subjectId: subAI._id,
          teacherId: userDocs['faculty']._id,
          room: 'Lab-4'
        }
      ]
    });
    await wedTimetable.save();

    console.log('Timetable seeded. Seeding historical Attendance logs...');

    // 8. Seed Attendance Logs
    // Create attendance logs for student1 and student2 for the last 5 days
    const dates = [];
    for (let i = 1; i <= 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    // Alice has good attendance
    for (const date of dates) {
      await new Attendance({
        studentId: student1._id,
        subjectId: subAI._id,
        date,
        status: 'Present',
        location: { lat: 12.9715, lng: 77.5947 }, // On campus
        verifiedBy: 'QR',
        teacherId: profFaculty._id
      }).save();
    }

    // Bob has low attendance (only 2 out of 5 present)
    for (let i = 0; i < dates.length; i++) {
      const status = i < 2 ? 'Present' : 'Absent';
      await new Attendance({
        studentId: student2._id,
        subjectId: subAI._id,
        date: dates[i],
        status,
        location: status === 'Present' ? { lat: 12.9716, lng: 77.5946 } : null,
        verifiedBy: status === 'Present' ? 'Face' : 'Manual',
        teacherId: profFaculty._id
      }).save();
    }

    console.log('Seeding Leave Requests...');

    // 9. Seed Leave Request
    const leave = new LeaveRequest({
      studentId: student1._id,
      leaveType: 'Medical',
      startDate: new Date(),
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days later
      reason: 'Suffering from seasonal fever, advised bed rest.',
      attachmentUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
      status: 'Pending'
    });
    await leave.save();

    console.log('Leave request seeded. Seeding complete audit log trace...');

    // 10. Audit log
    await new AuditLog({
      action: 'SYSTEM_SEED',
      details: 'Populated full-stack demonstration mock data'
    }).save();

    console.log('DATABASE SEEDED SUCCESSFULLY!');
    if (require.main === module) {
      process.exit(0);
    }
  } catch (err) {
    console.error('Failed to seed database:', err);
    if (require.main === module) {
      process.exit(1);
    }
  }
};

// Start seeding only if run directly
if (require.main === module) {
  setTimeout(() => {
    seedDatabase();
  }, 2000); // Allow mongoose connection to establish
}

module.exports = seedDatabase;
