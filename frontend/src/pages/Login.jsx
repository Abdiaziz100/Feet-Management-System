import { useState } from "react";
import api from "../api";
import "./../styles/main.css";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/login", { username, password });
      if (response.data.success) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onLogin();
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.error || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>
      
      <div className="login-content">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-container">
              <div className="logo-icon">🚚</div>
              <h1>FleetKE</h1>
            </div>
            <h2>Fleet Management System</h2>
            <p>Manage your fleet with precision and control</p>
          </div>

          {error && (
            <div className="error-message" style={{
              background: '#fee',
              color: '#c00',
              padding: '10px',
              borderRadius: '8px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label>Username</label>
              <div className="input-container">
                <span className="input-icon">👤</span>
                <input 
                  type="text" 
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-container">
                <span className="input-icon">🔒</span>
                <input 
                  type="password" 
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="login-options">
              <label className="checkbox-container">
                <input type="checkbox" disabled />
                <span className="checkmark"></span>
                Remember me
              </label>
              <span className="forgot-link" style={{cursor: 'default'}}>
                Contact admin for password reset
              </span>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="login-footer">
            <div className="demo-credentials">
              <h4>Default Credentials:</h4>
              <p><strong>Username:</strong> admin</p>
              <p><strong>Password:</strong> password</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

