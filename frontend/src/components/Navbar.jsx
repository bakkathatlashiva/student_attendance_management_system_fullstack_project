import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { AttendanceContext } from "../context/AttendanceContext";
import { Sun, Moon, Menu, User } from "lucide-react";

export default function Navbar({ pageTitle = "Dashboard", onMenuClick }) {
  const { user } = useContext(AuthContext);
  const { settings, toggleTheme } = useContext(AttendanceContext);

  return (
    <>
      {/* Mobile Top Header Bar */}
      <div className="mobile-header-bar">
        <button className="menu-toggle-btn" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <span className="sidebar-logo" style={{ fontSize: "1.1rem" }}>🎓 Attendance</span>
        <button className="theme-toggle-btn" onClick={toggleTheme}>
          {settings.theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Desktop Navbar */}
      <header className="navbar">
        <div className="navbar-left">
          <h1>{pageTitle}</h1>
        </div>

        <div className="navbar-right">
          <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Dark/Light Mode">
            {settings.theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className="user-profile">
            <User size={16} />
            <span>{user?.name || "Teacher Account"}</span>
            <span style={{ fontSize: "0.75rem", padding: "1px 6px", background: "var(--accent-primary)", borderRadius: "4px", color: "white", marginLeft: "4px" }}>
              {user?.role === "faculty" ? "Faculty" : "Staff"}
            </span>
          </div>
        </div>
      </header>
    </>
  );
}
