import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import { LogIn, UserPlus, KeyRound, Mail, User, ShieldAlert } from "lucide-react";

export default function Login() {
  const [viewState, setViewState] = useState("login"); // 'login' | 'register' | 'forgot'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login, signup, forgotPassword } = useContext(AuthContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (viewState === "login") {
        await login(email, password);
        showToast("Logged in successfully! Welcome back.", "success");
        navigate("/dashboard");
      } else if (viewState === "register") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        await signup(name, email, password);
        showToast("Registration successful! Account created.", "success");
        navigate("/dashboard");
      } else if (viewState === "forgot") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        await forgotPassword(email, password);
        showToast("Credentials updated successfully. Please log in.", "success");
        setViewState("login");
        setName("");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      showToast(err.message || "Authentication failed. Try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card-v2 glass-panel">
        <div className="login-icon-box">
          <KeyRound size={28} />
        </div>

        <h2 style={{ textAlign: "center", marginBottom: "0.25rem", fontWeight: "800", fontSize: "1.75rem" }}>
          {viewState === "login" ? "Welcome Back" : viewState === "register" ? "Create Account" : "Reset Password"}
        </h2>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "2rem" }}>
          {viewState === "login" 
            ? "Sign in to manage student attendance" 
            : viewState === "register" 
              ? "Register as a faculty administrator" 
              : "Enter details to reset administrator credentials"}
        </p>

        {/* Tab switcher */}
        <div className="login-tab-container">
          <div 
            className={`login-tab ${viewState === "login" ? "active" : ""}`}
            onClick={() => { setViewState("login"); resetFormFields(); }}
          >
            Sign In
          </div>
          <div 
            className={`login-tab ${viewState === "register" ? "active" : ""}`}
            onClick={() => { setViewState("register"); resetFormFields(); }}
          >
            Register
          </div>
          <div 
            className={`login-tab ${viewState === "forgot" ? "active" : ""}`}
            onClick={() => { setViewState("forgot"); resetFormFields(); }}
          >
            Forgot Password
          </div>
        </div>

        <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {viewState === "register" && (
            <div>
              <span className="label-title">Full Name</span>
              <div style={{ position: "relative" }}>
                <User size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Prof. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: "2.5rem" }}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <span className="label-title">Email Address</span>
            <div style={{ position: "relative" }}>
              <Mail size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input 
                type="email" 
                className="input-field" 
                placeholder="teacher@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: "2.5rem" }}
                required
              />
            </div>
          </div>

          <div>
            <span className="label-title">
              {viewState === "forgot" ? "New Password" : "Password"}
            </span>
            <div style={{ position: "relative" }}>
              <KeyRound size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: "2.5rem" }}
                required
              />
            </div>
          </div>

          {(viewState === "register" || viewState === "forgot") && (
            <div>
              <span className="label-title">Confirm Password</span>
              <div style={{ position: "relative" }}>
                <KeyRound size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingLeft: "2.5rem" }}
                  required
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary w-full" 
            style={{ marginTop: "0.5rem", padding: "0.75rem" }}
            disabled={isLoading}
          >
            {isLoading ? (
              <div style={{ width: "20px", height: "20px", border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }}></div>
            ) : viewState === "login" ? (
              <>
                <LogIn size={18} />
                <span>Sign In</span>
              </>
            ) : viewState === "register" ? (
              <>
                <UserPlus size={18} />
                <span>Create Account</span>
              </>
            ) : (
              <>
                <ShieldAlert size={18} />
                <span>Reset Credentials</span>
              </>
            )}
          </button>
        </form>

        {viewState === "login" && (
          <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            <p>Admin / Teacher Portal</p>
          </div>
        )}
      </div>
    </div>
  );

  function resetFormFields() {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }
}
