import React, { useContext, useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { AttendanceContext } from "../context/AttendanceContext";
import { exportToCSV, exportToPDF } from "../utils/exporters";
import { useToast } from "../components/Toast";
import { 
  History as HistoryIcon, 
  Printer, 
  Search, 
  FileSpreadsheet, 
  Clock 
} from "lucide-react";

export default function History() {
  const { students, attendance } = useContext(AttendanceContext);
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filter states
  const [filterDate, setFilterDate] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const branches = ["CSE", "IT", "AIML", "Data Science", "Cyber Security"];
  const sections = ["A", "B", "C"];
  const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

  // 1. Join Attendance Records with Student Details
  const fullRecords = attendance.map((record) => {
    const student = students.find((s) => (s._id || s.id) === record.studentId);
    return {
      ...record,
      studentName: student ? student.name : "Unknown Student",
      rollNumber: student ? student.rollNumber : "N/A",
      branch: student ? student.branch : "N/A",
      section: student ? student.section : "N/A",
      year: student ? student.year : "N/A"
    };
  });

  // 2. Sort Records (Latest dates first)
  const sortedRecords = [...fullRecords].sort((a, b) => b.date.localeCompare(a.date));

  // 3. Apply Filters
  const filteredRecords = sortedRecords.filter((r) => {
    const matchesSearch = 
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = filterDate ? r.date === filterDate : true;
    const matchesBranch = filterBranch ? r.branch === filterBranch : true;
    const matchesSection = filterSection ? r.section === filterSection : true;
    const matchesYear = filterYear ? r.year === filterYear : true;
    const matchesStatus = filterStatus ? r.status === filterStatus : true;

    return matchesSearch && matchesDate && matchesBranch && matchesSection && matchesYear && matchesStatus;
  });

  // Export Filtered Records to Excel (CSV)
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      showToast("No data matches current filters to export.", "error");
      return;
    }

    const headers = ["Date", "Roll Number", "Student Name", "Branch", "Section", "Year", "Status"];
    const rows = filteredRecords.map((r) => [
      r.date,
      r.rollNumber,
      r.studentName,
      r.branch,
      r.section,
      r.year,
      r.status,
    ]);

    exportToCSV(headers, rows, "Attendance_Report");
    showToast("Excel spreadsheet download started.", "success");
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (filteredRecords.length === 0) {
      showToast("No data matches current filters to print.", "error");
      return;
    }
    
    // Trigger PDF Export Utility
    exportToPDF();
    showToast("Print window launched.", "info");
  };

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="main-content">
        <Navbar pageTitle="Attendance History" onMenuClick={() => setSidebarOpen(true)} />

        <div className="page-body">
          {/* Top Panel Actions */}
          <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <HistoryIcon size={20} color="var(--accent-primary)" />
              <h3 style={{ margin: 0 }}>Log History ({filteredRecords.length} entries)</h3>
            </div>
            
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button className="btn btn-secondary" style={{ borderColor: "#10b981", color: "#10b981" }} onClick={handleExportCSV}>
                <FileSpreadsheet size={16} />
                <span>Export to Excel</span>
              </button>
              
              <button className="btn btn-primary" onClick={handleExportPDF}>
                <Printer size={16} />
                <span>Export to PDF / Print</span>
              </button>
            </div>
          </div>

          {/* Report Metadata (Visible ONLY in PDF prints via @media print stylesheet) */}
          <div className="print-report-header" style={{ display: "none" /* Handled by CSS */ }}>
            <h1 style={{ color: "#000" }}>Student Attendance History Report</h1>
            <p style={{ color: "#444", fontSize: "0.85rem", margin: "0.25rem 0 1.5rem 0" }}>
              Generated on: {new Date().toLocaleString()} | Filter details: 
              {filterDate ? ` Date: ${filterDate} |` : ""}
              {filterBranch ? ` Branch: ${filterBranch} |` : ""}
              {filterSection ? ` Section: ${filterSection} |` : ""}
              {filterYear ? ` Year: ${filterYear} |` : ""}
              {filterStatus ? ` Status: ${filterStatus} |` : ""}
              Total logs exported: {filteredRecords.length}
            </p>
          </div>

          {/* Filters Bar */}
          <div className="glass-panel filter-bar">
            <div className="filter-group" style={{ minWidth: "180px", flex: "1.5" }}>
              <span className="label-title">Search Student</span>
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

            <div className="filter-group">
              <span className="label-title">Filter by Date</span>
              <input 
                type="date" 
                className="input-field"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>

            <div className="filter-group">
              <span className="label-title">Branch</span>
              <select className="input-field" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <span className="label-title">Section</span>
              <select className="input-field" value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
                <option value="">All Sections</option>
                {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <span className="label-title">Year</span>
              <select className="input-field" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                <option value="">All Years</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <span className="label-title">Status</span>
              <select className="input-field" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          </div>

          {/* Grid View Table */}
          <div className="glass-panel table-card">
            <div className="table-wrapper">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Classroom Info</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: "600" }}>{r.date}</td>
                        <td>
                          <span style={{ fontFamily: "monospace", fontSize: "0.85rem", background: "rgba(0,0,0,0.15)", padding: "2px 6px", borderRadius: "4px" }}>
                            {r.rollNumber}
                          </span>
                        </td>
                        <td style={{ fontWeight: "600" }}>{r.studentName}</td>
                        <td>{r.branch} - Sec {r.section} ({r.year})</td>
                        <td>
                          <span className={`badge ${r.status === "Present" ? "badge-present" : "badge-absent"}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5">
                        <div className="empty-state">
                          <Clock size={32} style={{ color: "var(--text-muted)" }} />
                          <h4 style={{ margin: 0 }}>No Logs Match Filter Criteria</h4>
                          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                            Try broadening your selection filters or verify student mark states.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
