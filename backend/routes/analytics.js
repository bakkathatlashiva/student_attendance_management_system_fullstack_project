const express = require('express');
const Student = require('../models/student');
const Attendance = require('../models/attendance');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// Role Authorization Middleware
const authorizedRole = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.role !== 'faculty' && req.user.role !== 'superadmin' && req.user.role !== 'hod') {
    return res.status(403).json({ msg: 'Access denied: Insufficient privileges' });
  }
  next();
};

// GET /api/analytics/dashboard - Fetch metrics for administrative dashboard
router.get('/dashboard', auth, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Total Students count
    const totalStudents = await Student.countDocuments();

    // 2. Attendance count today
    const presentToday = await Attendance.countDocuments({ date: todayStr, status: 'Present' });
    const absentToday = await Attendance.countDocuments({ date: todayStr, status: 'Absent' });

    // 3. Overall attendance stats
    const totalRecords = await Attendance.countDocuments();
    const totalPresent = await Attendance.countDocuments({ status: 'Present' });
    const overallPercentage = totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;

    // 4. Group records by Student ID to find individuals below 75%
    const studentAggregates = await Attendance.aggregate([
      {
        $group: {
          _id: '$studentId',
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } }
        }
      },
      {
        $project: {
          total: 1,
          present: 1,
          percentage: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$present', '$total'] }, 100] },
              100
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' }
    ]);

    const allStudents = await Student.find();
    const studentStatsMap = {};
    allStudents.forEach(s => {
      studentStatsMap[s._id.toString()] = {
        student: s,
        total: 0,
        present: 0,
        absent: 0,
        percentage: 100
      };
    });

    studentAggregates.forEach(agg => {
      const sid = agg._id.toString();
      if (studentStatsMap[sid]) {
        studentStatsMap[sid].total = agg.total;
        studentStatsMap[sid].present = agg.present;
        studentStatsMap[sid].absent = agg.total - agg.present;
        studentStatsMap[sid].percentage = agg.percentage;
      }
    });

    const studentStatsList = Object.values(studentStatsMap);
    const below75 = studentStatsList.filter(s => s.total > 0 && s.percentage < 75);
    const leaderboard = studentStatsList
      .filter(s => s.total > 0)
      .sort((a, b) => b.percentage - a.percentage || b.present - a.present)
      .slice(0, 5);

    // 5. Monthly Attendance Trends (last 6 months)
    const monthlyStats = await Attendance.aggregate([
      {
        $project: {
          month: { $substr: ['$date', 0, 7] }, // YYYY-MM
          status: 1
        }
      },
      {
        $group: {
          _id: '$month',
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthlyData = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const found = monthlyStats.find(m => m._id === key);
      
      const total = found ? found.total : 0;
      const present = found ? found.present : 0;
      const percentage = total > 0 ? (present / total) * 100 : 0;

      monthlyData.push({
        key,
        label: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`,
        percentage: parseFloat(percentage.toFixed(1)),
        total,
        present,
        absent: total - present
      });
    }

    // 6. Recent Activities
    const recentActivities = await Attendance.find()
      .populate('studentId', 'name rollNumber branch section')
      .populate('teacherId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      totalStudents,
      presentToday,
      absentToday,
      overallPercentage: parseFloat(overallPercentage.toFixed(1)),
      studentsBelow75Count: below75.length,
      studentsBelow75: below75.map(item => ({
        id: item.student._id,
        name: item.student.name,
        rollNumber: item.student.rollNumber,
        branch: item.student.branch,
        section: item.student.section,
        year: item.student.year,
        present: item.present,
        total: item.total,
        percentage: parseFloat(item.percentage.toFixed(1))
      })),
      leaderboard: leaderboard.map(item => ({
        id: item.student._id,
        name: item.student.name,
        rollNumber: item.student.rollNumber,
        branch: item.student.branch,
        section: item.student.section,
        percentage: parseFloat(item.percentage.toFixed(1))
      })),
      monthlyTrends: monthlyData,
      recentActivities
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/reports - Branch-wise, section-wise stats, etc.
router.get('/reports', auth, async (req, res) => {
  try {
    const { branch, section, year } = req.query;

    const studentFilter = {};
    if (branch) studentFilter.branch = branch;
    if (section) studentFilter.section = section;
    if (year) studentFilter.year = year;

    const students = await Student.find(studentFilter);
    const studentIds = students.map(s => s._id);

    const attendanceLogs = await Attendance.find({ studentId: { $in: studentIds } });

    const branchStats = {};
    const branchesList = ['CSE', 'IT', 'AIML', 'Data Science', 'Cyber Security'];
    branchesList.forEach(b => {
      branchStats[b] = { present: 0, total: 0, percentage: 0 };
    });

    const sectionStats = {};

    students.forEach(s => {
      const records = attendanceLogs.filter(a => a.studentId.toString() === s._id.toString());
      const total = records.length;
      const present = records.filter(a => a.status === 'Present').length;
      
      if (branchStats[s.branch]) {
        branchStats[s.branch].total += total;
        branchStats[s.branch].present += present;
      }

      const secKey = `${s.branch}-${s.section}`;
      if (!sectionStats[secKey]) {
        sectionStats[secKey] = { present: 0, total: 0, name: secKey };
      }
      sectionStats[secKey].total += total;
      sectionStats[secKey].present += present;
    });

    Object.keys(branchStats).forEach(key => {
      const item = branchStats[key];
      item.percentage = item.total > 0 ? parseFloat(((item.present / item.total) * 100).toFixed(1)) : 100;
    });

    Object.keys(sectionStats).forEach(key => {
      const item = sectionStats[key];
      item.percentage = item.total > 0 ? parseFloat(((item.present / item.total) * 100).toFixed(1)) : 100;
    });

    const studentReports = students.map(s => {
      const records = attendanceLogs.filter(a => a.studentId.toString() === s._id.toString());
      const total = records.length;
      const present = records.filter(a => a.status === 'Present').length;
      const percentage = total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 100;

      return {
        id: s._id,
        name: s.name,
        rollNumber: s.rollNumber,
        branch: s.branch,
        section: s.section,
        year: s.year,
        present,
        total,
        percentage
      };
    });

    res.json({
      branchStats: Object.keys(branchStats).map(name => ({ name, ...branchStats[name] })),
      sectionStats: Object.values(sectionStats),
      studentReports
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/heatmap - Fetch GitHub-style attendance calendar patterns
router.get('/heatmap', auth, async (req, res) => {
  try {
    const dailyLogs = await Attendance.aggregate([
      {
        $group: {
          _id: '$date',
          count: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const formattedData = dailyLogs.map(item => ({
      date: item._id,
      count: item.count
    }));

    res.json(formattedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/achievements/:studentId - Calculate active achievements / badges
router.get('/achievements/:studentId', auth, async (req, res) => {
  try {
    const logs = await Attendance.find({ studentId: req.params.studentId });
    const present = logs.filter(l => l.status === 'Present').length;
    const total = logs.length;
    const rate = total > 0 ? (present / total) * 100 : 0;

    const badges = [];
    if (total >= 5) {
      if (rate === 100) {
        badges.push({ title: '100% Attendance', icon: '🏆', description: 'Maintained flawless attendance in all classes.' });
      }
      if (rate >= 95) {
        badges.push({ title: 'Attendance Champion', icon: '🥇', description: 'Achieved outstanding attendance score (>95%).' });
      }
      if (rate >= 85) {
        badges.push({ title: 'Consistent Performer', icon: '⭐', description: 'Remained steady and regular in classes (>85%).' });
      }
      if (rate >= 75) {
        badges.push({ title: 'Semester Star', icon: '🎯', description: 'Remained fully compliant with board rules (>75%).' });
      }
    } else {
      // Seed default badge for new student
      badges.push({ title: 'Consistent Performer', icon: '⭐', description: 'Ready to build consistency.' });
    }

    res.json({
      present,
      total,
      percentage: rate.toFixed(1),
      badges
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/leaderboard - Top Sections, Branches, Departments
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const students = await Student.find();
    const logs = await Attendance.find();

    const branchSummary = {};
    const sectionSummary = {};
    const departmentSummary = {};

    students.forEach(s => {
      const records = logs.filter(l => l.studentId.toString() === s._id.toString());
      const total = records.length;
      const present = records.filter(l => l.status === 'Present').length;

      // Branch
      if (!branchSummary[s.branch]) branchSummary[s.branch] = { present: 0, total: 0 };
      branchSummary[s.branch].total += total;
      branchSummary[s.branch].present += present;

      // Section
      const secKey = `${s.branch} - Sec ${s.section}`;
      if (!sectionSummary[secKey]) sectionSummary[secKey] = { present: 0, total: 0 };
      sectionSummary[secKey].total += total;
      sectionSummary[secKey].present += present;

      // Department
      if (!departmentSummary[s.department]) departmentSummary[s.department] = { present: 0, total: 0 };
      departmentSummary[s.department].total += total;
      departmentSummary[s.department].present += present;
    });

    const formatObj = (obj) => {
      return Object.keys(obj).map(name => {
        const item = obj[name];
        const pct = item.total > 0 ? (item.present / item.total) * 100 : 100;
        return { name, percentage: parseFloat(pct.toFixed(1)), total: item.total };
      }).sort((a,b) => b.percentage - a.percentage);
    };

    res.json({
      topBranches: formatObj(branchSummary).slice(0, 5),
      topSections: formatObj(sectionSummary).slice(0, 5),
      topDepartments: formatObj(departmentSummary).slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
