import { useEffect, useState } from "react";
import api from "../api";
import Table from "../components/Table.jsx";
import { notifySuccess, notifyError } from "../components/NotificationSystem.jsx";

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicle, setVehicle] = useState("");
  const [driver, setDriver] = useState("");
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [distance, setDistance] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTrips();
    loadVehicles();
    loadDrivers();
  }, []);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const response = await api.get("/trips");
      setTrips(response.data);
    } catch (error) {
      console.error("Error loading trips:", error);
      notifyError("Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  const loadVehicles = async () => {
    try {
      const response = await api.get("/vehicles");
      setVehicles(response.data);
    } catch (error) {
      console.error("Error loading vehicles:", error);
    }
  };

  const loadDrivers = async () => {
    try {
      const response = await api.get("/drivers");
      setDrivers(response.data);
    } catch (error) {
      console.error("Error loading drivers:", error);
    }
  };

  const addTrip = async (e) => {
    e.preventDefault();
    try {
      await api.post("/trips", { 
        vehicle, 
        driver,
        start_location: startLocation.trim(),
        end_location: endLocation.trim(),
        distance: parseFloat(distance),
        date,
        status: 'completed'
      });
      setVehicle("");
      setDriver("");
      setStartLocation("");
      setEndLocation("");
      setDistance("");
      setDate(new Date().toISOString().split('T')[0]);
      await loadTrips();
      notifySuccess("Trip added successfully!");
    } catch (error) {
      console.error("Error adding trip:", error);
      notifyError(error.response?.data?.error || "Error adding trip");
    }
  };

  const deleteTrip = async (id) => {
    if (!window.confirm("Are you sure you want to delete this trip?")) {
      return;
    }
    
    try {
      await api.delete(`/trips/${id}`);
      await loadTrips();
      notifySuccess("Trip deleted successfully!");
    } catch (error) {
      console.error("Error deleting trip:", error);
      notifyError("Error deleting trip");
    }
  };

  const exportTrips = () => {
    window.open("http://localhost:5002/reports/export/trips", "_blank");
  };

  // Filter trips based on search term
  const filteredTrips = trips.filter(t => 
    t.vehicle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.driver?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.start_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.end_location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = ["ID", "Vehicle", "Driver", "From", "To", "Distance (km)", "Date", "Status", "Actions"];
  const data = filteredTrips.map(t => [
    t.id,
    t.vehicle,
    t.driver,
    t.start_location,
    t.end_location,
    t.distance,
    t.date,
    <span className={`status-badge status-${t.status}`}>{t.status}</span>,
    <button 
      onClick={() => deleteTrip(t.id)}
      style={{padding: '5px 10px', fontSize: '12px', cursor: 'pointer', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px'}}
    >
      Delete
    </button>
  ]);

  // Stats
  const totalTrips = trips.length;
  const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
  const avgDistance = totalTrips > 0 ? (totalDistance / totalTrips).toFixed(2) : 0;
  const todayTrips = trips.filter(t => t.date === new Date().toISOString().split('T')[0]).length;

  return (
    <div className="content">
      <h2>Trip Management</h2>
      
      {/* Stats */}
      <div className="stats">
        <div className="stat-card">
          <h3>Total Trips</h3>
          <p className="stat-value">{totalTrips}</p>
        </div>
        <div className="stat-card">
          <h3>Total Distance</h3>
          <p className="stat-value">{totalDistance.toFixed(2)} km</p>
        </div>
        <div className="stat-card">
          <h3>Average Distance</h3>
          <p className="stat-value">{avgDistance} km</p>
        </div>
        <div className="stat-card">
          <h3>Today's Trips</h3>
          <p className="stat-value">{todayTrips}</p>
        </div>
      </div>
      
      {/* Search and Export */}
      <div style={{marginBottom: '1rem', display: 'flex', gap: '10px'}}>
        <input
          type="text"
          placeholder="🔍 Search trips..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{padding: '10px', width: '300px', border: '1px solid #ddd', borderRadius: '5px'}}
        />
        <button 
          onClick={exportTrips}
          style={{padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}
        >
          📥 Export CSV
        </button>
      </div>
      
      {/* Add Form */}
      <form onSubmit={addTrip} className="add-form">
        <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} required>
          <option value="">Select Vehicle</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.plate}>{v.plate}</option>
          ))}
        </select>
        <select value={driver} onChange={(e) => setDriver(e.target.value)} required>
          <option value="">Select Driver</option>
          {drivers.map(d => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="From Location"
          value={startLocation}
          onChange={(e) => setStartLocation(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="To Location"
          value={endLocation}
          onChange={(e) => setEndLocation(e.target.value)}
          required
        />
        <input
          type="number"
          step="0.1"
          placeholder="Distance (km)"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          required
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Trip'}
        </button>
      </form>

      {loading ? (
        <p style={{textAlign: 'center', color: '#666'}}>Loading...</p>
      ) : filteredTrips.length > 0 ? (
        <Table columns={columns} data={data} />
      ) : (
        <p style={{textAlign: 'center', color: '#666', marginTop: '2rem'}}>
          {searchTerm ? 'No trips found matching your search.' : 'No trips found. Add your first trip above.'}
        </p>
      )}
    </div>
  );
}
