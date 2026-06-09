import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import QRScannerModal from "../components/QRScannerModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentAPI, attendanceAPI, subjectAPI } from "../services/api";
import { useToast } from "../components/Toast";
import { 
  Calendar, 
  ScanQrCode, 
  CheckCircle2, 
  XCircle, 
  Users, 
  Trash2, 
  Search,
  BookOpen
} from "lucide-react";

export default function MarkAttendance() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // States
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [filterBranch, setFilterBranch] = useState("CSE");
  const [filterSection, setFilterSection] = useState("A");
  const [filterYear, setFilterYear] = useState("3rd Year");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const branches = ["CSE", "IT", "AIML", "Data Science", "Cyber Security"];
  const sections = ["A", "B", "C"];
  const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

  // Queries
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentAPI.list()
  });
  const students = studentsData?.students || [];

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => subjectAPI.list()
  });
  const subjects = subjectsData || [];

  // Filter subjects based on branch
  const filteredSubjects = subjects.filter(s => s.department === filterBranch);

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["attendance", selectedDate, selectedSubjectId],
    queryFn: () => attendanceAPI.list({ date: selectedDate, subjectId: selectedSubjectId }),
    enabled: !!selectedDate
  });
  const logs = logsData || [];

  // Mutations
  const markMutation = useMutation({
    mutationFn: (attendanceData) => attendanceAPI.mark(attendanceData),
    onSuccess: () => {
      queryClient.invalidateQueries(["attendance", selectedDate, selectedSubjectId]);
      showToast("Attendance updated.", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.msg || err.message || "Failed to log attendance.", "error");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => attendanceAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["attendance", selectedDate, selectedSubjectId]);
    },
    onError: (err) => {
      showToast("Failed to delete log: " + err.message, "error");
    }
  });

  // Filter students based on classroom selection and search query
  const filteredStudents = students.filter((s) => {
    const matchesBranch = s.branch === filterBranch;
    const matchesSection = s.section === filterSection;
    const matchesYear = s.year === filterYear;
    const nameStr = s.name || "";
    const rollStr = s.rollNumber || "";
    const matchesSearch = 
      nameStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rollStr.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesBranch && matchesSection && matchesYear && matchesSearch;
  });

  // Get attendance status for a student on the selected date
  const getStudentStatusInfo = (studentId) => {
    const record = logs.find(
      (r) => (r.studentId?._id || r.studentId) === studentId
    );
    return record ? { status: record.status, id: record._id } : { status: null, id: null };
  };

  // Bulk Mark Actions
  const handleBulkMark = (status) => {
    const studentIds = filteredStudents.map((s) => s._id || s.id);
    if (studentIds.length === 0) {
      showToast("No students in the filtered view to mark.", "error");
      return;
    }
    
    markMutation.mutate({
      studentIds,
      status,
      date: selectedDate,
      subjectId: selectedSubjectId || null,
      verifiedBy: "Manual"
    });
  };

  // Clear Attendance Action
  const handleClearDate = async () => {
    const studentIds = filteredStudents.map((s) => s._id || s.id);
    if (studentIds.length === 0) {
      showToast("No students in the filtered view to clear.", "error");
      return;
    }

    const recordsToClear = logs.filter(r => {
      const sid = r.studentId?._id || r.studentId;
      return studentIds.includes(sid);
    });

    if (recordsToClear.length === 0) {
      showToast("No attendance logs found to clear.", "info");
      return;
    }

    try {
      await Promise.all(recordsToClear.map(r => deleteMutation.mutateAsync(r._id)));
      showToast("Cleared attendance logs successfully.", "info");
    } catch (err) {
      // Handled by deleteMutation onError
    }
  };

  // QR Scan Success Handler
  const handleQRScanSuccess = (scannedCode) => {
    const trimmedCode = scannedCode.trim().toLowerCase();
    const matchedStudent = students.find(
      (s) => s.rollNumber.trim().toLowerCase() === trimmedCode
    );

    if (matchedStudent) {
      const studentId = matchedStudent._id || matchedStudent.id;
      
      markMutation.mutate({
        studentId,
        status: "Present",
        date: selectedDate,
        subjectId: selectedSubjectId || null,
        verifiedBy: "QR Code Scan"
      });

      showToast(`Scan Successful: ${matchedStudent.name} marked Present.`, "success");

      // Set selectors to match scanned student's class
      setFilterBranch(matchedStudent.branch);
      setFilterSection(matchedStudent.section);
      setFilterYear(matchedStudent.year);
    } else {
      showToast(`Scan Failed: No student found with Roll Number "${scannedCode}".`, "error");
    }
  };

  const handleSingleMark = (studentId, status) => {
    markMutation.mutate({
      studentId,
      status,
      date: selectedDate,
      subjectId: selectedSubjectId || null,
      verifiedBy: "Manual"
    });
  };

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="main-content">
        <Navbar pageTitle="Mark Attendance" onMenuClick={() => setSidebarOpen(true)} />

        <div className="page-body">
          {/* Header Controls */}
          <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Calendar size={18} color="var(--accent-primary)" />
                <span className="label-title" style={{ margin: 0 }}>Date:</span>
                <input 
                  type="date" 
                  className="input-field" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ width: "160px", padding: "0.4rem 0.75rem" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <BookOpen size={18} color="var(--accent-primary)" />
                <span className="label-title" style={{ margin: 0 }}>Subject:</span>
                <select 
                  className="input-field" 
                  value={selectedSubjectId} 
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  style={{ width: "200px", padding: "0.4rem 0.75rem" }}
                >
                  <option value="">-- General / No Subject --</option>
                  {filteredSubjects.map(sub => (
                    <option key={sub._id} value={sub._id}>{sub.name} ({sub.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => setIsScannerOpen(true)} style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)" }}>
              <ScanQrCode size={18} />
              <span>Launch QR Scanner</span>
            </button>
          </div>

          {/* Filtering classroom section */}
          <div className="glass-panel filter-bar">
            <div className="filter-group">
              <span className="label-title">Branch</span>
              <select className="input-field" value={filterBranch} onChange={(e) => { setFilterBranch(e.target.value); setSelectedSubjectId(""); }}>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <span className="label-title">Section</span>
              <select className="input-field" value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
                {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <span className="label-title">Year</span>
              <select className="input-field" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="filter-group" style={{ minWidth: "200px" }}>
              <span className="label-title">Search In Class</span>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Search name/roll..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: "2.5rem" }}
                />
              </div>
            </div>
          </div>

          {/* Bulk Action Controls */}
          {filteredStudents.length > 0 && (
            <div className="glass-panel" style={{ padding: "0.875rem 1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button className="btn btn-secondary" style={{ borderColor: "var(--success-border)", color: "var(--success)" }} onClick={() => handleBulkMark("Present")}>
                <CheckCircle2 size={16} />
                <span>Mark All Present</span>
              </button>
              <button className="btn btn-secondary" style={{ borderColor: "var(--danger-border)", color: "var(--danger)" }} onClick={() => handleBulkMark("Absent")}>
                <XCircle size={16} />
                <span>Mark All Absent</span>
              </button>
              <button className="btn btn-secondary" style={{ borderColor: "var(--border-glass)", color: "var(--text-muted)" }} onClick={handleClearDate}>
                <Trash2 size={16} />
                <span>Clear Attendance</span>
              </button>
            </div>
          )}

          {/* Student Class List Table */}
          <div className="glass-panel table-card">
            {studentsLoading || logsLoading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 0", gap: "1rem" }}>
                <div style={{ width: "35px", height: "35px", border: "3px solid var(--accent-primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Loading database lists...</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Student Name</th>
                      <th>Classroom Info</th>
                      <th style={{ width: "300px", textAlign: "right" }}>Attendance Mark Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => {
                        const studentId = student._id || student.id;
                        const { status } = getStudentStatusInfo(studentId);
                        return (
                          <tr key={studentId}>
                            <td>
                              <span style={{ fontFamily: "monospace", fontWeight: "600", fontSize: "0.85rem", background: "rgba(0,0,0,0.15)", padding: "2px 6px", borderRadius: "4px" }}>
                                {student.rollNumber}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <img 
                                  src={student.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=face"}
                                  alt=""
                                  style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-glass)" }}
                                />
                                <span style={{ fontWeight: "600" }}>{student.name}</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                {student.branch} - Sec {student.section} ({student.year})
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                <button 
                                  className={`btn ${status === "Present" ? "btn-success" : "btn-secondary"}`}
                                  style={{ padding: "0.35rem 0.8rem", fontSize: "0.8rem" }}
                                  onClick={() => handleSingleMark(studentId, "Present")}
                                  disabled={markMutation.isPending}
                                >
                                  <CheckCircle2 size={14} />
                                  <span>Present</span>
                                </button>
                                <button 
                                  className={`btn ${status === "Absent" ? "btn-danger" : "btn-secondary"}`}
                                  style={{ padding: "0.35rem 0.8rem", fontSize: "0.8rem" }}
                                  onClick={() => handleSingleMark(studentId, "Absent")}
                                  disabled={markMutation.isPending}
                                >
                                  <XCircle size={14} />
                                  <span>Absent</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="4">
                          <div className="empty-state">
                            <Users size={32} style={{ color: "var(--text-muted)" }} />
                            <h4 style={{ margin: 0 }}>No Students in this Classroom View</h4>
                            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                              Select another branch, section, or add students in <strong>Manage Students</strong>.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR CAMERA MODAL */}
      <QRScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScanSuccess={handleQRScanSuccess}
      />
    </div>
  );
}
