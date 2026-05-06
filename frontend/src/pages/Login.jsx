import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState("faculty");
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const endpoint = isLogin ? "login" : "signup";
      const payload = isLogin 
        ? { email, password, role } 
        : { name, email, password, role };

      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Authentication failed.");
      const { token, user } = data;
      login(token, user);
      
      if (user.role === "faculty") {
        navigate("/faculty-dashboard");
      }
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <div className="glass-panel login-card">
        <div className="logo-placeholder">
          <div className="logo-icon"></div>
        </div>
        
        <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
        <p className="subtitle">
          {isLogin ? "Sign in to your account" : "Register to access the system"}
        </p>

        <div className="role-selector">
          <button 
            className={`role-btn ${role === "faculty" ? "active" : ""}`}
            onClick={() => setRole("faculty")}
            type="button"
          >
            Faculty
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleAuth} className="login-form">
          {!isLogin && (
            <div className="input-group">
              <label>Full Name</label>
              <input 
                type="text" 
                placeholder="John Doe" 
                value={name}
                onChange={(e)=>setName(e.target.value)} 
                required={!isLogin}
              />
            </div>
          )}
          <div className="input-group">
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="name@gmail.com" 
              value={email}
              onChange={(e)=>setEmail(e.target.value)} 
              required
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e)=>setPassword(e.target.value)} 
              required
            />
          </div>
          
          <button type="submit" className="btn-primary w-full">
            {isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="auth-switch">
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              type="button" 
              className="btn-text" 
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
