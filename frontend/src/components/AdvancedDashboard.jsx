import React, { useState, useEffect } from 'react';
import api from '../api';
import '../styles/AdvancedDashboard.css';

function AdvancedDashboard() {
  const [kpis, setKpis] = useState({});
  const [timeSeriesData, setTimeSeriesData] = useState({});
  const [vehiclePerformance, setVehiclePerformance] = useState([]);
  const [driverPerformance, setDriverPerformance] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  useEffect(() => {
    fetchAnalyticsData();
    const interval = setInterval(fetchAnalyticsData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const fetchAnalyticsData = async () => {
    try {
      const [kpisRes, timeSeriesRes, vehicleRes, driverRes, insightsRes] = await Promise.all([
        api.get('/analytics/kpis'),
        api.get(`/analytics/time-series?days=${selectedPeriod}`),
        api.get('/analytics/vehicle-performance'),
        api.get('/analytics/driver-performance'),
        api.get('/analytics/insights')
      ]);

      setKpis(kpisRes.data);
      setTimeSeriesData(timeSeriesRes.data);
      setVehiclePerformance(vehicleRes.data);
      setDriverPerformance(driverRes.data);
      setInsights(insightsRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (type, format) => {
    try {
      const response = await api.get(`/reports/export/${type}?format=${format}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const KPICard = ({ title, value, unit, trend, icon }) => (
    <div className="kpi-card">
      <div className="kpi-header">
        <span className="kpi-icon">{icon}</span>
        <h3>{title}</h3>
      </div>
      <div className="kpi-value">
        {value} {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {trend && (
        <div className={`kpi-trend ${trend > 0 ? 'positive' : 'negative'}`}>
          {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );

  const SimpleChart = ({ data, title, color = '#3498db' }) => {
    if (!data || data.length === 0) return null;
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    return (
      <div className="simple-chart">
        <h4>{title}</h4>
        <div className="chart-container">
          {data.map((value, index) => (
            <div
              key={index}
              className="chart-bar"
              style={{
                height: `${((value - min) / range) * 100}%`,
                backgroundColor: color
              }}
              title={`${value}`}
            />
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">Loading Analytics...</div>
      </div>
    );
  }

  return (
    <div className="advanced-dashboard">
      <div className="dashboard-header">
        <h1>📊 Advanced Analytics Dashboard</h1>
        <div className="dashboard-controls">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="period-selector"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={fetchAnalyticsData} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          title="Fleet Size"
          value={kpis.fleet_size}
          icon="🚗"
        />
        <KPICard
          title="Active Vehicles"
          value={kpis.active_vehicles}
          icon="✅"
        />
        <KPICard
          title="Utilization Rate"
          value={kpis.utilization_rate}
          unit="%"
          icon="📈"
        />
        <KPICard
          title="Total Distance"
          value={kpis.total_distance}
          unit="km"
          icon="🛣️"
        />
        <KPICard
          title="Fuel Efficiency"
          value={kpis.fuel_efficiency}
          unit="km/L"
          icon="⛽"
        />
        <KPICard
          title="Cost per KM"
          value={kpis.cost_per_km}
          unit="$"
          icon="💰"
        />
        <KPICard
          title="Pending Maintenance"
          value={kpis.pending_maintenance}
          icon="🔧"
        />
        <KPICard
          title="Total Operational Cost"
          value={kpis.total_operational_cost}
          unit="$"
          icon="💸"
        />
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-row">
          <SimpleChart
            data={timeSeriesData.trips}
            title="Daily Trips"
            color="#3498db"
          />
          <SimpleChart
            data={timeSeriesData.distances}
            title="Daily Distance (km)"
            color="#2ecc71"
          />
        </div>
        <div className="chart-row">
          <SimpleChart
            data={timeSeriesData.fuel_costs}
            title="Daily Fuel Costs ($)"
            color="#e74c3c"
          />
          <SimpleChart
            data={timeSeriesData.maintenance_costs}
            title="Daily Maintenance Costs ($)"
            color="#f39c12"
          />
        </div>
      </div>

      {/* Insights Section */}
      {insights.length > 0 && (
        <div className="insights-section">
          <h2>🔮 Predictive Insights</h2>
          <div className="insights-grid">
            {insights.map((insight, index) => (
              <div key={index} className={`insight-card ${insight.priority}`}>
                <div className="insight-type">
                  {insight.type === 'maintenance_due' && '🔧'}
                  {insight.type === 'fuel_cost_increase' && '⛽'}
                  {insight.type === 'driver_efficiency' && '👨‍💼'}
                </div>
                <div className="insight-message">{insight.message}</div>
                <div className="insight-priority">{insight.priority} priority</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Tables */}
      <div className="performance-section">
        <div className="performance-table">
          <div className="table-header">
            <h3>🚗 Vehicle Performance</h3>
            <div className="export-buttons">
              <button onClick={() => exportReport('vehicles', 'csv')} className="export-btn">
                📄 CSV
              </button>
              <button onClick={() => exportReport('vehicles', 'pdf')} className="export-btn">
                📋 PDF
              </button>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Status</th>
                  <th>Trips</th>
                  <th>Distance (km)</th>
                  <th>Fuel Efficiency</th>
                  <th>Cost/km</th>
                </tr>
              </thead>
              <tbody>
                {vehiclePerformance.slice(0, 10).map((vehicle, index) => (
                  <tr key={index}>
                    <td>{vehicle.vehicle}</td>
                    <td>{vehicle.driver}</td>
                    <td>
                      <span className={`status ${vehicle.status}`}>
                        {vehicle.status}
                      </span>
                    </td>
                    <td>{vehicle.total_trips}</td>
                    <td>{vehicle.total_distance}</td>
                    <td>{vehicle.fuel_efficiency} km/L</td>
                    <td>${vehicle.cost_per_km}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="performance-table">
          <div className="table-header">
            <h3>👨‍💼 Driver Performance</h3>
            <div className="export-buttons">
              <button onClick={() => exportReport('drivers', 'csv')} className="export-btn">
                📄 CSV
              </button>
              <button onClick={() => exportReport('drivers', 'pdf')} className="export-btn">
                📋 PDF
              </button>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Trips</th>
                  <th>Distance (km)</th>
                  <th>Avg Trip</th>
                  <th>Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {driverPerformance.slice(0, 10).map((driver, index) => (
                  <tr key={index}>
                    <td>{driver.driver}</td>
                    <td>{driver.vehicle}</td>
                    <td>
                      <span className={`status ${driver.active ? 'active' : 'inactive'}`}>
                        {driver.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{driver.total_trips}</td>
                    <td>{driver.total_distance}</td>
                    <td>{driver.avg_trip_distance} km</td>
                    <td>{driver.fuel_efficiency} km/L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="export-section">
        <h3>📊 Export Reports</h3>
        <div className="export-options">
          <button onClick={() => exportReport('kpis', 'pdf')} className="export-option">
            📈 KPI Report (PDF)
          </button>
          <button onClick={() => exportReport('vehicles', 'csv')} className="export-option">
            🚗 Vehicle Data (CSV)
          </button>
          <button onClick={() => exportReport('drivers', 'csv')} className="export-option">
            👨‍💼 Driver Data (CSV)
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdvancedDashboard;