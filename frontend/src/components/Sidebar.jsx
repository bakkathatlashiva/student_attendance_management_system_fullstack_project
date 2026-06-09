import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { 
  LayoutDashboard, 
  UserCheck, 
  CalendarRange, 
  Users, 
  BrainCircuit, 
  DatabaseBackup, 
  LogOut, 
  X,
  Sparkles
} from "lucide-react";

export default function Sidebar({ isOpen, onClose }) {
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
    if (onClose) onClose();
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "Mark Attendance", path: "/mark", icon: <UserCheck size={20} /> },
    { name: "Attendance History", path: "/history", icon: <CalendarRange size={20} /> },
    { name: "Manage Students", path: "/students", icon: <Users size={20} /> },
    { name: "AI Predictor", path: "/predictor", icon: <BrainCircuit size={20} /> },
    { name: "AI Assistant & Reports", path: "/ai-insights", icon: <Sparkles size={20} /> },
    { name: "Backup & Restore", path: "/backup", icon: <DatabaseBackup size={20} /> },
  ];

  return (
    <aside className={`sidebar ${isOpen ? "mobile-open" : ""}`}>
      <div className="sidebar-header">
        <span className="sidebar-logo">🎓 AttendanceApp</span>
        {onClose && (
          <button 
            className="menu-toggle-btn" 
            style={{ marginLeft: "auto", display: "none" /* Handled by CSS media queries */ }} 
            onClick={onClose}
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="sidebar-menu">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            onClick={onClose}
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="btn btn-secondary w-full" onClick={handleLogout} style={{ justifyContent: "flex-start", border: "1px solid var(--danger-border)", color: "var(--danger)" }}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
