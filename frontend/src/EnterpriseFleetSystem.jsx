import React, { useState, useEffect } from 'react';
import './EnterpriseFleet.css';

// Main Enterprise Fleet Management Component
function EnterpriseFleetSystem() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Login Component
  const LoginForm = () => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
      e.preventDefault();
      setLoading(true);
      
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials)
        });
        
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
          setIsLoggedIn(true);
          localStorage.setItem('token', data.token);
        }
      } catch (error) {
        console.error('Login failed:', error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="login-container">
        <div className="login-card">
          <h1>🚛 Enterprise Fleet Management</h1>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Username"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <div className="demo-accounts">
            <p><strong>Demo Accounts:</strong></p>
            <p>Admin: admin / admin123</p>
            <p>Manager: manager / manager123</p>
            <p>Driver: driver1 / driver123</p>
          </div>
        </div>
      </div>
    );
  };

  // Dashboard Component
  const Dashboard = () => {
    const [kpis, setKpis] = useState({});
    const [insights, setInsights] = useState([]);

    useEffect(() => {
      fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
      try {
        const [kpisRes, insightsRes] = await Promise.all([
          fetch('/api/dashboard/kpis'),
          fetch('/api/dashboard/insights')
        ]);
        
        setKpis(await kpisRes.json());
        setInsights(await insightsRes.json());
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    return (
      <div className="dashboard">
        <h2>📊 Fleet Dashboard</h2>
        
        <div className="kpi-grid">
          <div className="kpi-card">
            <h3>🚗 Fleet Size</h3>
            <div className="kpi-value">{kpis.fleet_size || 0}</div>
          </div>
          <div className="kpi-card">
            <h3>✅ Active Vehicles</h3>
            <div className="kpi-value">{kpis.active_vehicles || 0}</div>
          </div>
          <div className="kpi-card">
            <h3>📈 Utilization Rate</h3>
            <div className="kpi-value">{kpis.utilization_rate || 0}%</div>
          </div>
          <div className="kpi-card">
            <h3>👨‍💼 Active Drivers</h3>
            <div className="kpi-value">{kpis.active_drivers || 0}</div>
          </div>
          <div className="kpi-card">
            <h3>🛣️ Total Distance</h3>
            <div className="kpi-value">{kpis.total_distance || 0} km</div>
          </div>
          <div className="kpi-card">
            <h3>⛽ Fuel Efficiency</h3>
            <div className="kpi-value">{kpis.fuel_efficiency || 0} km/L</div>
          </div>
          <div className="kpi-card">
            <h3>💰 Cost per KM</h3>
            <div className="kpi-value">${kpis.cost_per_km || 0}</div>
          </div>
          <div className="kpi-card">
            <h3>🚨 Active Alerts</h3>
            <div className="kpi-value">{kpis.active_alerts || 0}</div>
          </div>
        </div>

        {insights.length > 0 && (
          <div className="insights-section">
            <h3>🔮 Predictive Insights</h3>
            <div className="insights-list">
              {insights.map((insight, index) => (
                <div key={index} className={`insight-card ${insight.priority}`}>
                  <div className="insight-message">{insight.message}</div>
                  <div className="insight-priority">{insight.priority} priority</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Live Tracking Component
  const LiveTracking = () => {
    const [vehicles, setVehicles] = useState([]);

    useEffect(() => {
      fetchLiveData();
      const interval = setInterval(fetchLiveData, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
    }, []);

    const fetchLiveData = async () => {
      try {
        const response = await fetch('/api/tracking/live');
        const data = await response.json();
        setVehicles(data);
      } catch (error) {
        console.error('Error fetching live data:', error);
      }
    };

    return (
      <div className="live-tracking">
        <h2>🗺️ Live Vehicle Tracking</h2>
        <div className="tracking-grid">
          {vehicles.map(vehicle => (
            <div key={vehicle.id} className="vehicle-card">
              <h4>{vehicle.plate}</h4>
              <p><strong>Driver:</strong> {vehicle.driver || 'Unassigned'}</p>
              <p><strong>Status:</strong> <span className={`status ${vehicle.status}`}>{vehicle.status}</span></p>
              <p><strong>Location:</strong> {vehicle.lat?.toFixed(4)}, {vehicle.lng?.toFixed(4)}</p>
              <p><strong>Last Update:</strong> {vehicle.last_update ? new Date(vehicle.last_update).toLocaleTimeString() : 'Never'}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Vehicle Management Component
  const VehicleManagement = () => {
    const [vehicles, setVehicles] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newVehicle, setNewVehicle] = useState({
      plate: '', make: '', model: '', year: '', fuel_capacity: 50
    });

    useEffect(() => {
      fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
      try {
        const response = await fetch('/api/vehicles');
        const data = await response.json();
        setVehicles(data);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      }
    };

    const handleAddVehicle = async (e) => {
      e.preventDefault();
      try {
        await fetch('/api/vehicles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newVehicle)
        });
        fetchVehicles();
        setShowAddForm(false);
        setNewVehicle({ plate: '', make: '', model: '', year: '', fuel_capacity: 50 });
      } catch (error) {
        console.error('Error adding vehicle:', error);
      }
    };

    return (
      <div className="vehicle-management">
        <div className="section-header">
          <h2>🚗 Vehicle Management</h2>
          <button onClick={() => setShowAddForm(true)} className="add-btn">+ Add Vehicle</button>
        </div>

        {showAddForm && (
          <div className="modal">
            <div className="modal-content">
              <h3>Add New Vehicle</h3>
              <form onSubmit={handleAddVehicle}>
                <input
                  type="text"
                  placeholder="Plate Number"
                  value={newVehicle.plate}
                  onChange={(e) => setNewVehicle({...newVehicle, plate: e.target.value})}
                  required
                />
                <input
                  type="text"
                  placeholder="Make"
                  value={newVehicle.make}
                  onChange={(e) => setNewVehicle({...newVehicle, make: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="Model"
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})}
                />
                <input
                  type="number"
                  placeholder="Year"
                  value={newVehicle.year}
                  onChange={(e) => setNewVehicle({...newVehicle, year: e.target.value})}
                />
                <input
                  type="number"
                  placeholder="Fuel Capacity (L)"
                  value={newVehicle.fuel_capacity}
                  onChange={(e) => setNewVehicle({...newVehicle, fuel_capacity: e.target.value})}
                />
                <div className="form-actions">
                  <button type="submit">Add Vehicle</button>
                  <button type="button" onClick={() => setShowAddForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="vehicles-table">
          <table>
            <thead>
              <tr>
                <th>Plate</th>
                <th>Make/Model</th>
                <th>Year</th>
                <th>Status</th>
                <th>Driver</th>
                <th>Mileage</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(vehicle => (
                <tr key={vehicle.id}>
                  <td>{vehicle.plate}</td>
                  <td>{vehicle.make} {vehicle.model}</td>
                  <td>{vehicle.year}</td>
                  <td><span className={`status ${vehicle.status}`}>{vehicle.status}</span></td>
                  <td>{vehicle.driver_name || 'Unassigned'}</td>
                  <td>{vehicle.mileage || 0} km</td>
                  <td>
                    <button className="action-btn">Edit</button>
                    <button className="action-btn danger">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Reports Component
  const Reports = () => {
    const exportReport = async (type, format) => {
      try {
        const response = await fetch(`/api/reports/export/${type}?format=${format}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_report.${format}`;
        a.click();
      } catch (error) {
        console.error('Export error:', error);
      }
    };

    return (
      <div className="reports">
        <h2>📊 Reports & Analytics</h2>
        <div className="report-options">
          <div className="report-card">
            <h3>🚗 Vehicle Reports</h3>
            <p>Comprehensive vehicle performance and status reports</p>
            <div className="export-buttons">
              <button onClick={() => exportReport('vehicles', 'csv')}>Export CSV</button>
              <button onClick={() => exportReport('vehicles', 'pdf')}>Export PDF</button>
            </div>
          </div>
          <div className="report-card">
            <h3>🛣️ Trip Reports</h3>
            <p>Detailed trip analysis and route optimization</p>
            <div className="export-buttons">
              <button onClick={() => exportReport('trips', 'csv')}>Export CSV</button>
              <button onClick={() => exportReport('trips', 'pdf')}>Export PDF</button>
            </div>
          </div>
          <div className="report-card">
            <h3>⛽ Fuel Reports</h3>
            <p>Fuel consumption and cost analysis</p>
            <div className="export-buttons">
              <button onClick={() => exportReport('fuel', 'csv')}>Export CSV</button>
              <button onClick={() => exportReport('fuel', 'pdf')}>Export PDF</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Navigation Sidebar
  const Sidebar = () => {
    const menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'tracking', label: 'Live Tracking', icon: '🗺️' },
      { id: 'vehicles', label: 'Vehicles', icon: '🚗' },
      { id: 'drivers', label: 'Drivers', icon: '👨‍💼' },
      { id: 'trips', label: 'Trips', icon: '🛣️' },
      { id: 'fuel', label: 'Fuel', icon: '⛽' },
      { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
      { id: 'reports', label: 'Reports', icon: '📊' },
    ];

    return (
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>🚛 Fleet Manager</h3>
          <p>Welcome, {user?.username}</p>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => setCurrentView(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={() => setIsLoggedIn(false)} className="logout-btn">
            🚪 Logout
          </button>
        </div>
      </div>
    );
  };

  // Main render function
  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'tracking': return <LiveTracking />;
      case 'vehicles': return <VehicleManagement />;
      case 'reports': return <Reports />;
      default: return <Dashboard />;
    }
  };

  if (!isLoggedIn) {
    return <LoginForm />;
  }

  return (
    <div className="enterprise-fleet-system">
      <Sidebar />
      <div className="main-content">
        {renderCurrentView()}
      </div>
    </div>
  );
}

export default EnterpriseFleetSystem;