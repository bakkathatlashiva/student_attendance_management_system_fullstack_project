const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();
const SECRET = "secretkey";

router.post("/login", (req, res) => {
  const { email, password, role } = req.body;

  db.query(
    "SELECT * FROM students WHERE email=? AND password=? AND role=?",
    [email, password, role],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.length > 0) {
        const user = result[0];
        const token = jwt.sign(
          { id: user.id, role: user.role, name: user.name },
          SECRET,
          { expiresIn: '1d' }
        );
        res.json({ token, user: { id: user.id, email: user.email, student_id: user.student_id, name: user.name, role: user.role } });
      } else {
        res.status(401).json({ msg: "Invalid credentials" });
      }
    }
  );
});

router.post("/signup", (req, res) => {
  const { name, student_id, email, password, role } = req.body;

  if (!name || (!student_id && !email) || !password || !role) {
    return res.status(400).json({ msg: "All fields are required." });
  }

  db.query(
    "INSERT INTO students (name, student_id, email, password, role) VALUES (?, ?, ?, ?, ?)",
    [name, student_id, email, password, role],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      // Auto login after signup
      const insertId = result.insertId || Date.now(); // fallback for mock db
      const token = jwt.sign(
        { id: insertId, role, name },
        SECRET,
        { expiresIn: '1d' }
      );
      res.json({ token, user: { id: insertId, student_id, email, name, role } });
    }
  );
});

module.exports = router;
