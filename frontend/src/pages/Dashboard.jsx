import React, { useContext, useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  studentAPI, 
  attendanceAPI, 
  analyticsAPI, 
  aiAPI, 
  subjectAPI, 
  timetableAPI, 
  leaveAPI, 
  auditAPI 
} from "../services/api";
import { useToast } from "../components/Toast";
import { AttendancePieChart, AttendanceBarChart } from "../charts/AttendanceCharts";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Percent, 
  ShieldAlert, 
  Award, 
  Sparkles,
  RefreshCw,
  Clock,
  BookOpen,
  MapPin,
  QrCode,
  Camera,
  FileText,
  Calendar,
  AlertTriangle,
  FileSpreadsheet,
  PlusCircle,
  ThumbsUp,
  ThumbsDown,
  Download,
  Settings as SettingsIcon,
  ShieldCheck,
  CheckCircle,
  TrendingUp,
  Activity
} from "lucide-react";

export default function Dashboard() {
  const { user, token } = useContext(AuthContext);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Real-time socket alerts
  const [socketAlerts, setSocketAlerts] = useState([]);
  
  useEffect(() => {
    if (token && user) {
      const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
      socket.emit("register", user.id);

      socket.on("notification", (notif) => {
        setSocketAlerts(prev => [notif, ...prev]);
        showToast(`New Notification: ${notif.message}`, "info");
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [token, user]);

  // Global ERP queries (Admin/Superadmin)
  const { data: dashboardStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: () => analyticsAPI.getDashboard(),
    enabled: ["superadmin", "admin", "hod", "faculty"].includes(user?.role)
  });

  const { data: heatmapData } = useQuery({
    queryKey: ["heatmap"],
    queryFn: () => analyticsAPI.getHeatmap(),
    enabled: ["superadmin", "admin", "hod", "faculty"].includes(user?.role)
  });

  const { data: leaderboardData } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => analyticsAPI.getLeaderboard(),
    enabled: ["superadmin", "admin", "hod", "faculty"].includes(user?.role)
  });

  // Render conditional role dashboards
  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="main-content">
        <Navbar pageTitle={`${user?.role.toUpperCase()} Portal`} onMenuClick={() => setSidebarOpen(true)} />
        
        <div className="page-body">
          {/* Real-time Socket Alert Banner */}
          {socketAlerts.length > 0 && (
            <div className="glass-panel" style={{ padding: "0.75rem 1.25rem", background: "var(--warning-bg)", borderColor: "var(--warning-border)", color: "var(--warning)", marginBottom: "1rem" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <AlertTriangle size={16} />
                <span><strong>Real-time Alert:</strong> {socketAlerts[0].message}</span>
                <span className="text-xs text-muted" style={{ marginLeft: "auto" }}>just now</span>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={user?.role}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              {user?.role === "superadmin" && <SuperAdminDashboard stats={dashboardStats} loading={statsLoading} refetch={refetchStats} />}
              {user?.role === "admin" && <AdminDashboard stats={dashboardStats} loading={statsLoading} refetch={refetchStats} />}
              {user?.role === "hod" && <HODDashboard stats={dashboardStats} loading={statsLoading} refetch={refetchStats} />}
              {user?.role === "faculty" && <FacultyDashboard stats={dashboardStats} loading={statsLoading} refetch={refetchStats} />}
              {user?.role === "student" && <StudentDashboard user={user} showToast={showToast} />}
              {user?.role === "parent" && <ParentDashboard user={user} showToast={showToast} />}
            </motion.div>
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------
// 1. SUPER ADMIN DASHBOARD
// -----------------------------------------------------------
function SuperAdminDashboard({ stats, loading, refetch }) {
  const { data: auditLogs } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: () => auditAPI.list()
  });

  if (loading) return <LoaderWidget text="Compiling administrative analytics..." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Overview Cards */}
      <div className="stats-grid">
        <div className="stat-card total glass-panel">
          <div className="stat-info">
            <h3>Registered Colleges</h3>
            <div className="stat-value">3</div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--accent-primary)" }}>
            <Award size={24} />
          </div>
        </div>
        <div className="stat-card total glass-panel">
          <div className="stat-info">
            <h3>ERP Students</h3>
            <div className="stat-value">{stats?.totalStudents || 0}</div>
          </div>
          <div className="stat-icon-wrapper"><Users size={24} /></div>
        </div>
        <div className="stat-card present glass-panel">
          <div className="stat-info">
            <h3>Present Today</h3>
            <div className="stat-value">{stats?.presentToday || 0}</div>
          </div>
          <div className="stat-icon-wrapper"><UserCheck size={24} /></div>
        </div>
        <div className="stat-card percentage glass-panel">
          <div className="stat-info">
            <h3>Overall Present %</h3>
            <div className="stat-value">{stats?.overallPercentage || 0}%</div>
          </div>
          <div className="stat-icon-wrapper"><Percent size={24} /></div>
        </div>
      </div>

      {/* Audit Logs and System activities */}
      <div className="analytics-grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <div className="glass-panel chart-card" style={{ padding: "1.25rem" }}>
          <h3 className="chart-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <ShieldCheck size={18} color="var(--accent-primary)" />
            <span>ERP System Audit Logs</span>
          </h3>
          <div style={{ maxHeight: "350px", overflowY: "auto" }}>
            <table className="app-table" style={{ width: "100%", fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs && auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <tr key={log._id}>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: "700", color: "var(--accent-primary)" }}>{log.action}</td>
                      <td>{log.user?.name || "Guest"} ({log.user?.role})</td>
                      <td>{log.ipAddress}</td>
                      <td>{log.details}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textStyle: "italic", textAlign: "center" }}>No logs recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Health Status */}
        <div className="glass-panel" style={{ padding: "1.25rem" }}>
          <h3 className="chart-title" style={{ marginBottom: "1rem" }}>Cloud Integrations</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.85rem" }}>
            <div className="leaderboard-item">
              <span>Cloudinary Storage</span>
              <span className="badge badge-present">ONLINE</span>
            </div>
            <div className="leaderboard-item">
              <span>Google Gemini Model</span>
              <span className="badge badge-present">READY</span>
            </div>
            <div className="leaderboard-item">
              <span>Twilio SMS API</span>
              <span className="badge badge-warning">SANDBOX</span>
            </div>
            <div className="leaderboard-item">
              <span>Nodemailer Server</span>
              <span className="badge badge-present">LOCAL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------
// 2. ADMIN DASHBOARD
// -----------------------------------------------------------
function AdminDashboard({ stats, loading, refetch }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  // Subject creation form states
  const [subName, setSubName] = useState("");
  const [subCode, setSubCode] = useState("");
  const [subDept, setSubDept] = useState("CSE");

  const { data: subjectList } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => subjectAPI.list()
  });

  const createSubjectMutation = useMutation({
    mutationFn: (sub) => subjectAPI.create(sub),
    onSuccess: () => {
      queryClient.invalidateQueries(["subjects"]);
      setSubName("");
      setSubCode("");
      showToast("Subject registered in ERP database.", "success");
    },
    onError: (err) => {
      showToast(err.message || "Failed to register subject.", "error");
    }
  });

  const handleCreateSubject = (e) => {
    e.preventDefault();
    createSubjectMutation.mutate({ name: subName, code: subCode, department: subDept });
  };

  if (loading) return <LoaderWidget text="Loading college ERP records..." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="stats-grid">
        <div className="stat-card total glass-panel">
          <div className="stat-info">
            <h3>Registered Students</h3>
            <div className="stat-value">{stats?.totalStudents || 0}</div>
          </div>
          <div className="stat-icon-wrapper"><Users size={24} /></div>
        </div>
        <div className="stat-card percentage glass-panel">
          <div className="stat-info">
            <h3>Registered Subjects</h3>
            <div className="stat-value">{subjectList?.length || 0}</div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--accent-primary)" }}>
            <BookOpen size={24} />
          </div>
        </div>
        <div className="stat-card absent glass-panel">
          <div className="stat-info">
            <h3>Low Attendance Alerts</h3>
            <div className="stat-value">{stats?.studentsBelow75Count || 0}</div>
          </div>
          <div className="stat-icon-wrapper"><ShieldAlert size={24} /></div>
        </div>
      </div>

      <div className="analytics-grid" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
        {/* Create Timetables & Subjects Form */}
        <div className="glass-panel" style={{ padding: "1.25rem" }}>
          <h3 className="chart-title" style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PlusCircle size={18} color="var(--accent-primary)" />
            <span>Add ERP Curriculum Subject</span>
          </h3>
          <form onSubmit={handleCreateSubject} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <span className="label-title">Subject Title</span>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Advanced Operating Systems"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                required
              />
            </div>
            <div className="form-grid">
              <div>
                <span className="label-title">Subject Code</span>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. CS-401"
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  required
                />
              </div>
              <div>
                <span className="label-title">Academic Department</span>
                <select className="input-field" value={subDept} onChange={(e) => setSubDept(e.target.value)}>
                  <option value="CSE">CSE</option>
                  <option value="IT">IT</option>
                  <option value="AIML">AIML</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Cyber Security">Cyber Security</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "fit-content" }}>
              Save subject
            </button>
          </form>
        </div>

        {/* Active Subjects List */}
        <div className="glass-panel" style={{ padding: "1.25rem", maxHeight: "350px", overflowY: "auto" }}>
          <h3 className="chart-title" style={{ marginBottom: "1rem" }}>Curriculum Subjects List</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {subjectList && subjectList.length > 0 ? (
              subjectList.map(sub => (
                <div key={sub._id} className="leaderboard-item" style={{ justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: "700" }}>{sub.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Code: {sub.code} • Dept: {sub.department}</div>
                  </div>
                  <span className="badge badge-info" style={{ height: "fit-content" }}>Active</span>
                </div>
              ))
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "1rem" }}>
                No subjects registered.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------
// 3. HOD DASHBOARD
// -----------------------------------------------------------
function HODDashboard({ stats, loading, refetch }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: pendingLeaves, isLoading: leavesLoading } = useQuery({
    queryKey: ["pendingLeaves"],
    queryFn: () => leaveAPI.getPending()
  });

  const reviewLeaveMutation = useMutation({
    mutationFn: ({ id, status, remarks }) => leaveAPI.review(id, status, remarks),
    onSuccess: (data) => {
      queryClient.invalidateQueries(["pendingLeaves"]);
      showToast(`Leave request updated. Status: ${data.leave.status}`, "success");
    },
    onError: (err) => {
      showToast(err.message || "Failed to update leave.", "error");
    }
  });

  const handleReviewLeave = (id, status) => {
    const remarks = prompt(`Enter review remarks for this leave request (optional):`);
    reviewLeaveMutation.mutate({ id, status, remarks: remarks || "" });
  };

  if (loading) return <LoaderWidget text="Syncing Department registers..." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="stats-grid">
        <div className="stat-card total glass-panel">
          <div className="stat-info">
            <h3>Department Students</h3>
            <div className="stat-value">{stats?.totalStudents || 0}</div>
          </div>
          <div className="stat-icon-wrapper"><Users size={24} /></div>
        </div>
        <div className="stat-card percentage glass-panel">
          <div className="stat-info">
            <h3>Pending Leaves Requests</h3>
            <div className="stat-value">{pendingLeaves?.length || 0}</div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--warning)" }}>
            <FileText size={24} />
          </div>
        </div>
      </div>

      {/* Leave Approval Panel */}
      <div className="glass-panel chart-card" style={{ padding: "1.25rem" }}>
        <h3 className="chart-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <Clock size={18} color="var(--accent-primary)" />
          <span>Pending Student Leave Applications</span>
        </h3>
        
        {leavesLoading ? (
          <p style={{ fontStyle: "italic", fontSize: "0.85rem" }}>Loading applications...</p>
        ) : pendingLeaves && pendingLeaves.length > 0 ? (
          <div className="table-wrapper">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th>Attachment</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.map(leave => (
                  <tr key={leave._id}>
                    <td>
                      <div style={{ fontWeight: "700" }}>{leave.studentId?.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Roll: {leave.studentId?.rollNumber} • {leave.studentId?.branch}</div>
                    </td>
                    <td>
                      <span className="badge badge-info">{leave.leaveType}</span>
                    </td>
                    <td>{leave.startDate} to {leave.endDate}</td>
                    <td>{leave.reason}</td>
                    <td>
                      {leave.attachmentUrl ? (
                        <a href={leave.attachmentUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent-primary)", textDecoration: "underline", fontSize: "0.8rem" }}>
                          View Document
                        </a>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>No file</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button className="btn btn-success" style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }} onClick={() => handleReviewLeave(leave._id, "Approved")}>
                          <ThumbsUp size={12} />
                          <span>Approve</span>
                        </button>
                        <button className="btn btn-danger" style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }} onClick={() => handleReviewLeave(leave._id, "Rejected")}>
                          <ThumbsDown size={12} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            🎉 No leave requests pending review.
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------
// 4. FACULTY DASHBOARD (ORIGINAL MODULE INTEGRATED)
// -----------------------------------------------------------
function FacultyDashboard({ stats, loading, refetch }) {
  const { showToast } = useToast();

  const [aiInsights, setAiInsights] = useState([]);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);

  // Time-limited QR Generation States
  const [generatedQRValue, setGeneratedQRValue] = useState("");
  const [qrCounter, setQrCounter] = useState(60);

  const fetchAIInsights = async () => {
    setIsInsightsLoading(true);
    setAiInsights([]);
    try {
      const data = await aiAPI.getInsights();
      setAiInsights(data.insights || []);
      showToast("AI Insights refreshed.", "success");
    } catch (err) {
      showToast("Could not generate insights: " + err.message, "error");
    } finally {
      setIsInsightsLoading(false);
    }
  };

  useEffect(() => {
    if (stats) fetchAIInsights();
  }, [stats]);

  // Tick the QR code timer
  useEffect(() => {
    let timer;
    if (generatedQRValue) {
      timer = setInterval(() => {
        setQrCounter(prev => {
          if (prev <= 1) {
            // Re-generate QR timestamp
            const freshTimestamp = Date.now();
            setGeneratedQRValue(`ATTENDANCE-QR-${stats?.leaderboard?.[0]?.id || 'ERP'}-${freshTimestamp}`);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [generatedQRValue]);

  const handleGenerateQR = () => {
    const timestamp = Date.now();
    setGeneratedQRValue(`ATTENDANCE-QR-CLASS-${timestamp}`);
    setQrCounter(60);
    showToast("Time-limited secure QR Code generated. Refreshes every 60s.", "info");
  };

  if (loading) return <LoaderWidget text="Loading Faculty Classroom statistics..." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* AI Insights Sparkling Banner */}
      <div className="glass-panel" style={{ padding: "1.25rem", background: "var(--accent-glow)", border: "1px solid rgba(99, 102, 241, 0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <Sparkles size={18} color="var(--accent-primary)" style={{ animation: "pulse 1.5s infinite" }} />
          <h4 style={{ margin: 0, fontWeight: "700" }}>Faculty Smart AI Insights</h4>
          <button onClick={fetchAIInsights} disabled={isInsightsLoading} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "var(--accent-primary)", padding: 0 }}>
            <RefreshCw size={14} className={isInsightsLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {isInsightsLoading ? (
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
            Analyzing class registers...
          </div>
        ) : aiInsights.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            {aiInsights.map((insight, idx) => (
              <div key={idx} className="glass-panel" style={{ padding: "0.75rem 1rem", background: "rgba(0,0,0,0.15)", fontSize: "0.825rem", borderLeft: "3px solid var(--accent-primary)", lineHeight: "1.4" }}>
                {insight}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
            No insights available.
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="stats-grid">
        <div className="stat-card total glass-panel">
          <div className="stat-info">
            <h3>Registered Students</h3>
            <div className="stat-value">{stats?.totalStudents || 0}</div>
          </div>
          <div className="stat-icon-wrapper"><Users size={24} /></div>
        </div>
        <div className="stat-card present glass-panel">
          <div className="stat-info">
            <h3>Present Today</h3>
            <div className="stat-value">{stats?.presentToday || 0}</div>
          </div>
          <div className="stat-icon-wrapper"><UserCheck size={24} /></div>
        </div>
        <div className="stat-card percentage glass-panel">
          <div className="stat-info">
            <h3>Class Attendance</h3>
            <div className="stat-value">{stats?.overallPercentage || 0}%</div>
          </div>
          <div className="stat-icon-wrapper"><Percent size={24} /></div>
        </div>
      </div>

      <div className="analytics-grid" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
        {/* Monthly Attendance Trend */}
        <div className="chart-card glass-panel" style={{ padding: "1.25rem" }}>
          <h3 className="chart-title">Class Monthly Attendance Trends</h3>
          <div className="chart-body" style={{ minHeight: "240px", marginTop: "1rem" }}>
            <AttendanceBarChart attendanceRecords={stats?.recentActivities || []} />
          </div>
        </div>

        {/* QR Code generator per Class */}
        <div className="glass-panel text-center flex flex-col justify-center items-center" style={{ padding: "1.5rem", minHeight: "280px" }}>
          <QrCode size={36} color="var(--accent-primary)" style={{ marginBottom: "1rem" }} />
          <h3 className="chart-title" style={{ margin: 0 }}>Class Secure QR Code Attendance</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0.5rem 0 1.25rem 0", lineHeight: "1.4" }}>
            Faculty can project a ticking time-limited QR code. Students scanning this on their dashboard with coordinates verify their presence.
          </p>
          
          {generatedQRValue ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ background: "white", padding: "10px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                {/* Mock QR canvas drawing wrapper */}
                <div style={{ width: "120px", height: "120px", background: "url('https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=" + encodeURIComponent(generatedQRValue) + "') no-repeat center center", backgroundSize: "contain" }}></div>
              </div>
              <span className="badge badge-warning" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <Clock size={12} />
                <span>Refreshes in {qrCounter}s</span>
              </span>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={handleGenerateQR}>
              Generate Secure Session QR
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------
// 5. STUDENT DASHBOARD
// -----------------------------------------------------------
function StudentDashboard({ user, showToast }) {
  const [gpsVerified, setGpsVerified] = useState(false);
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [distance, setDistance] = useState(null);

  // Face Registration states
  const [isFaceCameraOpen, setIsFaceCameraOpen] = useState(false);
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const videoRef = useRef(null);

  const { data: studentProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["studentProfile"],
    queryFn: () => studentAPI.get(user.associatedId),
    enabled: !!user.associatedId
  });

  const { data: achievements } = useQuery({
    queryKey: ["achievements", user.associatedId],
    queryFn: () => analyticsAPI.getAchievements(user.associatedId),
    enabled: !!user.associatedId
  });

  // Timetable
  const { data: studentTimetable } = useQuery({
    queryKey: ["studentTimetable", user.associatedId],
    queryFn: () => timetableAPI.getStudent(user.associatedId),
    enabled: !!user.associatedId
  });

  // Leave Form States
  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState(null);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) return showToast("Please fill all fields.", "error");

    setIsSubmittingLeave(true);
    try {
      const formData = new FormData();
      formData.append("leaveType", leaveType);
      formData.append("startDate", startDate);
      formData.append("endDate", endDate);
      formData.append("reason", reason);
      if (file) {
        formData.append("attachment", file);
      }

      await leaveAPI.apply(formData);
      showToast("Leave request submitted to HOD successfully.", "success");
      setStartDate("");
      setEndDate("");
      setReason("");
      setFile(null);
    } catch (err) {
      showToast("Failed to apply leave: " + err.message, "error");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Fetch Geolocation Coordinates
  const fetchLocation = () => {
    if (!navigator.geolocation) {
      return showToast("Geolocation is not supported by this browser.", "error");
    }
    
    showToast("Retrieving GPS coordinates...", "info");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const cLat = pos.coords.latitude;
        const cLng = pos.coords.longitude;
        setLat(cLat);
        setLng(cLng);
        setGpsVerified(true);

        // Dean's coordinates lat: 17.4063, lng: 78.4691
        const R = 6371e3; // Earth radius in meters
        const φ1 = cLat * Math.PI / 180;
        const φ2 = 17.4063 * Math.PI / 180;
        const Δφ = (17.4063 - cLat) * Math.PI / 180;
        const Δλ = (78.4691 - cLng) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const dist = R * c;
        setDistance(dist);

        if (dist <= 200) {
          showToast(`GPS verified: Inside campus boundary (${Math.round(dist)}m away).`, "success");
        } else {
          showToast(`Outside Campus Boundary! You are ${Math.round(dist)}m away from campus.`, "error");
        }
      },
      (err) => {
        showToast("GPS Permission Denied. Could not resolve location.", "error");
      }
    );
  };

  // Simulated Face Registration
  const startFaceRegistration = async () => {
    setIsFaceCameraOpen(true);
    setIsCameraScanning(true);
    setTimeout(() => {
      // Simulate webcam analysis
      setIsCameraScanning(false);
      setIsFaceRegistered(true);
      setIsFaceCameraOpen(false);
      showToast("Face Registration Successful: Facial descriptor added to ERP.", "success");
    }, 4000);
  };

  if (profileLoading) return <LoaderWidget text="Loading Student dashboard profile..." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* Student Metrics */}
      <div className="stats-grid" style={{ gridTemplateColumns: "1.3fr 1fr 1fr" }}>
        {/* Profile Card */}
        <div className="glass-panel flex gap-4" style={{ padding: "1.25rem", alignItems: "center" }}>
          <div style={{ 
            width: "70px", 
            height: "70px", 
            borderRadius: "50%", 
            background: studentProfile?.photoUrl ? `url(${studentProfile.photoUrl}) no-repeat center center` : "rgba(255,255,255,0.05)", 
            backgroundSize: "cover",
            border: "2px solid var(--accent-primary)",
            flexShrink: 0
          }}>
            {!studentProfile?.photoUrl && <Users style={{ padding: "15px", width: "100%", height: "100%" }} />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{studentProfile?.name}</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Roll: {studentProfile?.rollNumber}</p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{studentProfile?.branch} • Year: {studentProfile?.year}</p>
          </div>
        </div>

        {/* Percentage Card */}
        <div className="stat-card percentage glass-panel">
          <div className="stat-info">
            <h3>Your Attendance</h3>
            <div className="stat-value">{achievements?.percentage || 0}%</div>
          </div>
          <div className="stat-icon-wrapper"><Percent size={24} /></div>
        </div>

        {/* Active Badges */}
        <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span className="label-title">Achievements</span>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
            {achievements?.badges && achievements.badges.length > 0 ? (
              achievements.badges.map((b, idx) => (
                <span key={idx} className="badge badge-present" style={{ fontSize: "0.8rem", padding: "0.35rem 0.6rem" }} title={b.description}>
                  {b.icon} {b.title}
                </span>
              ))
            ) : (
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>No badges unlocked yet.</span>
            )}
          </div>
        </div>
      </div>

      <div className="analytics-grid" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
        
        {/* Face Registration & GPS Verification checks */}
        <div className="glass-panel" style={{ padding: "1.25rem" }}>
          <h3 className="chart-title" style={{ marginBottom: "1rem" }}>Webcam Face & GPS Gateways</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* GPS verification */}
            <div className="glass-panel" style={{ padding: "1rem", background: "rgba(0,0,0,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <MapPin size={15} color="var(--accent-primary)" />
                    <span>Campus Geolocation boundary</span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    {gpsVerified ? `Lat: ${lat?.toFixed(4)}, Lng: ${lng?.toFixed(4)} (${Math.round(distance)}m from dean office)` : 'GPS Verification is required to check presence.'}
                  </p>
                </div>
                <button className="btn btn-secondary" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }} onClick={fetchLocation}>
                  Verify Coordinates
                </button>
              </div>
            </div>

            {/* Face Registration */}
            <div className="glass-panel" style={{ padding: "1rem", background: "rgba(0,0,0,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Camera size={15} color="var(--accent-primary)" />
                    <span>Facial Match Matching Code</span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    {isFaceRegistered ? "🏆 Face registered successfully in ERP." : "Register face using webcam to allow anti-proxy matching."}
                  </p>
                </div>
                <button 
                  className="btn btn-primary animate-pulse" 
                  style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", background: isFaceRegistered ? "var(--success)" : "var(--accent-gradient)" }} 
                  onClick={startFaceRegistration}
                  disabled={isFaceRegistered || isCameraScanning}
                >
                  {isFaceRegistered ? "Face Registered" : "Scan Webcam"}
                </button>
              </div>
            </div>

            {/* Camera mock popup */}
            {isFaceCameraOpen && (
              <div className="glass-panel" style={{ padding: "1rem", border: "1px solid var(--accent-primary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "200px", height: "150px", border: "2px dashed var(--accent-primary)", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                  <div style={{ width: "100%", height: "2px", background: "green", position: "absolute", top: "50%", left: 0, animation: "pulse 1.5s infinite" }}></div>
                  <span style={{ fontSize: "0.75rem", color: "green", zIndex: 1, textShadow: "1px 1px #000" }}>SCANNING FACIAL LANDMARKS...</span>
                </div>
                <span className="badge badge-warning">Calibrating webcam...</span>
              </div>
            )}
          </div>
        </div>

        {/* Applied Leave application Form */}
        <div className="glass-panel" style={{ padding: "1.25rem" }}>
          <h3 className="chart-title" style={{ marginBottom: "1rem" }}>Apply Leave application</h3>
          <form onSubmit={handleApplyLeave} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <span className="label-title">Leave Type</span>
              <select className="input-field" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                <option value="Casual Leave">Casual Leave</option>
                <option value="Medical Leave">Medical Leave</option>
                <option value="Emergency Leave">Emergency Leave</option>
              </select>
            </div>
            <div className="form-grid">
              <div>
                <span className="label-title">Start Date</span>
                <input type="date" className="input-field" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div>
                <span className="label-title">End Date</span>
                <input type="date" className="input-field" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>
            </div>
            <div>
              <span className="label-title">Reason</span>
              <textarea className="input-field" placeholder="Brief explanation..." value={reason} onChange={(e) => setReason(e.target.value)} style={{ minHeight: "60px" }} required />
            </div>
            <div>
              <span className="label-title">Attachment (Certificate)</span>
              <input type="file" className="input-field" onChange={(e) => setFile(e.target.files[0])} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "fit-content" }} disabled={isSubmittingLeave}>
              {isSubmittingLeave ? "Uploading..." : "Submit Application"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------
// 6. PARENT PORTAL DASHBOARD
// -----------------------------------------------------------
function ParentDashboard({ user, showToast }) {
  const { data: kidProfile } = useQuery({
    queryKey: ["kidProfile"],
    queryFn: () => studentAPI.get(user.associatedId),
    enabled: !!user.associatedId
  });

  const { data: kidAchievements } = useQuery({
    queryKey: ["kidAchievements", user.associatedId],
    queryFn: () => analyticsAPI.getAchievements(user.associatedId),
    enabled: !!user.associatedId
  });

  const { data: kidLeaves } = useQuery({
    queryKey: ["kidLeaves", user.associatedId],
    queryFn: () => leaveAPI.getStudent(user.associatedId),
    enabled: !!user.associatedId
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="stats-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* Kid Info */}
        <div className="glass-panel flex gap-4" style={{ padding: "1.25rem", alignItems: "center" }}>
          <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "2px solid var(--accent-primary)" }}>
            <Users style={{ padding: "12px", width: "100%", height: "100%" }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Ward: {kidProfile?.name}</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Branch: {kidProfile?.branch} • Year: {kidProfile?.year}</p>
          </div>
        </div>

        {/* Overall ward percentage */}
        <div className="stat-card percentage glass-panel">
          <div className="stat-info">
            <h3>Ward Overall Attendance</h3>
            <div className="stat-value">{kidAchievements?.percentage || 0}%</div>
          </div>
          <div className="stat-icon-wrapper"><Percent size={24} /></div>
        </div>
      </div>

      <div className="analytics-grid" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        {/* Leaves status list */}
        <div className="glass-panel" style={{ padding: "1.25rem", maxHeight: "300px", overflowY: "auto" }}>
          <h3 className="chart-title" style={{ marginBottom: "1rem" }}>Ward Applied Leave Requests</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {kidLeaves && kidLeaves.length > 0 ? (
              kidLeaves.map(leave => (
                <div key={leave._id} className="leaderboard-item" style={{ justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: "700" }}>{leave.leaveType}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Dates: {leave.startDate} to {leave.endDate}</div>
                  </div>
                  <span className={`badge ${leave.status === 'Approved' ? 'badge-present' : leave.status === 'Rejected' ? 'badge-absent' : 'badge-warning'}`}>
                    {leave.status}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "1rem" }}>
                No leave request history found.
              </div>
            )}
          </div>
        </div>

        {/* Alerts & warnings panel */}
        <div className="glass-panel" style={{ padding: "1.25rem" }}>
          <h3 className="chart-title" style={{ marginBottom: "1.25rem", color: "var(--danger)" }}>Compliance Warnings</h3>
          {parseFloat(kidAchievements?.percentage || "100") < 75 ? (
            <div className="glass-panel" style={{ padding: "1rem", background: "var(--danger-bg)", borderColor: "var(--danger-border)" }}>
              <h4 style={{ color: "var(--danger)", margin: 0, fontSize: "0.9rem" }}>Critical: Attendance Shortage</h4>
              <p style={{ fontSize: "0.75rem", color: "var(--text-primary)", marginTop: "0.5rem", lineHeight: "1.4" }}>
                Your ward's attendance is currently at {kidAchievements?.percentage}%, which is below the mandatory 75% threshold. Please advise your ward to attend classes consistently.
              </p>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: "1rem", background: "var(--success-bg)", borderColor: "var(--success-border)" }}>
              <h4 style={{ color: "var(--success)", margin: 0, fontSize: "0.9rem" }}>Safe Status</h4>
              <p style={{ fontSize: "0.75rem", color: "var(--text-primary)", marginTop: "0.5rem", lineHeight: "1.4" }}>
                Your ward's attendance meets the university standards. Maintain this consistency to avoid any shortage issues.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------
// ERASABLE/LOADER COMPONENT HELPERS
// -----------------------------------------------------------
function LoaderWidget({ text }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "1rem" }}>
      <div style={{ width: "35px", height: "35px", border: "4px border-indigo-500", borderTopColor: "transparent", borderRadius: "50%", className: "animate-spin animate-spin-custom" }}></div>
      <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{text}</p>
    </div>
  );
}
