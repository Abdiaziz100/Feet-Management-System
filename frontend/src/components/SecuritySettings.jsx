import React, { useState, useEffect } from 'react';
import { changePassword, setupMFA, verifyMFA, disableMFA, getUser } from '../api';
import '../styles/SecuritySettings.css';

function SecuritySettings() {
  const [user, setUser] = useState(getUser());
  const [activeTab, setActiveTab] = useState('password');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [mfaData, setMfaData] = useState({
    qrCode: '',
    secret: '',
    verificationCode: '',
    disablePassword: ''
  });
  const [mfaStep, setMfaStep] = useState('setup');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setMessage('Password changed successfully. You will be logged out.');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial
    };
  };

  const passwordValidation = validatePassword(passwordData.newPassword);

  return (
    <div className="security-settings">
      <div className="security-header">
        <h2>Security Settings</h2>
        <p>Manage your account security and authentication</p>
      </div>

      <div className="security-tabs">
        <button 
          className={`tab ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          Password
        </button>
        <button 
          className={`tab ${activeTab === 'mfa' ? 'active' : ''}`}
          onClick={() => setActiveTab('mfa')}
        >
          Two-Factor Auth
        </button>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      {activeTab === 'password' && (
        <div className="tab-content">
          <h3>Change Password</h3>
          <form onSubmit={handlePasswordChange} className="password-form">
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                required
                disabled={loading}
              />
              
              {passwordData.newPassword && (
                <div className="password-requirements">
                  <div className={passwordValidation.minLength ? 'valid' : 'invalid'}>
                    ✓ At least 8 characters
                  </div>
                  <div className={passwordValidation.hasUpper ? 'valid' : 'invalid'}>
                    ✓ One uppercase letter
                  </div>
                  <div className={passwordValidation.hasLower ? 'valid' : 'invalid'}>
                    ✓ One lowercase letter
                  </div>
                  <div className={passwordValidation.hasNumber ? 'valid' : 'invalid'}>
                    ✓ One number
                  </div>
                  <div className={passwordValidation.hasSpecial ? 'valid' : 'invalid'}>
                    ✓ One special character
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                required
                disabled={loading}
              />
              {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                <div className="invalid">Passwords do not match</div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading || !passwordValidation.isValid || passwordData.newPassword !== passwordData.confirmPassword}
              className="security-button"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'mfa' && (
        <div className="tab-content">
          <h3>Two-Factor Authentication</h3>
          <p>MFA setup will be available once backend is running with enhanced security.</p>
        </div>
      )}
    </div>
  );
}

export default SecuritySettings;