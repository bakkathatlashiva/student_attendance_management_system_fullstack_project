import { createContext, useState, useEffect, useContext } from 'react';
import { studentAPI, attendanceAPI, aiAPI } from '../services/api';
import { AuthContext } from './AuthContext';

export const AttendanceContext = createContext();

export const AttendanceProvider = ({ children }) => {
  const { token } = useContext(AuthContext);

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [settings, setSettings] = useState({
    theme: localStorage.getItem('theme') || 'dark',
    minAttendance: 75,
    totalSemClasses: 90
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync theme setting with document element
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', settings.theme);
  }, [settings.theme]);

  // Load students and attendance records from server when authenticated
  useEffect(() => {
    if (token) {
      fetchData();
    } else {
      setStudents([]);
      setAttendance([]);
    }
  }, [token]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const studentData = await studentAPI.list();
      setStudents(studentData.students || []);

      const attendanceData = await attendanceAPI.list();
      // Transform backend attendance schema to frontend structure:
      // studentId in backend is populated object or raw id. Let's normalize it to studentId
      const normalizedAttendance = attendanceData.map(log => ({
        id: log._id,
        studentId: log.studentId?._id || log.studentId,
        date: log.date,
        status: log.status,
        teacherId: log.teacherId
      }));
      setAttendance(normalizedAttendance);
    } catch (err) {
      console.error('Failed to fetch attendance data:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Add student to backend
  const addStudent = async (studentData) => {
    try {
      const newStudent = await studentAPI.create({
        name: studentData.name,
        rollNumber: studentData.rollNumber,
        branch: studentData.branch,
        section: studentData.section,
        year: studentData.year,
        mobile: studentData.mobile || '9999999999', // Default fallback
        email: studentData.email || `${studentData.rollNumber}@college.edu`, // Default fallback
        gender: studentData.gender || 'Male' // Default fallback
      });
      setStudents(prev => [newStudent, ...prev]);
      return newStudent;
    } catch (err) {
      const errorMsg = err.response?.data?.msg || 'Failed to add student.';
      throw new Error(errorMsg);
    }
  };

  // Edit student on backend
  const updateStudent = async (id, updatedData) => {
    try {
      const updated = await studentAPI.update(id, {
        name: updatedData.name,
        rollNumber: updatedData.rollNumber,
        branch: updatedData.branch,
        section: updatedData.section,
        year: updatedData.year,
        mobile: updatedData.mobile,
        email: updatedData.email,
        gender: updatedData.gender
      });
      setStudents(prev => prev.map(s => (s._id === id ? updated : s)));
      return updated;
    } catch (err) {
      const errorMsg = err.response?.data?.msg || 'Failed to update student.';
      throw new Error(errorMsg);
    }
  };

  // Delete student and cascade deletes from state
  const deleteStudent = async (id) => {
    try {
      await studentAPI.delete(id);
      setStudents(prev => prev.filter(s => s._id !== id));
      setAttendance(prev => prev.filter(r => r.studentId !== id));
    } catch (err) {
      const errorMsg = err.response?.data?.msg || 'Failed to delete student.';
      throw new Error(errorMsg);
    }
  };

  // Save/Update individual attendance record
  const markAttendance = async (studentId, date, status) => {
    try {
      const res = await attendanceAPI.mark(studentId, status, date);
      // Reload logs to sync updated references
      await fetchLogs();
    } catch (err) {
      console.error('Failed to mark attendance:', err.message);
      throw err;
    }
  };

  // Bulk save attendance records
  const bulkMarkAttendance = async (studentIds, date, status) => {
    try {
      await attendanceAPI.bulkMark(studentIds, status, date);
      await fetchLogs();
    } catch (err) {
      console.error('Failed to bulk mark attendance:', err.message);
      throw err;
    }
  };

  // Clear attendance records for date
  const clearAttendanceForDate = async (date, studentIds = []) => {
    try {
      // Find matching attendance logs
      const logsToClear = attendance.filter(
        r => r.date === date && (studentIds.length === 0 || studentIds.includes(r.studentId))
      );

      // Delete each match
      await Promise.all(logsToClear.map(log => attendanceAPI.delete(log.id)));
      await fetchLogs();
    } catch (err) {
      console.error('Failed to clear attendance:', err.message);
      throw err;
    }
  };

  const fetchLogs = async () => {
    try {
      const attendanceData = await attendanceAPI.list();
      const normalized = attendanceData.map(log => ({
        id: log._id,
        studentId: log.studentId?._id || log.studentId,
        date: log.date,
        status: log.status,
        teacherId: log.teacherId
      }));
      setAttendance(normalized);
    } catch (err) {
      console.error('Failed to sync attendance logs:', err.message);
    }
  };

  // Update configurations settings locally
  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Theme toggle helper
  const toggleTheme = () => {
    setSettings(prev => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark'
    }));
  };

  // Export full backup details
  const getBackupData = () => {
    return {
      students,
      attendance,
      settings
    };
  };

  // Restore database tables via sequential sync
  const restoreBackupData = async (backupObj) => {
    try {
      const { students: backupStudents, attendance: backupLogs } = backupObj;

      if (!Array.isArray(backupStudents) || !Array.isArray(backupLogs)) {
        throw new Error('Invalid backup schema layout.');
      }

      // Re-populate Student collections
      for (const s of backupStudents) {
        try {
          await studentAPI.create({
            name: s.name,
            rollNumber: s.rollNumber,
            branch: s.branch,
            section: s.section,
            year: s.year,
            mobile: s.mobile || '9999999999',
            email: s.email || `${s.rollNumber}@college.edu`,
            gender: s.gender || 'Male'
          });
        } catch (e) {
          // If already exists, ignore and continue
          console.warn(`Student import skipped: ${s.name}`, e.message);
        }
      }

      // Re-populate Attendance logs
      const allNewStudents = await studentAPI.list();
      const studentMap = {};
      allNewStudents.students.forEach(s => {
        studentMap[s.rollNumber] = s._id;
      });

      // Find roll numbers from backup students to match them
      for (const l of backupLogs) {
        const matchingBackupStudent = backupStudents.find(s => s.id === l.studentId || s._id === l.studentId);
        if (matchingBackupStudent) {
          const newId = studentMap[matchingBackupStudent.rollNumber];
          if (newId) {
            try {
              await attendanceAPI.mark(newId, l.status, l.date);
            } catch (e) {
              console.warn(`Log import skipped for date ${l.date}`, e.message);
            }
          }
        }
      }

      await fetchData();
      return true;
    } catch (err) {
      console.error('Backup restoration failed:', err);
      throw err;
    }
  };

  return (
    <AttendanceContext.Provider
      value={{
        students,
        attendance,
        settings,
        isLoading,
        addStudent,
        updateStudent,
        deleteStudent,
        markAttendance,
        bulkMarkAttendance,
        clearAttendanceForDate,
        updateSettings,
        toggleTheme,
        getBackupData,
        restoreBackupData,
        refreshData: fetchData
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};
