import { useNavigate } from "react-router-dom";
import api, { logout, getUser, isAdmin } from "../api";
import NotificationSystem from "./NotificationSystem.jsx";
import "../styles/EnhancedSidebar.css";

export default function EnhancedSidebar() {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      navigate("/");
    }
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: "📊", roles: ['viewer', 'driver', 'manager', 'admin'] },
    { path: "/tracking", label: "Live Tracking", icon: "🗺️", roles: ['driver', 'manager', 'admin'] },
    { path: "/vehicles", label: "Vehicles", icon: "🚗", roles: ['manager', 'admin'] },
    { path: "/drivers", label: "Drivers", icon: "👨💼", roles: ['manager', 'admin'] },
    { path: "/assignments", label: "Assignments", icon: "🔗", roles: ['manager', 'admin'] },
    { path: "/trips", label: "Trips", icon: "🛣️", roles: ['driver', 'manager', 'admin'] },
    { path: "/fuel", label: "Fuel", icon: "⛽", roles: ['driver', 'manager', 'admin'] },
    { path: "/maintenance", label: "Maintenance", icon: "🔧", roles: ['manager', 'admin'] },
    { path: "/reports", label: "Reports", icon: "📈", roles: ['manager', 'admin'] },
  ];

  const securityItems = [
    { path: "/security", label: "Security Settings", icon: "🔐", roles: ['viewer', 'driver', 'manager', 'admin'] },
    { path: "/admin/users", label: "User Management", icon: "👥", roles: ['admin'] },
  ];

  const canAccess = (requiredRoles) => {
    if (!user || !requiredRoles) return false;
    return requiredRoles.includes(user.role);
  };

  return (
    <>
      <NotificationSystem />
      <div className="sidebar enhanced-sidebar">
        <div className="sidebar-header">
          <h3>🚛 FleetKE</h3>
          <div className="user-info">
            <div className="username">{user?.username}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-title">Fleet Management</div>
            {navItems.map((item) => 
              canAccess(item.roles) && (
                <a 
                  key={item.path} 
                  href={item.path}
                  className={window.location.pathname === item.path ? 'active' : ''}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </a>
              )
            )}
          </div>

          <div className="nav-section">
            <div className="nav-title">Security & Admin</div>
            {securityItems.map((item) => 
              canAccess(item.roles) && (
                <a 
                  key={item.path} 
                  href={item.path}
                  className={window.location.pathname === item.path ? 'active' : ''}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </a>
              )
            )}
          </div>
        </nav>
        
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            🚪 Sign Out
          </button>
        </div>
      </div>
    </>
  );
}