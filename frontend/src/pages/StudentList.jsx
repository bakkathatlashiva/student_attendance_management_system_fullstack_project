import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ConfirmDialog from "../components/ConfirmDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentAPI } from "../services/api";
import { useToast } from "../components/Toast";
import { drawQRCodeToCanvas } from "../utils/qrCodeGenerator";
import { 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  QrCode, 
  X, 
  Download, 
  PlusCircle, 
  Check,
  FileSpreadsheet,
  Upload,
  User,
  Image as ImageIcon
} from "lucide-react";

export default function StudentList() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterYear, setFilterYear] = useState("");

  // Modals & Forms State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Form Fields State
  const [currentStudentId, setCurrentStudentId] = useState(null);
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [branch, setBranch] = useState("CSE");
  const [department, setDepartment] = useState("CSE");
  const [section, setSection] = useState("A");
  const [year, setYear] = useState("3rd Year");
  const [semester, setSemester] = useState("5th Sem");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("Male");
  const [bloodGroup, setBloodGroup] = useState("");
  const [address, setAddress] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentContact, setParentContact] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  // Bulk Upload File / Text State
  const [bulkInputType, setBulkInputType] = useState("csv");
  const [bulkText, setBulkText] = useState("");
  const [bulkFile, setBulkFile] = useState(null);

  // Selected student for QR display or deletion
  const [selectedStudent, setSelectedStudent] = useState(null);
  const qrCanvasRef = useRef(null);

  // Constants
  const branches = ["CSE", "IT", "AIML", "Data Science", "Cyber Security"];
  const sections = ["A", "B", "C"];
  const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const semesters = ["1st Sem", "2nd Sem", "3rd Sem", "4th Sem", "5th Sem", "6th Sem", "7th Sem", "8th Sem"];
  const genders = ["Male", "Female", "Other"];

  // Query - Fetch Students from Backend
  const { data: studentsData, isLoading, refetch } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentAPI.list()
  });

  const students = studentsData?.students || [];

  // Draw QR code to canvas inside QR modal when selectedStudent changes
  useEffect(() => {
    if (isQrOpen && selectedStudent && qrCanvasRef.current) {
      drawQRCodeToCanvas(qrCanvasRef.current, selectedStudent.rollNumber);
    }
  }, [isQrOpen, selectedStudent]);

  // Mutations
  const addMutation = useMutation({
    mutationFn: (formData) => studentAPI.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries(["students"]);
      showToast("Student created successfully", "success");
      setIsAddOpen(false);
      resetForm();
    },
    onError: (err) => {
      showToast(err.response?.data?.msg || err.message || "Failed to create student", "error");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }) => studentAPI.update(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries(["students"]);
      showToast("Student updated successfully", "success");
      setIsEditOpen(false);
      resetForm();
    },
    onError: (err) => {
      showToast(err.response?.data?.msg || err.message || "Failed to update student", "error");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => studentAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["students"]);
      showToast("Student deleted successfully", "success");
      setIsDeleteOpen(false);
      setSelectedStudent(null);
    },
    onError: (err) => {
      showToast(err.response?.data?.msg || err.message || "Failed to delete student", "error");
    }
  });

  const bulkMutation = useMutation({
    mutationFn: (studentsArray) => studentAPI.bulkUpload(studentsArray),
    onSuccess: (data) => {
      queryClient.invalidateQueries(["students"]);
      showToast(data.msg || "Bulk upload completed successfully", "success");
      setIsBulkOpen(false);
      setBulkText("");
      setBulkFile(null);
    },
    onError: (err) => {
      showToast(err.response?.data?.msg || err.message || "Bulk upload failed", "error");
    }
  });

  // Photo change handler
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Build FormData from state
  const buildFormData = () => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("rollNumber", rollNumber.toUpperCase());
    formData.append("registrationNumber", registrationNumber.toUpperCase());
    formData.append("branch", branch);
    formData.append("department", department);
    formData.append("section", section);
    formData.append("year", year);
    formData.append("semester", semester);
    formData.append("mobile", mobile);
    formData.append("email", email.toLowerCase());
    formData.append("gender", gender);
    formData.append("bloodGroup", bloodGroup);
    formData.append("address", address);
    formData.append("parentName", parentName);
    formData.append("parentContact", parentContact);
    if (photoFile) {
      formData.append("photo", photoFile);
    }
    return formData;
  };

  // Handle Add Student
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!name || !rollNumber || !registrationNumber || !mobile || !email || !parentName || !parentContact) {
      showToast("Please fill in all required fields.", "error");
      return;
    }
    addMutation.mutate(buildFormData());
  };

  // Handle Edit Student
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!name || !rollNumber || !registrationNumber || !mobile || !email || !parentName || !parentContact) {
      showToast("Please fill in all required fields.", "error");
      return;
    }
    updateMutation.mutate({ id: currentStudentId, formData: buildFormData() });
  };

  // Handle Delete Confirmation
  const confirmDelete = () => {
    if (selectedStudent) {
      const id = selectedStudent._id || selectedStudent.id;
      deleteMutation.mutate(id);
    }
  };

  // Trigger Edit Modal Opening
  const openEditModal = (student) => {
    setCurrentStudentId(student._id || student.id);
    setName(student.name);
    setRollNumber(student.rollNumber);
    setRegistrationNumber(student.registrationNumber || "");
    setBranch(student.branch);
    setDepartment(student.department || "CSE");
    setSection(student.section);
    setYear(student.year);
    setSemester(student.semester || "5th Sem");
    setMobile(student.mobile || "");
    setEmail(student.email || "");
    setGender(student.gender || "Male");
    setBloodGroup(student.bloodGroup || "");
    setAddress(student.address || "");
    setParentName(student.parentName || "");
    setParentContact(student.parentContact || "");
    setPhotoPreview(student.photoUrl || "");
    setPhotoFile(null);
    setIsEditOpen(true);
  };

  // CSV client-side parser
  const parseCSV = (text) => {
    const lines = text.split("\n");
    const result = [];
    const headers = lines[0].split(",").map(h => h.trim());

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const obj = {};
      const currentline = lines[i].split(",");

      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = currentline[j] ? currentline[j].trim() : "";
      }
      result.push(obj);
    }
    return result;
  };

  // Handle Bulk Upload Submission
  const handleBulkSubmit = (e) => {
    e.preventDefault();
    let dataToUpload = [];

    try {
      if (bulkInputType === "json") {
        dataToUpload = JSON.parse(bulkText);
        if (!Array.isArray(dataToUpload)) {
          throw new Error("JSON must be an array of student objects.");
        }
      } else {
        if (!bulkText.trim()) {
          showToast("Please enter CSV text.", "error");
          return;
        }
        dataToUpload = parseCSV(bulkText);
      }

      if (dataToUpload.length === 0) {
        showToast("No records parsed.", "error");
        return;
      }

      bulkMutation.mutate(dataToUpload);
    } catch (err) {
      showToast("Parsing failed: " + err.message, "error");
    }
  };

  // Handle bulk file selection
  const handleBulkFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBulkFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        setBulkText(evt.target.result);
      };
      reader.readAsText(file);
    }
  };

  // Download QR Code from canvas
  const downloadQRCode = () => {
    if (!qrCanvasRef.current || !selectedStudent) return;
    const canvas = qrCanvasRef.current;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `QR_${selectedStudent.name.replace(/\s+/g, "_")}_${selectedStudent.rollNumber}.png`;
    link.href = url;
    link.click();
    showToast("QR code downloaded.", "info");
  };

  const resetForm = () => {
    setCurrentStudentId(null);
    setName("");
    setRollNumber("");
    setRegistrationNumber("");
    setBranch("CSE");
    setDepartment("CSE");
    setSection("A");
    setYear("3rd Year");
    setSemester("5th Sem");
    setMobile("");
    setEmail("");
    setGender("Male");
    setBloodGroup("");
    setAddress("");
    setParentName("");
    setParentContact("");
    setPhotoFile(null);
    setPhotoPreview("");
  };

  // Filter & Search Logic
  const filteredStudents = students.filter((s) => {
    const nameStr = s.name || "";
    const rollStr = s.rollNumber || "";
    const regStr = s.registrationNumber || "";
    const matchesSearch = 
      nameStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rollStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      regStr.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBranch = filterBranch ? s.branch === filterBranch : true;
    const matchesSection = filterSection ? s.section === filterSection : true;
    const matchesYear = filterYear ? s.year === filterYear : true;

    return matchesSearch && matchesBranch && matchesSection && matchesYear;
  });

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="main-content">
        <Navbar pageTitle="Manage Students" onMenuClick={() => setSidebarOpen(true)} />

        <div className="page-body">
          {/* Header Controls */}
          <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <UserPlus size={20} color="var(--accent-primary)" />
              <h3 style={{ margin: 0 }}>Student Registry ({filteredStudents.length})</h3>
            </div>
            
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-secondary" onClick={() => setIsBulkOpen(true)}>
                <Upload size={16} />
                <span>Bulk Import</span>
              </button>
              <button className="btn btn-primary" onClick={() => { resetForm(); setIsAddOpen(true); }}>
                <UserPlus size={18} />
                <span>Add Student</span>
              </button>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="glass-panel filter-bar">
            <div className="filter-group" style={{ minWidth: "220px", flex: "2" }}>
              <span className="label-title">Search Student</span>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Search Name, Roll, or Reg..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: "2.5rem" }}
                />
              </div>
            </div>

            <div className="filter-group">
              <span className="label-title">Filter by Branch</span>
              <select className="input-field" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <span className="label-title">Filter by Section</span>
              <select className="input-field" value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
                <option value="">All Sections</option>
                {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <span className="label-title">Filter by Year</span>
              <select className="input-field" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                <option value="">All Years</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Student Grid / Table View */}
          <div className="glass-panel table-card">
            {isLoading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 0", gap: "1rem" }}>
                <div style={{ width: "35px", height: "35px", border: "3px solid var(--accent-primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Loading student records...</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>Student Details</th>
                      <th>Roll / Registration</th>
                      <th>Branch & Dept</th>
                      <th>Class & Section</th>
                      <th>Parent Info</th>
                      <th>Contact Info</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
                        <tr key={student._id || student.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              <img 
                                src={student.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"} 
                                alt={student.name}
                                style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border-glass)" }}
                              />
                              <div>
                                <div style={{ fontWeight: "600" }}>{student.name}</div>
                                <div style={{ fontSize: "0.725rem", color: "var(--text-secondary)" }}>
                                  {student.gender} | Blood: {student.bloodGroup || "N/A"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                              <span style={{ fontFamily: "monospace", fontSize: "0.8rem", background: "rgba(0,0,0,0.15)", padding: "2px 6px", borderRadius: "4px", width: "fit-content" }}>
                                {student.rollNumber}
                              </span>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "4px" }}>
                                Reg: {student.registrationNumber || "N/A"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div>{student.branch}</div>
                            <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>Dept: {student.department || "CSE"}</div>
                          </td>
                          <td>
                            <div>{student.year}</div>
                            <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>Sec {student.section} ({student.semester || "5th Sem"})</div>
                          </td>
                          <td>
                            <div style={{ fontSize: "0.8rem" }}>{student.parentName || "N/A"}</div>
                            <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>{student.parentContact || "N/A"}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: "0.8rem" }}>{student.email}</div>
                            <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>{student.mobile}</div>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: "0.4rem", borderRadius: "6px" }} 
                                title="View QR Code"
                                onClick={() => { setSelectedStudent(student); setIsQrOpen(true); }}
                              >
                                <QrCode size={15} color="var(--accent-primary)" />
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: "0.4rem", borderRadius: "6px" }} 
                                title="Edit Details"
                                onClick={() => openEditModal(student)}
                              >
                                <Edit2 size={15} color="#3b82f6" />
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: "0.4rem", borderRadius: "6px" }} 
                                title="Delete Student"
                                onClick={() => { setSelectedStudent(student); setIsDeleteOpen(true); }}
                              >
                                <Trash2 size={15} color="var(--danger)" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7">
                          <div className="empty-state">
                            <Search size={32} style={{ color: "var(--text-muted)" }} />
                            <h4 style={{ margin: 0 }}>No Students Found</h4>
                            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                              Try adjusting your filters or search terms.
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

      {/* ADD / EDIT STUDENT MODAL */}
      {(isAddOpen || isEditOpen) && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel" style={{ maxWidth: "700px" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <PlusCircle size={18} color="var(--accent-primary)" />
                <h3 className="modal-title" style={{ margin: 0 }}>
                  {isAddOpen ? "Register Student ERP Account" : "Edit Student ERP Profile"}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); resetForm(); }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={isAddOpen ? handleAddSubmit : handleEditSubmit}>
              <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem" }}>
                
                {/* Form Section: Profile Photo */}
                <div style={{ display: "flex", gap: "1.25rem", alignItems: "center", borderBottom: "1px solid var(--border-glass)", paddingBottom: "1.25rem" }}>
                  <div style={{ position: "relative" }}>
                    <img 
                      src={photoPreview || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"}
                      alt="Preview"
                      style={{ width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", border: "3px solid var(--accent-primary)" }}
                    />
                    <label style={{ position: "absolute", bottom: 0, right: 0, background: "var(--accent-primary)", padding: "0.35rem", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ImageIcon size={14} color="#fff" />
                      <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
                    </label>
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 0.25rem 0" }}>Profile Photo</h4>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      Upload high-resolution passport photo. Supported formats: JPG, PNG. Max size: 3MB.
                    </p>
                  </div>
                </div>

                {/* Form Grid: Academic Details */}
                <h4 style={{ margin: "0.5rem 0 0 0", color: "var(--accent-primary)" }}>Academic Record</h4>
                <div className="form-grid">
                  <div>
                    <span className="label-title">Full Name *</span>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Alice Smith"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <span className="label-title">Roll Number (Unique ID) *</span>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. CSE-2023-010"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      required
                      disabled={isEditOpen}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <span className="label-title">Registration Number (College Registry) *</span>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. REG-2023-1001"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <span className="label-title">Branch *</span>
                    <select className="input-field" value={branch} onChange={(e) => setBranch(e.target.value)}>
                      {branches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <span className="label-title">Department *</span>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. CSE"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <span className="label-title">Section *</span>
                    <select className="input-field" value={section} onChange={(e) => setSection(e.target.value)}>
                      {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <span className="label-title">Academic Year *</span>
                    <select className="input-field" value={year} onChange={(e) => setYear(e.target.value)}>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>

                  <div>
                    <span className="label-title">Current Semester *</span>
                    <select className="input-field" value={semester} onChange={(e) => setSemester(e.target.value)}>
                      {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Form Grid: Personal Details */}
                <h4 style={{ margin: "0.5rem 0 0 0", color: "var(--accent-primary)" }}>Personal & Contact Details</h4>
                <div className="form-grid">
                  <div>
                    <span className="label-title">Email Address *</span>
                    <input 
                      type="email" 
                      className="input-field" 
                      placeholder="e.g. student@college.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <span className="label-title">Mobile Number *</span>
                    <input 
                      type="tel" 
                      className="input-field" 
                      placeholder="e.g. 9876543210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <span className="label-title">Gender *</span>
                    <select className="input-field" value={gender} onChange={(e) => setGender(e.target.value)}>
                      {genders.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div>
                    <span className="label-title">Blood Group</span>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. O+, A-"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <span className="label-title">Residential Address</span>
                  <textarea 
                    className="input-field" 
                    placeholder="Enter permanent address..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ minHeight: "60px", resize: "vertical" }}
                  />
                </div>

                {/* Form Grid: Parent Details */}
                <h4 style={{ margin: "0.5rem 0 0 0", color: "var(--accent-primary)" }}>Parent / Guardian Details</h4>
                <div className="form-grid">
                  <div>
                    <span className="label-title">Parent/Guardian Name *</span>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Robert Smith"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <span className="label-title">Parent Contact Number *</span>
                    <input 
                      type="tel" 
                      className="input-field" 
                      placeholder="e.g. 9876543221"
                      value={parentContact}
                      onChange={(e) => setParentContact(e.target.value)}
                      required
                    />
                  </div>
                </div>

              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={addMutation.isPending || updateMutation.isPending}>
                  <Check size={18} />
                  <span>{isAddOpen ? "Save Student Profile" : "Update Student Profile"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK UPLOAD MODAL */}
      {isBulkOpen && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel" style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FileSpreadsheet size={18} color="var(--accent-primary)" />
                <h3 className="modal-title" style={{ margin: 0 }}>Bulk Import Students</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsBulkOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleBulkSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                
                <div style={{ display: "flex", gap: "1rem", marginBottom: "0.5rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
                    <input type="radio" checked={bulkInputType === "csv"} onChange={() => setBulkInputType("csv")} />
                    <span>CSV Format</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
                    <input type="radio" checked={bulkInputType === "json"} onChange={() => setBulkInputType("json")} />
                    <span>JSON Format</span>
                  </label>
                </div>

                {bulkInputType === "csv" ? (
                  <div>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                      CSV must contain a header row. Fields: <code style={{ color: "var(--accent-primary)" }}>name, rollNumber, registrationNumber, email, mobile, branch, department, section, year, semester, parentName, parentContact</code>
                    </p>
                    <input 
                      type="file" 
                      accept=".csv" 
                      className="input-field" 
                      onChange={handleBulkFileChange}
                      style={{ marginBottom: "0.75rem" }}
                    />
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                      Paste a JSON array of student objects matching the API contract.
                    </p>
                  </div>
                )}

                <div>
                  <span className="label-title">Data Editor</span>
                  <textarea 
                    className="input-field" 
                    placeholder={bulkInputType === "csv" 
                      ? "name, rollNumber, registrationNumber, email, mobile, branch, department, section, year, semester, parentName, parentContact\nJohn Doe, CSE-2023-011, REG-2023-1011, john@gmail.com, 9876543201, CSE, CSE, A, 3rd Year, 5th Sem, Mark Doe, 9876543202"
                      : "[\n  {\n    \"name\": \"John Doe\",\n    \"rollNumber\": \"CSE-2023-011\",\n    \"registrationNumber\": \"REG-2023-1011\",\n    \"email\": \"john@gmail.com\",\n    \"mobile\": \"9876543201\",\n    \"parentName\": \"Mark Doe\",\n    \"parentContact\": \"9876543202\"\n  }\n]"
                    }
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    style={{ minHeight: "180px", fontFamily: "monospace", fontSize: "0.8rem", resize: "vertical" }}
                  />
                </div>

              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsBulkOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={bulkMutation.isPending}>
                  <Upload size={16} />
                  <span>{bulkMutation.isPending ? "Uploading..." : "Import Database Records"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE GENERATOR DISPLAY MODAL */}
      {isQrOpen && selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel" style={{ maxWidth: "380px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ margin: 0 }}>Student QR Code</h3>
              <button className="modal-close-btn" onClick={() => { setIsQrOpen(false); setSelectedStudent(null); }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body qr-card">
              <h4 style={{ margin: 0, fontSize: "1.1rem" }}>{selectedStudent.name}</h4>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                ID: {selectedStudent.rollNumber} | Branch: {selectedStudent.branch}
              </p>
              
              <div className="qr-canvas-wrapper">
                <canvas ref={qrCanvasRef}></canvas>
              </div>

              <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                This QR Code encodes the student's unique Registration Roll Number.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: "center" }}>
              <button className="btn btn-primary" onClick={downloadQRCode} style={{ gap: "0.5rem" }}>
                <Download size={16} />
                <span>Download QR PNG</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog 
        isOpen={isDeleteOpen}
        title="Delete Student Record"
        message={`Are you sure you want to delete ${selectedStudent?.name}? This will remove the student from the database and permanently wipe all their attendance logs. This action is irreversible.`}
        onConfirm={confirmDelete}
        onCancel={() => { setIsDeleteOpen(false); setSelectedStudent(null); }}
        confirmText="Yes, Delete Record"
        cancelText="Cancel"
      />
    </div>
  );
}
