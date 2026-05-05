const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'attendance.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Initialize tables
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        student_id TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'student'
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        date TEXT,
        status TEXT,
        FOREIGN KEY (student_id) REFERENCES students(id)
      )`);

      // Insert dummy data if empty
      db.get("SELECT COUNT(*) as count FROM students", (err, row) => {
        if (row && row.count === 0) {
          db.run(`INSERT INTO students (name, student_id, email, password, role) VALUES ('Admin Faculty', NULL, 'faculty@gmail.com', 'password', 'faculty')`);
          db.run(`INSERT INTO students (name, student_id, email, password, role) VALUES ('John Doe', 'S001', NULL, 'password', 'student')`);
        }
      });
    });
  }
});

// Wrapper to mimic mysql2's connection.query signature
module.exports = {
  query: (sql, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    const sqlUpper = sql.toUpperCase().trim();
    const isSelect = sqlUpper.startsWith('SELECT');

    if (isSelect) {
      db.all(sql, params, (err, rows) => {
        callback(err, rows);
      });
    } else {
      db.run(sql, params, function(err) {
        if (err) {
          return callback(err, null);
        }
        callback(null, { insertId: this.lastID, affectedRows: this.changes });
      });
    }
  }
};
