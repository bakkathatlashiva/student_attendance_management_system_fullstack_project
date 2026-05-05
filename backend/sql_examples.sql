-- SQL examples for attendance_system (SQLite)
-- File: backend/sql_examples.sql
-- Usage: run in sqlite3 or use with the project's db.query(sql, params, cb)
-- Use `?` placeholders for parameters when calling from the backend.

-- =====================================================
-- 1) List all students (student role)
-- =====================================================
-- params: none
SELECT id, name, student_id
FROM students
WHERE role = 'student'
ORDER BY name;

-- =====================================================
-- 2) Attendance per student (present, absent, total, percentage)
-- =====================================================
-- params: none (aggregates across all dates)
SELECT
  s.id,
  s.name,
  s.student_id,
  COALESCE(SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END), 0) AS present,
  COALESCE(SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END), 0) AS absent,
  COALESCE(COUNT(a.id), 0) AS total,
  CASE WHEN COUNT(a.id) = 0 THEN 0
       ELSE ROUND((SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) * 100.0) / COUNT(a.id), 2)
  END AS percentage
FROM students s
LEFT JOIN attendance a ON a.student_id = s.id
WHERE s.role = 'student'
GROUP BY s.id, s.name, s.student_id
ORDER BY percentage DESC;

-- =====================================================
-- 3) Attendance per student for a specific date
-- =====================================================
-- params: ? -> date (YYYY-MM-DD)
SELECT
  s.id,
  s.name,
  s.student_id,
  SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
  SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent,
  COUNT(a.id) AS total,
  CASE WHEN COUNT(a.id)=0 THEN 0
       ELSE ROUND((SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END) * 100.0) / COUNT(a.id), 2)
  END AS percentage
FROM students s
LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ?
WHERE s.role = 'student'
GROUP BY s.id
ORDER BY percentage DESC;

-- =====================================================
-- 4) Students with low attendance (< 75%) overall
-- =====================================================
-- params: none
SELECT
  s.id,
  s.name,
  s.student_id,
  ROUND((SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END) * 100.0) / COUNT(a.id), 2) AS percentage,
  COUNT(a.id) AS total
FROM students s
JOIN attendance a ON a.student_id = s.id
WHERE s.role = 'student'
GROUP BY s.id
HAVING COUNT(a.id) > 0
   AND (SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END) * 100.0) / COUNT(a.id) < 75
ORDER BY percentage ASC;

-- =====================================================
-- 5) Absentees on a specific date
-- =====================================================
-- params: ? -> date (YYYY-MM-DD)
SELECT s.id, s.name, s.student_id
FROM attendance a
JOIN students s ON a.student_id = s.id
WHERE a.date = ? AND a.status = 'Absent'
ORDER BY s.name;

-- =====================================================
-- 6) Absent counts per date (useful for dashboard)
-- =====================================================
-- params: none
SELECT date, COUNT(*) AS absent_count
FROM attendance
WHERE status = 'Absent'
GROUP BY date
ORDER BY date DESC;

-- =====================================================
-- 7) All attendance records for a student
-- =====================================================
-- params: ? -> student_id (students.id)
SELECT date, status
FROM attendance
WHERE student_id = ?
ORDER BY date DESC;

-- =====================================================
-- 8) Upsert attendance (requires UNIQUE(student_id,date))
-- =====================================================
-- Create (example) table with uniqueness (if you want to enforce upsert capability):
--
-- CREATE TABLE IF NOT EXISTS attendance (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   student_id INTEGER,
--   date TEXT,
--   status TEXT,
--   UNIQUE(student_id, date),
--   FOREIGN KEY(student_id) REFERENCES students(id)
-- );
--
-- Upsert example (params: ?, ?, ? => student_id, date, status):
INSERT INTO attendance (student_id, date, status)
VALUES (?, ?, ?)
ON CONFLICT(student_id, date) DO UPDATE SET status = excluded.status;

-- =====================================================
-- 9) Monthly attendance summary for a student
-- =====================================================
-- params: ? -> student_id
SELECT
  substr(date,1,7) AS month,
  SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END) AS present,
  COUNT(*) AS total,
  ROUND((SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2) AS percentage
FROM attendance
WHERE student_id = ?
GROUP BY month
ORDER BY month DESC;

-- =====================================================
-- 10) Students who never have attendance records
-- =====================================================
-- params: none
SELECT s.id, s.name, s.student_id
FROM students s
LEFT JOIN attendance a ON a.student_id = s.id
WHERE a.id IS NULL AND s.role = 'student'
ORDER BY s.name;

-- =====================================================
-- 11) Top N students by attendance percentage
-- =====================================================
-- params: ? -> limit (use integer substitution in the calling code)
SELECT
  s.id, s.name, s.student_id,
  ROUND((SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END) * 100.0) / COUNT(a.id), 2) AS percentage
FROM students s
LEFT JOIN attendance a ON a.student_id = s.id
WHERE s.role = 'student'
GROUP BY s.id
HAVING COUNT(a.id) > 0
ORDER BY percentage DESC
LIMIT ?;

-- =====================================================
-- End of file
-- Edit / extend these queries as needed for your UI or reporting.
