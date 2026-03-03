import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import StatCard from "../components/StatCard.jsx";
import "../styles/Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalVehicles: 0,
    activeVehicles: 0,
    activeDrivers: 0,
    todayTrips: 0,
    fuelCost: 0,
    maintenance: 0,
  });

  const [recentTrips, setRecentTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);

      const [statsRes, tripsRes] = await Promise.all([
        api.get("/stats"),
        api.get("/trips"),
      ]);

      setStats(statsRes.data || {});
      setRecentTrips((tripsRes.data || []).slice(-5).reverse());
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const efficiencyRate =
    stats.totalVehicles > 0
      ? Math.round((stats.activeVehicles / stats.totalVehicles) * 100)
      : 0;

  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  if (loading) {
    return (
      <div className="content">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      {/* HERO SECTION */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-badge">Fleet Management System</div>
          <h1>{getGreeting()}, Admin 👋</h1>
          <p className="hero-subtitle">
            Here's what's happening
           with your fleet today</p>
          <p className="hero-date">{dateStr}</p>
        </div>
        <div className="hero-visual">
          <div className="floating-card card-1">🚗 {stats.totalVehicles} Vehicles</div>
          <div className="floating-card card-2">👤 {stats.activeDrivers} Drivers</div>
          <div className="floating-card card-3">📊 {stats.todayTrips} Trips</div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="stats-grid">
        <StatCard title="Total Vehicles" value={stats.totalVehicles} />
        <StatCard title="Active Vehicles" value={stats.activeVehicles} />
        <StatCard title="Active Drivers" value={stats.activeDrivers} />
        <StatCard title="Today's Trips" value={stats.todayTrips} />
        <StatCard
          title="Fuel Cost"
          value={`KES ${stats.fuelCost?.toLocaleString() || 0}`}
        />
        <StatCard
          title="Pending Maintenance"
          value={stats.maintenance}
        />
      </div>

      {/* METRICS SECTION */}
      <div className="dashboard-metrics">

        {/* Efficiency Card */}
        <div className="metric-card efficiency-card">
          <h3>Fleet Efficiency</h3>

          <div className="efficiency-gauge">
            <svg viewBox="0 0 100 50" className="gauge-svg">
              <path
                d="M10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="#eee"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${efficiencyRate * 1.26} 126`}
              />
            </svg>
            <div className="gauge-value">{efficiencyRate}%</div>
          </div>

          <p className="metric-description">
            Percentage of vehicles currently active
          </p>
        </div>

        {/* Recent Trips */}
        <div className="metric-card recent-trips-card">
          <div className="metric-header">
            <h3>Recent Trips</h3>
            <button className="view-all-btn" onClick={() => navigate("/trips")}>
              View All
            </button>
          </div>

          {recentTrips.length > 0 ? (
            <div className="trips-list">
              {recentTrips.map((trip, index) => (
                <div key={index} className="trip-item">
                  <span className="trip-icon">🚗</span>
                  <div className="trip-details">
                    <span className="trip-route">
                      {trip.start_location} → {trip.end_location}
                    </span>
                    <span className="trip-driver">{trip.driver}</span>
                  </div>
                  <span className="trip-status completed">Completed</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No trips available</p>
          )}
        </div>

        {/* Alerts */}
        <div className="metric-card alerts-card">
          <h3>System Alerts</h3>

          <div className="alerts-list">
            {stats.maintenance > 0 ? (
              <div className="alert-item warning">
                <span className="alert-icon">🔧</span>
                <span>{stats.maintenance} vehicles need maintenance</span>
                <span className="alert-count">{stats.maintenance}</span>
              </div>
            ) : (
              <div className="alert-item success">
                <span className="alert-icon">✅</span>
                <span>All vehicles in good condition</span>
              </div>
            )}

            {stats.activeVehicles === 0 && (
              <div className="alert-item info">
                <span className="alert-icon">ℹ️</span>
                <span>No active vehicles currently</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* QUICK NAVIGATION */}
      <div className="nav-cards-section">
        <h3 className="section-title">Explore Modules</h3>

        <div className="nav-cards-grid">
          <div onClick={() => navigate("/vehicles")} className="nav-card">
            <div className="nav-card-icon">🚗</div>
            <h4>Vehicles</h4>
            <p>Manage your fleet vehicles, track status, and maintenance</p>
            <span className="nav-card-arrow">→</span>
          </div>

          <div onClick={() => navigate("/drivers")} className="nav-card">
            <div className="nav-card-icon">👤</div>
            <h4>Drivers</h4>
            <p>View and manage driver information and assignments</p>
            <span className="nav-card-arrow">→</span>
          </div>

          <div onClick={() => navigate("/tracking")} className="nav-card">
            <div className="nav-card-icon">🗺️</div>
            <h4>Live Tracking</h4>
            <p>Monitor vehicles in real-time on the map</p>
            <span className="nav-card-arrow">→</span>
          </div>

          <div onClick={() => navigate("/reports")} className="nav-card">
            <div className="nav-card-icon">📊</div>
            <h4>Reports</h4>
            <p>Generate and view detailed fleet reports</p>
            <span className="nav-card-arrow">→</span>
          </div>
        </div>
      </div>
    </div>
  );
}

