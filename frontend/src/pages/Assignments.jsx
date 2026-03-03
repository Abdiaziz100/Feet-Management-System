import { useEffect, useState } from "react";
import api from "../api";
import { notifySuccess, notifyError } from "../components/NotificationSystem.jsx";

export default function Assignments() {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [driversRes, vehiclesRes] = await Promise.all([
        api.get("/drivers"),
        api.get("/vehicles")
      ]);
      setDrivers(driversRes.data);
      setVehicles(vehiclesRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
      notifyError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const assignDriver = async (e) => {
    e.preventDefault();
    
    if (!selectedDriver || !selectedVehicle) {
      notifyError("Please select both driver and vehicle");
      return;
    }
    
    try {
      await api.post("/assign", {
        driver_id: parseInt(selectedDriver),
        vehicle_plate: selectedVehicle
      });
      setSelectedDriver("");
      setSelectedVehicle("");
      await loadData();
      notifySuccess("Driver assigned successfully!");
    } catch (error) {
      console.error("Error assigning driver:", error);
      notifyError(error.response?.data?.error || "Error assigning driver");
    }
  };

  const unassignDriver = async (vehiclePlate) => {
    if (!window.confirm(`Are you sure you want to unassign the driver from ${vehiclePlate}?`)) {
      return;
    }
    
    try {
      await api.post("/unassign", { vehicle_plate: vehiclePlate });
      await loadData();
      notifySuccess("Driver unassigned successfully!");
    } catch (error) {
      console.error("Error unassigning driver:", error);
      notifyError("Error unassigning driver");
    }
  };

  // Get unassigned vehicles
  const unassignedVehicles = vehicles.filter(v => !v.driver_name || v.driver_name === "Unassigned");
  
  // Get assigned drivers
  const assignedDrivers = drivers.filter(d => d.assigned_vehicle && d.assigned_vehicle !== "No vehicle assigned");

  return (
    <div className="content">
      <h2>Driver-Vehicle Assignments</h2>
      
      {/* Stats */}
      <div className="stats">
        <div className="stat-card">
          <h3>Total Vehicles</h3>
          <p className="stat-value">{vehicles.length}</p>
        </div>
        <div className="stat-card">
          <h3>Assigned</h3>
          <p className="stat-value" style={{color: '#27ae60'}}>{assignedDrivers.length}</p>
        </div>
        <div className="stat-card">
          <h3>Unassigned</h3>
          <p className="stat-value" style={{color: '#e74c3c'}}>{unassignedVehicles.length}</p>
        </div>
      </div>
      
      {/* Assignment Form */}
      <form onSubmit={assignDriver} className="add-form">
        <select 
          value={selectedDriver} 
          onChange={(e) => setSelectedDriver(e.target.value)}
          required
        >
          <option value="">Select Driver</option>
          {drivers.filter(d => d.active).map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        
        <select 
          value={selectedVehicle} 
          onChange={(e) => setSelectedVehicle(e.target.value)}
          required
        >
          <option value="">Select Vehicle</option>
          {unassignedVehicles.map(v => (
            <option key={v.id} value={v.plate}>{v.plate}</option>
          ))}
        </select>
        
        <button type="submit" disabled={loading || !selectedDriver || !selectedVehicle}>
          {loading ? 'Assigning...' : 'Assign Driver'}
        </button>
      </form>

      {/* Current Assignments */}
      <div className="assignments-grid">
        <div className="assignment-section">
          <h3>📋 Current Assignments ({assignedDrivers.length})</h3>
          {assignedDrivers.length > 0 ? (
            <div className="drivers-grid">
              {assignedDrivers.map(driver => (
                <div key={driver.id} className="driver-card" style={{borderLeft: '4px solid #27ae60'}}>
                  <div className="driver-header">
                    <strong>{driver.name}</strong>
                    <button 
                      onClick={() => unassignDriver(driver.assigned_vehicle)}
                      style={{
                        padding: '5px 10px',
                        background: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Unassign
                    </button>
                  </div>
                  <div className="driver-details">
                    <p><strong>Vehicle:</strong> <span className="vehicle-badge">{driver.assigned_vehicle}</span></p>
                    <p><strong>Phone:</strong> {driver.phone || 'N/A'}</p>
                    <p><strong>Location:</strong> {driver.current_location || 'Unknown'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{textAlign: 'center', color: '#666', padding: '20px'}}>
              No current assignments. Assign drivers to vehicles above.
            </p>
          )}
        </div>
      </div>

      {/* Unassigned Resources */}
      <div style={{marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
        <div className="assignment-section">
          <h3>🚗 Unassigned Vehicles ({unassignedVehicles.length})</h3>
          {unassignedVehicles.length > 0 ? (
            <div style={{background: 'white', borderRadius: '10px', padding: '1rem'}}>
              {unassignedVehicles.map(v => (
                <div key={v.id} style={{padding: '10px', borderBottom: '1px solid #eee'}}>
                  <strong>{v.plate}</strong>
                  <span className={`status-badge status-${v.status}`}>{v.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{textAlign: 'center', color: '#666'}}>All vehicles are assigned</p>
          )}
        </div>
        
        <div className="assignment-section">
          <h3>👨‍💼 Unassigned Drivers ({drivers.length - assignedDrivers.length})</h3>
          {drivers.length - assignedDrivers.length > 0 ? (
            <div style={{background: 'white', borderRadius: '10px', padding: '1rem'}}>
              {drivers.filter(d => !d.assigned_vehicle || d.assigned_vehicle === "No vehicle assigned").map(d => (
                <div key={d.id} style={{padding: '10px', borderBottom: '1px solid #eee'}}>
                  <strong>{d.name}</strong>
                  {d.active ? '' : <span className="status-badge status-inactive">Inactive</span>}
                </div>
              ))}
            </div>
          ) : (
            <p style={{textAlign: 'center', color: '#666'}}>All drivers are assigned</p>
          )}
        </div>
      </div>
    </div>
  );
}
