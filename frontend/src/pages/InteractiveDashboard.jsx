import { useEffect, useState } from "react";
import api from "../api";
import StatCard from "../components/StatCard.jsx";
import { notifyError } from "../components/NotificationSystem.jsx";

export default function InteractiveDashboard() {
  const [stats, setStats] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds if live updates enabled
    const interval = liveUpdates ? setInterval(loadDashboardData, 30000) : null;
    return () => interval && clearInterval(interval);
  }, [liveUpdates]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, tripsRes, maintenanceRes, driversRes] = await Promise.all([
        api.get("/stats"),
        api.get("/trips"),
        api.get("/maintenance"),
        api.get("/drivers")
      ]);
      
      setStats(statsRes.data);
      
      // Generate recent activity
      const activity = [
        ...tripsRes.data.slice(-3).map(t => ({
          type: 'trip',
          message: `${t.driver} completed trip: ${t.start_location} → ${t.end_location}`,
          time: t.date || 'Today'
        })),
        ...maintenanceRes.data.filter(m => m.status === 'pending').slice(-2).map(m => ({
          type: 'maintenance',
          message: `Maintenance needed: ${m.issue} for ${m.vehicle}`,
          time: m.date || 'Today'
        }))
      ];
      setRecentActivity(activity);
      
      // Generate alerts
      const newAlerts = [];
      if (statsRes.data.maintenance > 0) {
        newAlerts.push({
          type: 'warning',
          message: `${statsRes.data.maintenance} vehicles need maintenance`
        });
      }
      
      const inactiveDrivers = driversRes.data.filter(d => !d.current_location).length;
      if (inactiveDrivers > 0) {
        newAlerts.push({
          type: 'info',
          message: `${inactiveDrivers} drivers location unknown`
        });
      }
      
      setAlerts(newAlerts);
      
    } catch (error) {
      console.error("Error loading dashboard:", error);
      notifyError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { name: 'Add Vehicle', action: () => window.location.href = '/vehicles', icon: '🚗' },
    { name: 'Register Driver', action: () => window.location.href = '/drivers', icon: '👨‍💼' },
    { name: 'New Trip', action: () => window.location.href = '/trips', icon: '🛣️' },
    { name: 'Fuel Entry', action: () => window.location.href = '/fuel', icon: '⛽' },
    { name: 'Maintenance', action: () => window.location.href = '/maintenance', icon: '🔧' },
    { name: 'View Reports', action: () => window.location.href = '/reports', icon: '📊' }
  ];

  if (loading) {
    return (
      <div className="content">
        <h2>Loading dashboard...</h2>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="dashboard-header">
        <h2>🚚 Fleet Control Center</h2>
        <div className="dashboard-controls">
          <button 
            className={`live-toggle ${liveUpdates ? 'active' : ''}`}
            onClick={() => setLiveUpdates(!liveUpdates)}
          >
            {liveUpdates ? '🟢 Live' : '⚫ Offline'}
          </button>
          <button onClick={loadDashboardData} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          {alerts.map((alert, index) => (
            <div key={index} className={`alert ${alert.type}`}>
              ⚠️ {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats">
        <StatCard title="Total Vehicles" value={stats.totalVehicles || 0} trend="All tracked" />
        <StatCard title="Active Vehicles" value={stats.activeVehicles || 0} trend="In service" />
        <StatCard title="Active Drivers" value={stats.activeDrivers || 0} trend="On duty" />
        <StatCard title="Total Trips" value={stats.todayTrips || 0} trend="Completed" />
        <StatCard title="Fuel Cost" value={`KES ${(stats.fuelCost || 0).toLocaleString()}`} trend="This month" />
        <StatCard title="Maintenance" value={stats.maintenance || 0} trend="Pending" />
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          {quickActions.map((action, index) => (
            <button 
              key={index} 
              className="action-btn"
              onClick={action.action}
            >
              <span className="action-icon">{action.icon}</span>
              {action.name}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h3>📋 Recent Activity</h3>
        {recentActivity.length > 0 ? (
          <div className="activity-list">
            {recentActivity.map((activity, index) => (
              <div key={index} className={`activity-item ${activity.type}`}>
                <div className="activity-content">
                  <span className="activity-message">{activity.message}</span>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{textAlign: 'center', color: '#666', padding: '20px'}}>
            No recent activity. Start by adding vehicles, drivers, or trips.
          </p>
        )}
      </div>

      {/* Fleet Status Chart */}
      <div className="fleet-chart">
        <h3>📊 Fleet Status Overview</h3>
        <div className="chart-container">
          <div className="chart-bar">
            <div 
              className="bar active" 
              style={{
                width: stats.totalVehicles ? `${(stats.activeVehicles / stats.totalVehicles) * 100}%` : '0%'
              }}
            >
              Active ({stats.activeVehicles || 0})
            </div>
          </div>
          <div className="chart-bar">
            <div 
              className="bar maintenance" 
              style={{
                width: stats.totalVehicles ? `${(stats.maintenance / stats.totalVehicles) * 100}%` : '0%'
              }}
            >
              Maintenance ({stats.maintenance || 0})
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginTop: '2rem'
      }}>
        <div 
          onClick={() => window.location.href = '/tracking'}
          style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          <div style={{fontSize: '2.5rem', marginBottom: '10px'}}>🗺️</div>
          <h4>Live Tracking</h4>
          <p style={{color: '#666', fontSize: '14px'}}>View real-time driver locations</p>
        </div>
        
        <div 
          onClick={() => window.location.href = '/assignments'}
          style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          <div style={{fontSize: '2.5rem', marginBottom: '10px'}}>🔗</div>
          <h4>Assignments</h4>
          <p style={{color: '#666', fontSize: '14px'}}>Manage driver-vehicle pairs</p>
        </div>
        
        <div 
          onClick={() => window.location.href = '/reports'}
          style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          <div style={{fontSize: '2.5rem', marginBottom: '10px'}}>📈</div>
          <h4>Reports</h4>
          <p style={{color: '#666', fontSize: '14px'}}>View fleet analytics & costs</p>
        </div>
      </div>
    </div>
  );
}
