import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import AttendanceStats from "../components/AttendanceStats";

export default function FacultyDashboard() {
  const [records, setRecords] = useState([]);
  const [absentees, setAbsentees] = useState([]);
  const [students, setStudents] = useState([]);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [markDate, setMarkDate] = useState(todayStr);
  const [filterDate, setFilterDate] = useState("");
  
  const [view, setView] = useState("mark"); // 'mark', 'all', 'absentees', 'students'
  
  // Edit Student State
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editStudentId, setEditStudentId] = useState("");

  const { token, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    fetchRecords();
    fetchAbsentees();
    fetchStudents();
  }, [filterDate]);

  const fetchRecords = async () => {
    try {
      const url = filterDate 
        ? `${API_BASE}/attendance/all?date=${filterDate}` 
        : `${API_BASE}/attendance/all`;
      const res = await fetch(url, { headers: { Authorization: token } });
      if (res.ok) setRecords(await res.json());
    } catch (err) {
      console.error("Failed to fetch records", err);
    }
  };

  const fetchAbsentees = async () => {
    try {
      const url = filterDate 
        ? `${API_BASE}/attendance/absentees?date=${filterDate}` 
        : `${API_BASE}/attendance/absentees`;
      const res = await fetch(url, { headers: { Authorization: token } });
      if (res.ok) setAbsentees(await res.json());
    } catch (err) {
      console.error("Failed to fetch absentees", err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_BASE}/attendance/students`, {
        headers: { Authorization: token }
      });
      if (res.ok) setStudents(await res.json());
    } catch (err) {
      console.error("Failed to fetch students", err);
    }
  };

  const markAttendance = async (student_id, status) => {
    if (!markDate) return alert("Please select a date first.");
    try {
      const res = await fetch(`${API_BASE}/attendance/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ student_id, status, date: markDate })
      });
      if (!res.ok) throw new Error("Failed");
      fetchRecords();
      fetchAbsentees();
    } catch (err) {
      console.error("Failed to mark attendance", err);
      alert("Failed to mark attendance.");
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const student_id = e.target.student_id.value;
    const password = "password"; // Default password for newly added students
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, student_id, password, role: 'student' })
      });
      if (!res.ok) throw new Error("Failed");
      e.target.reset();
      fetchStudents();
      alert("Student added successfully!");
    } catch (err) {
      alert("Failed to add student.");
    }
  };

  const handleUpdateStudent = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ name: editName, student_id: editStudentId })
      });
      if (!res.ok) throw new Error("Failed");
      setEditingId(null);
      fetchStudents();
      fetchRecords();
    } catch (err) {
      alert("Failed to update student.");
    }
  };

  const handleDeleteStudent = async (id) => {
    if(!window.confirm("Are you sure you want to delete this student and all their attendance records?")) return;
    try {
      const res = await fetch(`${API_BASE}/students/${id}`, {
        method: "DELETE",
        headers: { Authorization: token }
      });
      if (!res.ok) throw new Error("Failed");
      fetchStudents();
      fetchRecords();
    } catch (err) {
      alert("Failed to delete student.");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const displayedRecords = view === "all" ? records : absentees;

  return (
    <div className="dashboard-container">
      <nav className="navbar glass-panel">
        <div className="nav-brand">Faculty Portal</div>
        <div className="nav-user">
          <span>Welcome, {user?.name || "Faculty"}</span>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <aside className="sidebar glass-panel">
          <button className={`nav-btn ${view === "mark" ? "active" : ""}`} onClick={() => setView("mark")}>
            Mark Attendance
          </button>
          <button className={`nav-btn ${view === "all" ? "active" : ""}`} onClick={() => setView("all")}>
            All Records
          </button>
          <button className={`nav-btn ${view === "absentees" ? "active" : ""}`} onClick={() => setView("absentees")}>
            Absentees
          </button>
          <button className={`nav-btn ${view === "students" ? "active" : ""}`} onClick={() => setView("students")}>
            Manage Students
          </button>
        </aside>

        <main className="main-panel glass-panel">
          <header className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>
              {view === "mark" ? "Mark Attendance" : 
               view === "all" ? "All Attendance Records" : 
               view === "students" ? "Manage Students" :
               "Absentees"}
            </h2>
            
            {view === "mark" && (
               <div>
                  <label style={{marginRight: '10px'}}>Date:</label>
                  <input type="date" value={markDate} onChange={(e) => setMarkDate(e.target.value)} style={{padding: '5px', borderRadius: '4px', border: '1px solid #ccc', background: 'transparent', color: 'white'}} />
               </div>
            )}

            {(view === "all" || view === "absentees") && (
               <div>
                  <label style={{marginRight: '10px'}}>Filter by Date:</label>
                  <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{padding: '5px', borderRadius: '4px', border: '1px solid #ccc', background: 'transparent', color: 'white'}} />
                  <button onClick={() => setFilterDate("")} style={{marginLeft: '5px', padding: '5px', background: 'transparent', color: 'white', border: 'none', cursor: 'pointer', textDecoration: 'underline'}}>Clear</button>
               </div>
            )}
          </header>

          {view === "mark" && (
            <AttendanceStats students={students} records={records} />
          )}

          <div className="table-container">
            {view === "students" ? (
               <div style={{ padding: '1rem' }}>
                  <form onSubmit={handleAddStudent} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                     <input name="name" placeholder="Student Name" required style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #444', background: 'rgba(255,255,255,0.1)', color: 'white' }} />
                     <input name="student_id" type="text" placeholder="Student ID" required style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #444', background: 'rgba(255,255,255,0.1)', color: 'white' }} />
                     <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>Add Student</button>
                  </form>
                  <table className="data-table">
                    <thead><tr><th>Name</th><th>Student ID</th><th>Actions</th></tr></thead>
                    <tbody>
                      {students.map(s => (
                        <tr key={s.id}>
                          <td>
                             {editingId === s.id ? <input value={editName} onChange={e=>setEditName(e.target.value)} style={{color:'black'}}/> : s.name}
                          </td>
                          <td>
                             {editingId === s.id ? <input value={editStudentId} onChange={e=>setEditStudentId(e.target.value)} style={{color:'black'}}/> : s.student_id}
                          </td>
                          <td>
                             {editingId === s.id ? (
                                <>
                                  <button onClick={() => handleUpdateStudent(s.id)} style={{marginRight:'5px', color:'green'}}>Save</button>
                                  <button onClick={() => setEditingId(null)} style={{color:'gray'}}>Cancel</button>
                                </>
                             ) : (
                                <>
                                  <button onClick={() => { setEditingId(s.id); setEditName(s.name); setEditStudentId(s.student_id); }} style={{marginRight:'10px', color:'#60a5fa', background:'none', border:'none', cursor:'pointer'}}>Edit</button>
                                  <button onClick={() => handleDeleteStudent(s.id)} style={{color:'#f87171', background:'none', border:'none', cursor:'pointer'}}>Delete</button>
                                </>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            ) : view === "mark" ? (
              <table className="data-table">
                <thead><tr><th>Student Name</th><th>Student ID</th><th>Action</th></tr></thead>
                <tbody>
                  {students.length > 0 ? students.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td><td>{s.student_id}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-success" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => markAttendance(s.id, "Present")}>Present</button>
                          <button className="btn-danger" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => markAttendance(s.id, "Absent")}>Absent</button>
                        </div>
                      </td>
                    </tr>
                  )) : <tr><td colSpan="3" className="empty-state">No students found.</td></tr>}
                </tbody>
              </table>
            ) : (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Student Name</th><th>Student ID</th><th>Status</th></tr></thead>
                <tbody>
                  {displayedRecords.length > 0 ? displayedRecords.map((r) => (
                    <tr key={r.id}>
                      <td>{new Date(r.date).toLocaleDateString()}</td><td>{r.name}</td><td>{r.student_id}</td>
                      <td><span className={`status-badge ${r.status.toLowerCase()}`}>{r.status}</span></td>
                    </tr>
                  )) : <tr><td colSpan="4" className="empty-state">No records found.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
