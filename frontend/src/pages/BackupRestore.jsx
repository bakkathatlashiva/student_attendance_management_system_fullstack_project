import React, { useContext, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ConfirmDialog from "../components/ConfirmDialog";
import { AttendanceContext } from "../context/AttendanceContext";
import { useToast } from "../components/Toast";
import { 
  DatabaseBackup, 
  Download, 
  Upload, 
  ShieldAlert, 
  RefreshCw, 
  CheckCircle 
} from "lucide-react";

export default function BackupRestore() {
  const { getBackupData, restoreBackupData } = useContext(AttendanceContext);
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // States
  const [backupFileContent, setBackupFileContent] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef(null);

  // Handle Export Backup
  const handleExportBackup = () => {
    try {
      const data = getBackupData();
      const stringified = JSON.stringify(data, null, 2);
      const blob = new Blob([stringified], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `AttendanceSystem_Backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("Data backup file exported successfully.", "success");
    } catch (err) {
      showToast("Failed to export backup: " + err.message, "error");
    }
  };

  // Handle File Selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      showToast("Please select a valid JSON backup file.", "error");
      e.target.value = ""; // reset input
      return;
    }

    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        setBackupFileContent(parsed);
      } catch (err) {
        showToast("Invalid JSON file formatting. Read failed.", "error");
        setBackupFileContent(null);
        setFileName("");
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  // Trigger Confirmation Modal
  const handleRestoreClick = () => {
    if (!backupFileContent) {
      showToast("Please upload a backup file first.", "error");
      return;
    }
    setIsConfirmOpen(true);
  };

  // Perform Restoration
  const handleConfirmRestore = async () => {
    setIsConfirmOpen(false);
    setIsRestoring(true);

    try {
      // Small artificial delay for visual feedback of loading state
      await new Promise(resolve => setTimeout(resolve, 800));
      
      await restoreBackupData(backupFileContent);
      showToast("Database restored successfully! Reloading page...", "success");
      
      // Reload page to re-initialize contexts and layout with imported data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      showToast(err.message || "Failed to restore backup.", "error");
      setIsRestoring(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="main-content">
        <Navbar pageTitle="Backup &amp; Restore" onMenuClick={() => setSidebarOpen(true)} />

        <div className="page-body" style={{ maxWidth: "800px" }}>
          
          {/* Header Panel */}
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <DatabaseBackup size={22} color="var(--accent-primary)" />
              <h3 style={{ margin: 0 }}>System Maintenance</h3>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Keep your records safe. You can export the current database status (student registry, attendance logs, settings, and teacher accounts) as a JSON file, or restore from a previously exported backup archive.
            </p>
          </div>

          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: "1rem" }}>
            
            {/* Export Section */}
            <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "220px" }}>
              <div>
                <h4 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <Download size={18} color="var(--success)" />
                  <span>Export Database</span>
                </h4>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  Download a complete backup archive of the application data in JSON format. Store it securely on your local device.
                </p>
              </div>

              <button className="btn btn-primary" onClick={handleExportBackup} style={{ width: "fit-content", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)", marginTop: "1.5rem" }}>
                <Download size={16} />
                <span>Export JSON Backup</span>
              </button>
            </div>

            {/* Import Section */}
            <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "220px" }}>
              <div>
                <h4 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <Upload size={18} color="var(--accent-primary)" />
                  <span>Restore Database</span>
                </h4>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  Select a valid `.json` backup file to restore records. This will overwrite all active students, classes, and logs.
                </p>

                {/* File Upload Selector */}
                <div style={{ marginTop: "1rem" }}>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    style={{ display: "none" }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary w-full"
                    onClick={() => fileInputRef.current.click()}
                    style={{ borderStyle: "dashed", gap: "0.5rem", justifyContent: "center" }}
                  >
                    <Upload size={16} />
                    <span>{fileName ? fileName : "Choose JSON Backup File"}</span>
                  </button>
                </div>
              </div>

              <button 
                className="btn btn-primary" 
                onClick={handleRestoreClick}
                disabled={!backupFileContent || isRestoring}
                style={{ width: "fit-content", marginTop: "1.5rem" }}
              >
                {isRestoring ? (
                  <>
                    <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
                    <span>Restoring Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    <span>Upload &amp; Restore</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Overwrite Warning Box */}
          <div className="glass-panel risk-alert high" style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <ShieldAlert size={20} style={{ flexShrink: "0" }} />
            <div style={{ fontSize: "0.8rem", lineHeight: "1.5" }}>
              <strong>Caution on Restoring backups:</strong> Re-uploading a database JSON archive is a complete write-over process. It will completely overwrite the local storage registry. Be sure to export your current log history first if you wish to preserve it.
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM SYSTEM OVERWRITE MODAL */}
      <ConfirmDialog 
        isOpen={isConfirmOpen}
        title="Restore Attendance Data?"
        message={`Are you sure you want to restore data from "${fileName}"? This action will permanently overwrite all student files, attendance sheets, and configurations current to this machine. This process cannot be undone.`}
        confirmText="Confirm Overwrite &amp; Restore"
        cancelText="Cancel"
        onConfirm={handleConfirmRestore}
        onCancel={() => setIsConfirmOpen(false)}
        type="danger"
      />
    </div>
  );
}
