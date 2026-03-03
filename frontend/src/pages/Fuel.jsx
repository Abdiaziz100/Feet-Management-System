import { useEffect, useState } from "react";
import api from "../api";
import Table from "../components/Table.jsx";
import { notifySuccess, notifyError } from "../components/NotificationSystem.jsx";

export default function Fuel() {
  const [fuel, setFuel] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicle, setVehicle] = useState("");
  const [liters, setLiters] = useState("");
  const [cost, setCost] = useState("");
  const [station, setStation] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFuel();
    loadVehicles();
  }, []);

  const loadFuel = async () => {
    setLoading(true);
    try {
      const response = await api.get("/fuel");
      setFuel(response.data);
    } catch (error) {
      console.error("Error loading fuel:", error);
      notifyError("Failed to load fuel records");
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

  const addFuel = async (e) => {
    e.preventDefault();
    try {
      await api.post("/fuel", { 
        vehicle, 
        liters: parseFloat(liters), 
        cost: parseFloat(cost), 
        station: station.trim(), 
        date 
      });
      setVehicle("");
      setLiters("");
      setCost("");
      setStation("");
      setDate(new Date().toISOString().split('T')[0]);
      await loadFuel();
      notifySuccess("Fuel record added successfully!");
    } catch (error) {
      console.error("Error adding fuel:", error);
      notifyError(error.response?.data?.error || "Error adding fuel record");
    }
  };

  const deleteFuel = async (id) => {
    if (!window.confirm("Are you sure you want to delete this fuel record?")) {
      return;
    }
    
    try {
      await api.delete(`/fuel/${id}`);
      await loadFuel();
      notifySuccess("Fuel record deleted!");
    } catch (error) {
      console.error("Error deleting fuel:", error);
      notifyError("Error deleting fuel record");
    }
  };

  const exportFuel = () => {
    window.open("http://localhost:5002/reports/export/fuel", "_blank");
  };

  // Filter fuel based on search term
  const filteredFuel = fuel.filter(f => 
    f.vehicle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.station?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = ["ID", "Vehicle", "Liters", "Cost (KES)", "Station", "Date", "Actions"];
  const data = filteredFuel.map(f => [
    f.id,
    f.vehicle || 'N/A',
    f.liters || 'N/A',
    `KES ${(f.cost || 0).toFixed(2)}`,
    f.station || 'N/A',
    f.date || 'N/A',
    <button 
      onClick={() => deleteFuel(f.id)}
      style={{padding: '5px 10px', fontSize: '12px', cursor: 'pointer', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px'}}
    >
      Delete
    </button>
  ]);

  // Stats
  const totalCost = fuel.reduce((sum, f) => sum + (f.cost || 0), 0);
  const totalLiters = fuel.reduce((sum, f) => sum + (f.liters || 0), 0);
  const avgCostPerLiter = totalLiters > 0 ? (totalCost / totalLiters).toFixed(2) : 0;

  return (
    <div className="content">
      <h2>Fuel Management</h2>
      
      {/* Stats */}
      <div className="stats">
        <div className="stat-card">
          <h3>Total Fuel Cost</h3>
          <p className="stat-value">KES {totalCost.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>Total Liters</h3>
          <p className="stat-value">{totalLiters.toFixed(2)}L</p>
        </div>
        <div className="stat-card">
          <h3>Avg Cost/Liter</h3>
          <p className="stat-value">KES {avgCostPerLiter}</p>
        </div>
        <div className="stat-card">
          <h3>Total Records</h3>
          <p className="stat-value">{fuel.length}</p>
        </div>
      </div>
      
      {/* Search and Export */}
      <div style={{marginBottom: '1rem', display: 'flex', gap: '10px'}}>
        <input
          type="text"
          placeholder="🔍 Search fuel records..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{padding: '10px', width: '300px', border: '1px solid #ddd', borderRadius: '5px'}}
        />
        <button 
          onClick={exportFuel}
          style={{padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}
        >
          📥 Export CSV
        </button>
      </div>
      
      {/* Add Form */}
      <form onSubmit={addFuel} className="add-form">
        <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} required>
          <option value="">Select Vehicle</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.plate}>{v.plate}</option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          placeholder="Liters"
          value={liters}
          onChange={(e) => setLiters(e.target.value)}
          required
        />
        <input
          type="number"
          step="0.01"
          placeholder="Cost (KES)"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Gas Station"
          value={station}
          onChange={(e) => setStation(e.target.value)}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Fuel Record'}
        </button>
      </form>

      {loading ? (
        <p style={{textAlign: 'center', color: '#666'}}>Loading...</p>
      ) : filteredFuel.length > 0 ? (
        <Table columns={columns} data={data} />
      ) : (
        <p style={{textAlign: 'center', color: '#666', marginTop: '2rem'}}>
          {searchTerm ? 'No fuel records found matching your search.' : 'No fuel records found. Add your first fuel record above.'}
        </p>
      )}
    </div>
  );
}
