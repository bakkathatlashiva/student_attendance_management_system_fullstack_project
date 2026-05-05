const express = require("express");
const db = require("../db");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// Faculty Routes Middleware
const facultyOnly = (req, res, next) => {
  if (req.user.role !== 'faculty') return res.status(403).json({ msg: "Access denied" });
  next();
};

// Update student (Faculty Only)
router.put("/:id", auth, facultyOnly, (req, res) => {
  const studentId = req.params.id;
  const { name, student_id } = req.body;

  if (!name || !student_id) {
    return res.status(400).json({ msg: "Name and Student ID are required" });
  }

  db.query(
    "UPDATE students SET name=?, student_id=? WHERE id=? AND role='student'",
    [name, student_id, studentId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ msg: "Student updated successfully" });
    }
  );
});

// Delete student (Faculty Only)
router.delete("/:id", auth, facultyOnly, (req, res) => {
  const studentId = req.params.id;

  // First delete their attendance records (foreign key constraint usually handles this, but we'll be explicit or assume mock db needs it)
  db.query(
    "DELETE FROM attendance WHERE student_id=?",
    [studentId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Then delete the student
      db.query(
        "DELETE FROM students WHERE id=? AND role='student'",
        [studentId],
        (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ msg: "Student deleted successfully" });
        }
      );
    }
  );
});

module.exports = router;
