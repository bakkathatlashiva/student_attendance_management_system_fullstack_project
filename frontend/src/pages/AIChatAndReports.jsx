import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { aiAPI } from "../services/api";
import { useToast } from "../components/Toast";
import { 
  Sparkles, 
  Send, 
  FileText, 
  Calendar, 
  CheckCircle, 
  MessageSquare,
  ClipboardList,
  Printer
} from "lucide-react";

export default function AIChatAndReports() {
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Chat States
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { sender: "bot", text: "Hello! I am Dean Bot, your AI attendance assistant. Ask me questions like:\n- 'Show students below 75%'\n- 'Generate attendance summary'\n- 'Show top attendance students'\n- 'Show attendance trends'" }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Report Generator States
  const [reportType, setReportType] = useState("Daily");
  const todayStr = new Date().toISOString().split("T")[0];
  const [reportDate, setReportDate] = useState(todayStr);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [isReportLoading, setIsReportLoading] = useState(false);

  // Send message to Dean Bot
  const handleSendChat = async (e) => {
    if (e) e.preventDefault();
    if (!chatMessage.trim()) return;

    const userMsg = chatMessage.trim();
    setChatMessage("");
    setChatHistory(prev => [...prev, { sender: "user", text: userMsg }]);
    setIsChatLoading(true);

    try {
      const data = await aiAPI.chat(userMsg);
      setChatHistory(prev => [...prev, { sender: "bot", text: data.reply }]);
    } catch (err) {
      showToast("Dean Bot lookup failed: " + (err.message || "Server error"), "error");
    } finally {
      setIsChatLoading(false);
    }
  };

  // Preset prompts
  const triggerPresetPrompt = (promptText) => {
    setChatMessage(promptText);
    setTimeout(() => {
      // Small timeout to let state update, then submit
      const inputForm = document.getElementById("chat-form");
      if (inputForm) {
        inputForm.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
      }
    }, 100);
  };

  // Compile Report
  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setIsReportLoading(true);
    setGeneratedReport(null);

    try {
      const data = await aiAPI.generateReport(reportType, reportDate);
      setGeneratedReport(data);
      showToast(`${reportType} report compiled.`, "success");
    } catch (err) {
      showToast("Failed to compile AI report: " + (err.message || "Server error"), "error");
    } finally {
      setIsReportLoading(false);
    }
  };

  const handlePrintReport = () => {
    const printContent = document.getElementById("printable-report-body")?.innerHTML;
    if (!printContent) return;

    const originalContent = document.body.innerHTML;
    document.body.innerHTML = `
      <div style="padding: 40px; font-family: sans-serif; color: #000; background: #fff;">
        ${printContent}
      </div>
    `;
    window.print();
    // Restore page
    window.location.reload();
  };

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="main-content">
        <Navbar pageTitle="Gemini AI Portal" onMenuClick={() => setSidebarOpen(true)} />

        <div className="page-body" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "1.5rem" }}>
          
          {/* LEFT: DEAN BOT CHAT ASSISTANT */}
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
              <MessageSquare size={20} color="var(--accent-primary)" />
              <h3 style={{ margin: 0 }}>Dean Bot Chat Assistant</h3>
              <span className="badge badge-info" style={{ marginLeft: "auto" }}>Powered by Gemini</span>
            </div>

            {/* Chat Messages */}
            <div style={{ flexGrow: "1", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", paddingRight: "0.5rem", marginBottom: "1rem" }}>
              {chatHistory.map((chat, idx) => (
                <div key={idx} style={{ 
                  alignSelf: chat.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  padding: "0.75rem 1rem",
                  borderRadius: chat.sender === "user" ? "12px 12px 0 12px" : "12px 12px 12px 0",
                  background: chat.sender === "user" ? "var(--accent-gradient)" : "rgba(255,255,255,0.03)",
                  border: chat.sender === "user" ? "none" : "1px solid var(--border-glass)",
                  color: "#ffffff"
                }}>
                  <div style={{ fontSize: "0.7rem", color: chat.sender === "user" ? "rgba(255,255,255,0.7)" : "var(--text-muted)", marginBottom: "0.25rem", fontWeight: "600" }}>
                    {chat.sender === "user" ? "YOU (FACULTY)" : "DEAN BOT"}
                  </div>
                  <div style={{ fontSize: "0.875rem", lineHeight: "1.5", whiteSpace: "pre-line" }}>
                    {chat.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-glass)", padding: "0.75rem 1rem", borderRadius: "12px 12px 12px 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "12px", height: "12px", border: "2px solid var(--accent-primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }}></div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Dean Bot is typing...</span>
                </div>
              )}
            </div>

            {/* Preset Buttons */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem" }}
                onClick={() => triggerPresetPrompt("Show students below 75%")}
              >
                Below 75%
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem" }}
                onClick={() => triggerPresetPrompt("Generate attendance summary")}
              >
                ERP Summary
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem" }}
                onClick={() => triggerPresetPrompt("Show top attendance students")}
              >
                Top Students
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem" }}
                onClick={() => triggerPresetPrompt("Show attendance trends")}
              >
                Branch Trends
              </button>
            </div>

            {/* Chat Input form */}
            <form id="chat-form" onSubmit={handleSendChat} style={{ display: "flex", gap: "0.5rem" }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Ask Dean Bot a question..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                disabled={isChatLoading}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: "0.6rem" }} disabled={isChatLoading || !chatMessage.trim()}>
                <Send size={18} />
              </button>
            </form>
          </div>

          {/* RIGHT: REPORT GENERATOR */}
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
              <ClipboardList size={20} color="var(--accent-primary)" />
              <h3 style={{ margin: 0 }}>AI Report Generator</h3>
            </div>

            {/* Form */}
            <form onSubmit={handleGenerateReport} style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end", marginBottom: "1.5rem" }}>
              <div style={{ flex: "1", minWidth: "140px" }}>
                <span className="label-title">Report Scope</span>
                <select className="input-field" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                  <option value="Daily">Daily Summary</option>
                  <option value="Weekly">Weekly Review</option>
                  <option value="Monthly">Monthly Audit</option>
                </select>
              </div>

              <div style={{ flex: "1", minWidth: "140px" }}>
                <span className="label-title">Report Date</span>
                <input 
                  type="date" 
                  className="input-field" 
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ height: "40px" }} disabled={isReportLoading}>
                {isReportLoading ? "Compiling..." : "Generate AI Report"}
              </button>
            </form>

            {/* Report Viewer */}
            <div style={{ flexGrow: "1", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {isReportLoading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 0", gap: "1rem" }}>
                  <div style={{ width: "30px", height: "30px", border: "3px solid var(--accent-primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Dean Bot is querying logs and writing markdown...</p>
                </div>
              ) : generatedReport ? (
                <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600" }}>
                      STATUS: COMPILED SUCCESSFULLY
                    </div>
                    <button className="btn btn-secondary" style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }} onClick={handlePrintReport}>
                      <Printer size={12} />
                      <span>Print / PDF</span>
                    </button>
                  </div>
                  
                  {/* Markdown content container */}
                  <div id="printable-report-body" style={{ fontSize: "0.875rem", lineHeight: "1.6", whiteSpace: "pre-line", maxHeight: "400px", overflowY: "auto" }}>
                    {generatedReport.content}
                  </div>
                </div>
              ) : (
                <div style={{ flexGrow: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", border: "2px dashed var(--border-glass)", borderRadius: "8px", padding: "2rem" }}>
                  <FileText size={36} />
                  <h4 style={{ margin: "1rem 0 0.25rem 0" }}>No Report Compiled</h4>
                  <p style={{ margin: 0, fontSize: "0.8rem", textAlign: "center" }}>
                    Select report scope and click generate to invoke Google Gemini.
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
