import React from 'react';
import '../styles.css';

export default function AttendanceStats({ students = [], records = [] }) {
  const stats = students.map((student) => {
    const present = records.filter((r) => {
      const rid = r.student_id != null ? String(r.student_id) : '';
      const matches = rid === String(student.id) || rid === String(student.student_id);
      const status = (r.status || '').toLowerCase();
      return matches && status === 'present';
    }).length;

    const absent = records.filter((r) => {
      const rid = r.student_id != null ? String(r.student_id) : '';
      const matches = rid === String(student.id) || rid === String(student.student_id);
      const status = (r.status || '').toLowerCase();
      return matches && status === 'absent';
    }).length;

    const total = present + absent;
    const percentage = total === 0 ? 0 : (present / total) * 100;

    return { ...student, present, absent, total, percentage };
  });

  return (
    <div className="attendance-stats">
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Student ID</th>
              <th>Total Classes</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Percentage</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-state">No students yet.</td>
              </tr>
            ) : (
              stats.map((student, index) => {
                const formattedPercentage = student.total === 0 ? 'N/A' : `${student.percentage.toFixed(1)}%`;
                const isLowAttendance = student.total > 0 && student.percentage < 75;
                return (
                  <tr key={student.id || index}>
                    <td style={{ fontWeight: 'bold' }}>{student.name}</td>
                    <td>{student.student_id || '-'}</td>
                    <td>{student.total}</td>
                    <td>{student.present}</td>
                    <td>{student.absent}</td>
                    <td style={{ fontWeight: 'bold' }}>{formattedPercentage}</td>
                    <td>
                      {student.total === 0 ? (
                        <span className="status-badge" style={{ backgroundColor: '#475569', color: '#cbd5e1' }}>No Classes</span>
                      ) : isLowAttendance ? (
                        <span className="status-badge absent">Low Attendance</span>
                      ) : (
                        <span className="status-badge present">Good</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
