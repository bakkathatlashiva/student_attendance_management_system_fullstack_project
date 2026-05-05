CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'student'
);

ALTER TABLE students ADD COLUMN phone VARCHAR(15);

CREATE TABLE attendance (
  id INTEGER PRIMARY KEY,
  student_id INTEGER,
  date TEXT, 
  status VARCHAR(10)
);

INSERT INTO students (name, role) VALUES ('Admin', 'faculty'), ('John', 'student');
INSERT INTO attendance (student_id, date, status) VALUES (2, '2026-05-01', 'Present');

UPDATE students SET phone = '123' WHERE id = 1;
DELETE FROM students WHERE id = 99;

SELECT CAST(id AS TEXT) as txt_id, name, (id * 10) as calc 
FROM students 
WHERE role = 'student' OR name LIKE 'J%'
ORDER BY name ASC LIMIT 10 OFFSET 0;

SELECT student_id, strftime('%Y-%m', date) as month, COUNT(*) as count 
FROM attendance 
WHERE date BETWEEN '2026-01-01' AND '2026-12-31'
GROUP BY student_id, month 
HAVING count > 0;

SELECT name, CASE WHEN role='faculty' THEN 'Staff' ELSE 'Student' END as type 
FROM students;

SELECT s.name, a.status 
FROM students s 
LEFT JOIN attendance a ON s.id = a.student_id;

CREATE VIEW attendance_view AS 
SELECT s.name, a.status 
FROM students s 
JOIN attendance a ON s.id = a.student_id;

SELECT name FROM students 
WHERE id IN (SELECT student_id FROM attendance);

CREATE INDEX idx_role ON students(role);
