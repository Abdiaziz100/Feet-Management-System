import { useNavigate } from "react-router-dom";
import api from "../api";
import NotificationSystem from "./NotificationSystem.jsx";

export default function Sidebar({ onLogout }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem('user');
      if (onLogout) onLogout();
    }
  };

  const navItems = [
    { path: "/", label: "Dashboard", icon: "📊" },
    { path: "/vehicles", label: "Vehicles", icon: "🚗" },
    { path: "/drivers", label: "Drivers", icon: "👨💼" },
    { path: "/assignments", label: "Assignments", icon: "📋" },
    { path: "/trips", label: "Trips", icon: "🛣️" },
    { path: "/fuel", label: "Fuel", icon: "⛽" },
    { path: "/maintenance", label: "Maintenance", icon: "🔧" },
    { path: "/reports", label: "Reports", icon: "📈" },
  ];

  return (
    <>
      <NotificationSystem />
      <div className="sidebar">
        <h3>FleetKE</h3>
        <nav>
          {navItems.map((item) => (
            <a 
              key={item.path} 
              href={item.path}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.path);
              }}
              className={window.location.pathname === item.path ? 'active' : ''}
            >
              <span style={{marginRight: '10px'}}>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <button onClick={handleLogout} className="logout-btn">
          🚪 SignOut
        </button>
      </div>
    </>
  );
}
