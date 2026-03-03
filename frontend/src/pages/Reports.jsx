import { useEffect, useState } from "react";
import api from "../api";
import { notifyError } from "../components/NotificationSystem.jsx";

export default function Reports() {
  const [stats, setStats] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [fuel, setFuel] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, vehiclesRes, driversRes, tripsRes, fuelRes, maintenanceRes] = await Promise.all([
        api.get("/stats"),
        api.get("/vehicles"),
        api.get("/drivers"),
        api.get("/trips"),
        api.get("/fuel"),
        api.get("/maintenance")
      ]);
      setStats(statsRes.data);
      setVehicles(vehiclesRes.data);
      setDrivers(driversRes.data);
      setTrips(tripsRes.data);
      setFuel(fuelRes.data);
      setMaintenance(maintenanceRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
      notifyError("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
  const totalFuelCost = fuel.reduce((sum, f) => sum + (f.cost || 0), 0);
  const totalMaintenanceCost = maintenance.reduce((sum, m) => sum + (m.cost || 0), 0);
  const avgTripDistance = trips.length > 0 ? (totalDistance / trips.length).toFixed(2) : 0;
  const totalOperationalCost = totalFuelCost + totalMaintenanceCost;

  const exportTripReport = () => {
    window.open("http://localhost:5002/reports/export/trips", "_blank");
  };

  const exportFuelReport = () => {
    window.open("http://localhost:5002/reports/export/fuel", "_blank");
  };

  const exportMaintenanceReport = () => {
    window.open("http://localhost:5002/reports/export/maintenance", "_blank");
  };

  // Calculate driver stats
  const assignedDrivers = drivers.filter(d => d.assigned_vehicle && d.assigned_vehicle !== 'No vehicle assigned').length;

  if (loading) {
    return (
      <div className="content">
        <h2>Loading reports...</h2>
      </div>
    );
  }

  return (
    <div className="content">
      <h2>Fleet Reports</h2>
      
      {/* Executive Summary */}
      <div className="reports-summary">
        <div className="report-stat">
          <h3>📊 Executive Summary</h3>
          <p><strong>Total Vehicles:</strong> {stats.totalVehicles || 0}</p>
          <p><strong>Active Vehicles:</strong> {stats.activeVehicles || 0}</p>
          <p><strong>Active Drivers:</strong> {stats.activeDrivers || 0}</p>
          <p><strong>Total Trips:</strong> {trips.length}</p>
          <p><strong>Total Distance:</strong> {totalDistance.toFixed(2)} km</p>
        </div>
        
        <div className="report-stat">
          <h3>💰 Cost Analysis</h3>
          <p><strong>Fuel Costs:</strong> KES {totalFuelCost.toFixed(2)}</p>
          <p><strong>Maintenance Costs:</strong> KES {totalMaintenanceCost.toFixed(2)}</p>
          <p style={{borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '10px'}}>
            <strong>Total Operational Cost:</strong> KES {totalOperationalCost.toFixed(2)}
          </p>
        </div>
        
        <div className="report-stat">
          <h3>📈 Performance Metrics</h3>
          <p><strong>Avg Trip Distance:</strong> {avgTripDistance} km</p>
          <p><strong>Fuel Cost/Trip:</strong> KES {trips.length > 0 ? (totalFuelCost / trips.length).toFixed(2) : '0.00'}</p>
          <p><strong>Maintenance Pending:</strong> {stats.maintenance || 0}</p>
        </div>
      </div>

      {/* Export Options */}
      <div className="reports-grid" style={{marginTop: '2rem'}}>
        <div className="report-card">
          <h3>📥 Export Reports</h3>
          <p>Download detailed reports in CSV format</p>
          <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center'}}>
            <button onClick={exportTripReport}>Trips CSV</button>
            <button onClick={exportFuelReport}>Fuel CSV</button>
            <button onClick={exportMaintenanceReport}>Maintenance CSV</button>
          </div>
        </div>
        
        <div className="report-card">
          <h3>🚗 Fleet Status</h3>
          <div className="report-list">
            <p><strong>Active:</strong> {vehicles.filter(v => v.status === 'active').length}</p>
            <p><strong>Maintenance:</strong> {vehicles.filter(v => v.status === 'maintenance').length}</p>
            <p><strong>Inactive:</strong> {vehicles.filter(v => v.status === 'inactive').length}</p>
          </div>
        </div>
        
        <div className="report-card">
          <h3>👨‍💼 Driver Status</h3>
          <div className="report-list">
            <p><strong>Total Drivers:</strong> {drivers.length}</p>
            <p><strong>Active:</strong> {stats.activeDrivers || 0}</p>
            <p><strong>Assigned:</strong> {assignedDrivers}</p>
          </div>
        </div>
      </div>

      {/* Detailed Lists */}
      <div className="reports-grid" style={{marginTop: '2rem'}}>
        <div className="report-card">
          <h3>🚗 Vehicle Utilization</h3>
          <div className="report-list" style={{maxHeight: '250px', overflowY: 'auto'}}>
            {vehicles.length > 0 ? vehicles.map(v => (
              <div key={v.id} className="report-item">
                <strong>{v.plate}</strong> 
                <span className={`status-badge status-${v.status}`}>{v.status}</span>
                {v.driver_name && v.driver_name !== 'Unassigned' && (
                  <span style={{fontSize: '12px', color: '#666'}}> ({v.driver_name})</span>
                )}
              </div>
            )) : (
              <p style={{color: '#666'}}>No vehicles registered</p>
            )}
          </div>
        </div>
        
        <div className="report-card">
          <h3>🛣️ Recent Trips</h3>
          <div className="report-list" style={{maxHeight: '250px', overflowY: 'auto'}}>
            {trips.length > 0 ? trips.slice(-10).reverse().map(t => (
              <div key={t.id} className="report-item">
                <strong>{t.vehicle}</strong>: {t.start_location} → {t.end_location}
                <br />
                <span style={{fontSize: '12px', color: '#666'}}>
                  {t.distance}km | {t.date}
                </span>
              </div>
            )) : (
              <p style={{color: '#666'}}>No trips recorded</p>
            )}
          </div>
        </div>
      </div>

      {/* Maintenance Summary */}
      <div className="reports-grid" style={{marginTop: '2rem'}}>
        <div className="report-card">
          <h3>🔧 Maintenance Summary</h3>
          <div className="report-list" style={{maxHeight: '200px', overflowY: 'auto'}}>
            <p><strong>Pending:</strong> {maintenance.filter(m => m.status === 'pending').length}</p>
            <p><strong>In Progress:</strong> {maintenance.filter(m => m.status === 'in-progress').length}</p>
            <p><strong>Completed:</strong> {maintenance.filter(m => m.status === 'completed').length}</p>
            {maintenance.filter(m => m.status === 'pending').slice(0, 5).map(m => (
              <div key={m.id} className="report-item" style={{borderLeft: '3px solid #f39c12'}}>
                <strong>{m.vehicle}</strong>: {m.issue}
              </div>
            ))}
          </div>
        </div>
        
        <div className="report-card">
          <h3>⛽ Fuel Summary</h3>
          <div className="report-list">
            <p><strong>Total Cost:</strong> KES {totalFuelCost.toFixed(2)}</p>
            <p><strong>Total Liters:</strong> {fuel.reduce((sum, f) => sum + (f.liters || 0), 0).toFixed(2)}L</p>
            <p><strong>Avg Cost/Liter:</strong> KES {
              fuel.length > 0 
                ? (totalFuelCost / fuel.reduce((sum, f) => sum + (f.liters || 0), 0)).toFixed(2)
                : '0.00'
            }</p>
          </div>
        </div>
      </div>
    </div>
  );
}
