import { useEffect, useState } from "react";
import api from "../api";
import { notifySuccess, notifyError } from "../components/NotificationSystem.jsx";

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [license, setLicense] = useState("");
  const [assignedVehicle, setAssignedVehicle] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDrivers();
    loadVehicles();
  }, []);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/drivers");
      setDrivers(response.data);
    } catch (error) {
      console.error("Error loading drivers:", error);
      notifyError("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  };

  const loadVehicles = async () => {
    try {
      const response = await api.get("/vehicles");
      setVehicles(response.data.filter(v => !v.driver_name || v.driver_name === "Unassigned"));
    } catch (error) {
      console.error("Error loading vehicles:", error);
    }
  };

  const registerDriver = async (e) => {
    e.preventDefault();
    try {
      const driverData = { 
        name: name.trim(), 
        phone: phone.trim(),
        license_number: license.trim(),
        assigned_vehicle: assignedVehicle || null,
        active: true 
      };
      
      await api.post("/drivers", driverData);
      
      setName("");
      setPhone("");
      setLicense("");
      setAssignedVehicle("");
      await loadDrivers();
      await loadVehicles();
      notifySuccess(`Driver ${name} registered successfully!`);
    } catch (error) {
      console.error("Error registering driver:", error);
      notifyError(error.response?.data?.error || "Error registering driver");
    }
  };

  const updateLocation = async (driverId, driverName) => {
    const location = prompt(`Enter current location for ${driverName}:`);
    if (location) {
      try {
        await api.post("/update-location", {
          driver_id: driverId,
          location: location.trim()
        });
        loadDrivers();
        notifySuccess("Location updated!");
      } catch (error) {
        console.error("Error updating location:", error);
        notifyError("Error updating location");
      }
    }
  };

  const deleteDriver = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete driver ${name}?`)) {
      return;
    }
    
    try {
      await api.delete(`/drivers/${id}`);
      await loadDrivers();
      await loadVehicles();
      notifySuccess("Driver deleted successfully!");
    } catch (error) {
      console.error("Error deleting driver:", error);
      notifyError(error.response?.data?.error || "Error deleting driver");
    }
  };

  const toggleDriverActive = async (driver) => {
    try {
      await api.put(`/drivers/${driver.id}`, { active: !driver.active });
      loadDrivers();
      notifySuccess(`Driver ${driver.active ? 'deactivated' : 'activated'} successfully!`);
    } catch (error) {
      console.error("Error updating driver:", error);
      notifyError("Error updating driver");
    }
  };

  // Filter drivers based on search term
  const filteredDrivers = drivers.filter(d => 
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone?.includes(searchTerm) ||
    d.license_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.active).length,
    assigned: drivers.filter(d => d.assigned_vehicle && d.assigned_vehicle !== "No vehicle assigned").length,
    unassigned: drivers.filter(d => !d.assigned_vehicle || d.assigned_vehicle === "No vehicle assigned").length
  };

  return (
    <div className="content">
      <h2>Driver Registration & Tracking</h2>
      
      {/* Stats */}
      <div className="stats">
        <div className="stat-card">
          <h3>Total Drivers</h3>
          <p className="stat-value">{stats.total}</p>
        </div>
        <div className="stat-card">
          <h3>Active</h3>
          <p className="stat-value" style={{color: '#27ae60'}}>{stats.active}</p>
        </div>
        <div className="stat-card">
          <h3>Assigned</h3>
          <p className="stat-value" style={{color: '#3498db'}}>{stats.assigned}</p>
        </div>
        <div className="stat-card">
          <h3>Unassigned</h3>
          <p className="stat-value" style={{color: '#e74c3c'}}>{stats.unassigned}</p>
        </div>
      </div>
      
      {/* Search */}
      <div style={{marginBottom: '1rem'}}>
        <input
          type="text"
          placeholder="🔍 Search drivers by name, phone, or license..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{padding: '10px', width: '400px', border: '1px solid #ddd', borderRadius: '5px'}}
        />
      </div>
      
      {/* Add Form */}
      <form onSubmit={registerDriver} className="add-form">
        <input
          type="text"
          placeholder="Driver Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="tel"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="License Number"
          value={license}
          onChange={(e) => setLicense(e.target.value)}
          required
        />
        <select 
          value={assignedVehicle} 
          onChange={(e) => setAssignedVehicle(e.target.value)}
        >
          <option value="">Select Vehicle (Optional)</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.plate}>{v.plate}</option>
          ))}
        </select>
        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register Driver'}
        </button>
      </form>

      {/* Driver List */}
      <div className="driver-tracking">
        <h3>Driver Locations & Vehicles ({filteredDrivers.length})</h3>
        {loading ? (
          <p style={{textAlign: 'center', color: '#666'}}>Loading...</p>
        ) : filteredDrivers.length > 0 ? (
          <div className="drivers-grid">
            {filteredDrivers.map(driver => (
              <div key={driver.id} className="driver-card" style={{opacity: driver.active ? 1 : 0.7}}>
                <div className="driver-header">
                  <strong>{driver.name}</strong>
                  <span className={`status-badge status-${driver.active ? 'active' : 'inactive'}`}>
                    {driver.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="driver-details">
                  <p><strong>Phone:</strong> 📞 {driver.phone || 'N/A'}</p>
                  <p><strong>License:</strong> {driver.license_number || 'N/A'}</p>
                  <p>
                    <strong>Vehicle:</strong> 
                    <span className="vehicle-badge">{driver.assigned_vehicle || 'Unassigned'}</span>
                  </p>
                  <p><strong>Location:</strong> 📍 {driver.current_location || 'Unknown'}</p>
                  <p><strong>Last Seen:</strong> {driver.last_seen || 'Never'}</p>
                </div>
                <div style={{display: 'flex', gap: '5px', marginTop: '10px'}}>
                  <button 
                    onClick={() => updateLocation(driver.id, driver.name)}
                    className="location-btn"
                  >
                    📍 Update Location
                  </button>
                  <button 
                    onClick={() => toggleDriverActive(driver)}
                    className="location-btn"
                    style={{background: driver.active ? '#f39c12' : '#27ae60'}}
                  >
                    {driver.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button 
                    onClick={() => deleteDriver(driver.id, driver.name)}
                    className="location-btn"
                    style={{background: '#e74c3c'}}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{textAlign: 'center', color: '#666', marginTop: '2rem'}}>
            {searchTerm ? 'No drivers found matching your search.' : 'No drivers found. Register your first driver above.'}
          </p>
        )}
      </div>
    </div>
  );
}
