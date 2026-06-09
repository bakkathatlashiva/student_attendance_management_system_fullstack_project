import React, { useContext, useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { AttendanceContext } from "../context/AttendanceContext";
import { useToast } from "../components/Toast";
import { aiAPI } from "../services/api";
import {
  BrainCircuit,
  Settings,
  Search,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Sliders,
  Sparkles,
  X,
  Loader
} from "lucide-react";

export default function Predictor() {
  const { students, attendance, settings, updateSettings } = useContext(AttendanceContext);
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filter States
  const [filterBranch, setFilterBranch] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Semester Classes adjustment input
  const [totalClassesInput, setTotalClassesInput] = useState(settings.totalSemClasses || 90);

  // AI Modal States
  const [selectedStudentForAI, setSelectedStudentForAI] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const branches = ["CSE", "IT", "AIML", "Data Science", "Cyber Security"];
  const sections = ["A", "B", "C"];
  const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

  // Handle semester length update
  const handleUpdateClasses = (e) => {
    e.preventDefault();
    const parsed = parseInt(totalClassesInput, 10);
    if (isNaN(parsed) || parsed <= 0) {
      showToast("Please enter a valid positive number of classes.", "error");
      return;
    }
    updateSettings({ totalSemClasses: parsed });
    showToast(`Semester total classes updated to ${parsed}. Predictions recalculated.`, "success");
  };

  // 1. Calculate Forecasts for each student (Baseline)
  const totalSemClasses = settings.totalSemClasses || 90;

  const predictedStudents = students.map((student) => {
    const studentId = student._id || student.id;
    const records = attendance.filter((r) => r.studentId === studentId);
    const present = records.filter((r) => r.status === "Present").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const currentTotal = present + absent;

    const currentPct = currentTotal > 0 ? (present / currentTotal) * 100 : 100;

    // Projection Model:
    let projectedPct = 100;
    let projectedPresent = totalSemClasses;

    if (currentTotal > 0) {
      const currentRate = present / currentTotal;
      const remainingClasses = Math.max(0, totalSemClasses - currentTotal);
      projectedPresent = present + currentRate * remainingClasses;
      projectedPct = (projectedPresent / totalSemClasses) * 100;
    }

    // Risk Classification:
    let riskLevel = "Low Risk";
    let riskClass = "low";
    if (projectedPct < 75) {
      riskLevel = "High Risk";
      riskClass = "high";
    } else if (projectedPct < 80) {
      riskLevel = "Medium Risk";
      riskClass = "medium";
    }

    return {
      ...student,
      id: studentId,
      currentTotal,
      currentPct,
      projectedPct,
      projectedPresent: Math.round(projectedPresent),
      riskLevel,
      riskClass
    };
  });

  // Calculate Aggregates for Insights
  const totalPredictable = predictedStudents.length;
  const highRiskCount = predictedStudents.filter(s => s.riskClass === "high").length;
  const mediumRiskCount = predictedStudents.filter(s => s.riskClass === "medium").length;
  const lowRiskCount = predictedStudents.filter(s => s.riskClass === "low").length;

  const highRiskPct = totalPredictable > 0 ? (highRiskCount / totalPredictable) * 100 : 0;
  const mediumRiskPct = totalPredictable > 0 ? (mediumRiskCount / totalPredictable) * 100 : 0;
  const lowRiskPct = totalPredictable > 0 ? (lowRiskCount / totalPredictable) * 100 : 0;

  // Filter lists
  const filteredPredictions = predictedStudents.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBranch = filterBranch ? s.branch === filterBranch : true;
    const matchesSection = filterSection ? s.section === filterSection : true;
    const matchesYear = filterYear ? s.year === filterYear : true;

    return matchesSearch && matchesBranch && matchesSection && matchesYear;
  });

  // Trigger Gemini AI Forecast
  const runAIForecast = async (student) => {
    setSelectedStudentForAI(student);
    setIsAiModalOpen(true);
    setIsAiLoading(true);
    setAiResult(null);

    try {
      const data = await aiAPI.predict(student.id);
      setAiResult(data);
    } catch (err) {
      showToast("AI Prediction failed: " + (err.message || "Error reaching server"), "error");
      setIsAiModalOpen(false);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Navbar pageTitle="AI Attendance Predictor" onMenuClick={() => setSidebarOpen(true)} />

        <div className="page-body">
          {/* Top Info Banner & Settings Config */}
          <div className="analytics-grid" style={{ gridTemplateColumns: "2.2fr 1fr" }}>

            {/* Predictor Info */}
            <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <BrainCircuit size={22} color="var(--accent-primary)" />
                <h3 style={{ margin: 0 }}>Statistical Prediction Engine</h3>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                Our predictive AI analyzes each student's historical attendance rates and projects their final semester-end percentages based on a total of <strong>{totalSemClasses} class periods</strong>. Students showing a projected percentage under 75% are flagged as <strong>High Risk</strong>. Click <strong>AI Forecast</strong> to prompt Google Gemini for a detailed risk evaluation.
              </p>

              {/* Progress Gauges representing risk groups */}
              <div className="risk-gauge-container" style={{ marginTop: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: "600" }}>
                  <span style={{ color: "var(--danger)" }}>High Risk: {highRiskCount} ({highRiskPct.toFixed(0)}%)</span>
                  <span style={{ color: "var(--warning)" }}>Medium Risk: {mediumRiskCount} ({mediumRiskPct.toFixed(0)}%)</span>
                  <span style={{ color: "var(--success)" }}>Low Risk: {lowRiskCount} ({lowRiskPct.toFixed(0)}%)</span>
                </div>
                <div className="risk-gauge-bar" style={{ display: "flex" }}>
                  <div className="risk-gauge-fill high" style={{ width: `${highRiskPct}%`, borderRadius: "4px 0 0 4px" }}></div>
                  <div className="risk-gauge-fill medium" style={{ width: `${mediumRiskPct}%`, borderRadius: "0" }}></div>
                  <div className="risk-gauge-fill low" style={{ width: `${lowRiskPct}%`, borderRadius: "0 4px 4px 0" }}></div>
                </div>
              </div>
            </div>

            {/* AI Settings Form */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <Sliders size={18} color="var(--accent-primary)" />
                <h4 style={{ margin: 0 }}>Predictor Settings</h4>
              </div>
              <form onSubmit={handleUpdateClasses}>
                <span className="label-title">Total Sem Classes</span>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <input
                    type="number"
                    className="input-field"
                    value={totalClassesInput}
                    onChange={(e) => setTotalClassesInput(e.target.value)}
                    style={{ flex: "1" }}
                    min="1"
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem 1rem" }}>
                    Apply
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="glass-panel filter-bar">
            <div className="filter-group" style={{ minWidth: "200px", flex: "1.5" }}>
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
          </div>

          {/* Predictions Grid */}
          <div className="glass-panel table-card">
            <div className="table-wrapper">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Classroom</th>
                    <th>Current % (Tracked)</th>
                    <th>AI Projected %</th>
                    <th>Risk Level</th>
                    <th style={{ textAlign: "right" }}>Detailed Forecast</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPredictions.length > 0 ? (
                    filteredPredictions.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <span style={{ fontFamily: "monospace", fontSize: "0.85rem", background: "rgba(0,0,0,0.15)", padding: "2px 6px", borderRadius: "4px" }}>
                            {student.rollNumber}
                          </span>
                        </td>
                        <td style={{ fontWeight: "600" }}>{student.name}</td>
                        <td>{student.branch} - Sec {student.section}</td>
                        <td>
                          <span style={{ fontWeight: "600" }}>
                            {student.currentTotal > 0 ? `${student.currentPct.toFixed(1)}%` : "N/A"}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "4px" }}>
                            ({student.currentTotal} classes)
                          </span>
                        </td>
                        <td style={{ fontWeight: "800", color: student.riskClass === "high" ? "var(--danger)" : student.riskClass === "medium" ? "var(--warning)" : "var(--success)" }}>
                          {student.projectedPct.toFixed(1)}%
                        </td>
                        <td>
                          <span className={`badge ${student.riskClass === "high" ? "badge-absent" : student.riskClass === "medium" ? "badge-warning" : "badge-present"}`} style={{ display: "flex", gap: "0.25rem", width: "fit-content", alignItems: "center" }}>
                            {student.riskClass === "high" && <AlertTriangle size={12} />}
                            {student.riskClass === "low" && <CheckCircle size={12} />}
                            <span>{student.riskLevel}</span>
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button
                              className="btn btn-primary"
                              style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" }}
                              onClick={() => runAIForecast(student)}
                            >
                              <Sparkles size={12} />
                              <span>AI Forecast</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7">
                        <div className="empty-state">
                          <BrainCircuit size={32} style={{ color: "var(--text-muted)" }} />
                          <h4 style={{ margin: 0 }}>No Data Available</h4>
                          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                            Please register students and mark logs to calibrate the predictor models.
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

      {/* GEMINI AI DETAILED PROJECTION MODAL */}
      {isAiModalOpen && selectedStudentForAI && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel" style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={18} color="var(--accent-primary)" />
                <h3 className="modal-title" style={{ margin: 0 }}>Gemini Risk Intelligence</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsAiModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: "1.5rem" }}>
              {isAiLoading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2.5rem 0", gap: "1rem" }}>
                  <div style={{ width: "35px", height: "35px", border: "3px solid var(--accent-primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Consulting Gemini API Brain...</p>
                </div>
              ) : (
                aiResult && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div style={{ borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.75rem" }}>
                      <h4 style={{ fontSize: "1.1rem", margin: 0 }}>{aiResult.name}</h4>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0.25rem 0 0 0" }}>
                        Roll Number: {aiResult.rollNumber} | Branch: {aiResult.branch}
                      </p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div className="glass-panel" style={{ padding: "0.75rem", textAlign: "center", background: "rgba(0,0,0,0.1)" }}>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>AI Projected</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--accent-primary)", marginTop: "0.25rem" }}>
                          {aiResult.projectedPct.toFixed(1)}%
                        </div>
                      </div>

                      <div className="glass-panel" style={{ padding: "0.75rem", textAlign: "center", background: "rgba(0,0,0,0.1)" }}>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>Risk Level</div>
                        <div style={{
                          fontSize: "1rem",
                          fontWeight: "700",
                          color: aiResult.riskLevel.includes("High") ? "var(--danger)" : aiResult.riskLevel.includes("Medium") ? "var(--warning)" : "var(--success)",
                          marginTop: "0.5rem"
                        }}>
                          {aiResult.riskLevel}
                        </div>
                      </div>
                    </div>

                    <div className="glass-panel" style={{ padding: "1rem", background: "var(--accent-glow)", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "var(--accent-primary)", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Sparkles size={12} />
                        <span>Dean Bot Analysis</span>
                      </div>
                      <p style={{ fontSize: "0.875rem", color: "var(--text-primary)", lineHeight: "1.5", margin: 0, fontStyle: "italic" }}>
                        "{aiResult.rationale}"
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary w-full" onClick={() => setIsAiModalOpen(false)}>Close Forecast</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
