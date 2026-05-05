const express = require("express");
const db = require("../db");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// Faculty Routes Middleware
const facultyOnly = (req, res, next) => {
  if (req.user.role !== 'faculty') return res.status(403).json({ msg: "Access denied" });
  next();
};

// Mark attendance (Faculty Only)
router.post("/mark", auth, facultyOnly, (req, res) => {
  const { student_id, status, date } = req.body;
  const targetDate = date || new Date().toISOString().split('T')[0];

  if (!student_id || !status) {
    return res.status(400).json({ msg: "Missing student_id or status" });
  }

  // Check if attendance is already marked for the date
  db.query(
    "SELECT * FROM attendance WHERE student_id=? AND date=?",
    [student_id, targetDate],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length > 0) {
        // Update existing attendance
        db.query(
          "UPDATE attendance SET status=? WHERE student_id=? AND date=?",
          [status, student_id, targetDate],
          () => res.json({ msg: "Attendance updated" })
        );
      } else {
        // Insert new attendance
        db.query(
          "INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?)",
          [student_id, targetDate, status],
          () => res.json({ msg: "Attendance marked" })
        );
      }
    }
  );
});

// Get all students (Faculty Only)
router.get("/students", auth, facultyOnly, (req, res) => {
  db.query(
    "SELECT id, name, student_id FROM students WHERE role='student'",
    (err, data) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(data);
    }
  );
});

// Get all attendance records (Faculty)
router.get("/all", auth, facultyOnly, (req, res) => {
  const { date } = req.query;
  let query = "SELECT a.*, s.name, s.student_id FROM attendance a JOIN students s ON a.student_id = s.id";
  let params = [];
  if (date) {
    query += " WHERE a.date=?";
    params.push(date);
  }
  query += " ORDER BY a.date DESC";

  db.query(query, params, (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(data);
  });
});

// Get absentees (Faculty)
router.get("/absentees", auth, facultyOnly, (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  db.query(
    "SELECT a.*, s.name, s.student_id FROM attendance a JOIN students s ON a.student_id = s.id WHERE a.date=? AND a.status='Absent'",
    [date],
    (err, data) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(data);
    }
  );
});

// Get student's own attendance (Student)
router.get("/", auth, (req, res) => {
  db.query(
    "SELECT * FROM attendance WHERE student_id=? ORDER BY date DESC",
    [req.user.id],
    (err, data) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(data);
    }
  );
});

// Get student's attendance stats (Student)
router.get("/stats", auth, (req, res) => {
  db.query(
    "SELECT COUNT(*) as total, SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END) as present FROM attendance WHERE student_id=?",
    [req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      const stats = result[0];
      const percentage = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
      res.json({ total: stats.total, present: stats.present, percentage: percentage.toFixed(2) });
    }
  );
});

// Get attendance stats per student (Faculty)
router.get("/stats/all", auth, facultyOnly, (req, res) => {
  const { date, from, to } = req.query;
  let joinCond = "ON a.student_id = s.id";
  const params = [];

  if (from && to) {
    joinCond = "ON a.student_id = s.id AND a.date BETWEEN ? AND ?";
    params.push(from, to);
  } else if (date) {
    joinCond = "ON a.student_id = s.id AND a.date = ?";
    params.push(date);
  }

  const sql = `SELECT
    s.id,
    s.name,
    s.student_id,
    COALESCE(SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END), 0) AS present,
    COALESCE(SUM(CASE WHEN a.status='Absent' THEN 1 ELSE 0 END), 0) AS absent,
    COALESCE(COUNT(a.id), 0) AS total,
    CASE WHEN COUNT(a.id)=0 THEN 0
         ELSE ROUND((SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END) * 100.0) / COUNT(a.id), 2)
    END AS percentage
  FROM students s
  LEFT JOIN attendance a ${joinCond}
  WHERE s.role = 'student'
  GROUP BY s.id, s.name, s.student_id
  ORDER BY percentage DESC`;

  db.query(sql, params, (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(data);
  });
});

module.exports = router;
