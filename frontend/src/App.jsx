import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import StudentList from "./pages/StudentList";
import MarkAttendance from "./pages/MarkAttendance";
import History from "./pages/History";
import Predictor from "./pages/Predictor";
import BackupRestore from "./pages/BackupRestore";
import AIChatAndReports from "./pages/AIChatAndReports";
import ProtectedRoute from "./components/ProtectedRoute";
import { AttendanceProvider } from "./context/AttendanceContext";
import { ToastProvider } from "./components/Toast";

export default function App() {
  return (
    <ToastProvider>
      <AttendanceProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Route */}
            <Route path="/" element={<Login />} />
            
            {/* Protected Application Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'hod', 'faculty']}>
                  <StudentList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mark"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'hod', 'faculty']}>
                  <MarkAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'hod', 'faculty']}>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/predictor"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'hod', 'faculty']}>
                  <Predictor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-insights"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'hod', 'faculty']}>
                  <AIChatAndReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backup"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                  <BackupRestore />
                </ProtectedRoute>
              }
            />

            {/* Redirection for legacy paths */}
            <Route path="/faculty-dashboard" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch-all Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AttendanceProvider>
    </ToastProvider>
  );
}
