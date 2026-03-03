import React, { useState } from 'react';
import { login } from '../api';
import '../styles/Login.css';

function EnhancedLogin({ onLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    mfaCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(
        formData.username, 
        formData.password, 
        formData.mfaCode || null
      );

      if (result.mfa_required) {
        setMfaRequired(true);
        setError('Please enter your MFA code');
      } else if (result.success) {
        onLogin(result.user);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Fleet Management</h1>
          <p>Enhanced Security Login</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {mfaRequired && (
            <div className="form-group">
              <label htmlFor="mfaCode">MFA Code</label>
              <input
                type="text"
                id="mfaCode"
                name="mfaCode"
                value={formData.mfaCode}
                onChange={handleChange}
                placeholder="Enter 6-digit code"
                maxLength="6"
                disabled={loading}
                autoComplete="one-time-code"
              />
              <small>Enter the 6-digit code from your authenticator app</small>
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <div className="demo-credentials">
            <h4>Demo Accounts:</h4>
            <div className="credential-row">
              <strong>Admin:</strong> admin / Admin@123
            </div>
            <div className="credential-row">
              <strong>Manager:</strong> manager / Manager@123
            </div>
            <div className="credential-row">
              <strong>Driver:</strong> driver / Driver@123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnhancedLogin;