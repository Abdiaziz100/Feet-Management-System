import { useEffect, useState } from "react";
import api from "../api";
import Table from "../components/Table.jsx";
import { notifySuccess, notifyError } from "../components/NotificationSystem.jsx";

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [plate, setPlate] = useState("");
  const [status, setStatus] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const response = await api.get("/vehicles");
      setVehicles(response.data);
    } catch (error) {
      console.error("Error loading vehicles:", error);
      notifyError("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  const addVehicle = async (e) => {
    e.preventDefault();
    try {
      await api.post("/vehicles", { plate: plate.toUpperCase(), status });
      setPlate("");
      setStatus("active");
      await loadVehicles();
      notifySuccess("Vehicle added successfully!");
    } catch (error) {
      console.error("Error adding vehicle:", error);
      notifyError(error.response?.data?.error || "Error adding vehicle");
    }
  };

  const deleteVehicle = async (id, plate) => {
    if (!window.confirm(`Are you sure you want to delete vehicle ${plate}?`)) {
      return;
    }
    
    try {
      await api.delete(`/vehicles/${id}`);
      await loadVehicles();
      notifySuccess("Vehicle deleted successfully!");
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      notifyError(error.response?.data?.error || "Error deleting vehicle");
    }
  };

  // Filter vehicles based on search term
  const filteredVehicles = vehicles.filter(v => 
    v.plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.driver_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = ["ID", "Plate Number", "Status", "Assigned Driver", "Actions"];
  const data = filteredVehicles.map(v => [
    v.id,
    v.plate,
    <span className={`status-badge status-${v.status}`}>{v.status}</span>,
    v.driver_name || "Unassigned",
    <div style={{display: 'flex', gap: '5px'}}>
      <button 
        onClick={() => {
          const newStatus = prompt('Update status (active/inactive/maintenance):', v.status);
          if (newStatus && ['active', 'inactive', 'maintenance'].includes(newStatus)) {
            api.put(`/vehicles/${v.id}`, { status: newStatus })
              .then(() => { loadVehicles(); notifySuccess('Status updated!'); })
              .catch(err => notifyError('Failed to update status'));
          }
        }}
        style={{padding: '5px 10px', fontSize: '12px', cursor: 'pointer'}}
      >
        Edit
      </button>
      <button 
        onClick={() => deleteVehicle(v.id, v.plate)}
        style={{padding: '5px 10px', fontSize: '12px', cursor: 'pointer', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px'}}
      >
        Delete
      </button>
    </div>
  ]);

  // Stats
  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'active').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    inactive: vehicles.filter(v => v.status === 'inactive').length
  };

  return (
    <div className="content">
      <h2>Vehicles</h2>
      
      {/* Stats */}
      <div className="stats">
        <div className="stat-card">
          <h3>Total</h3>
          <p className="stat-value">{stats.total}</p>
        </div>
        <div className="stat-card">
          <h3>Active</h3>
          <p className="stat-value" style={{color: '#27ae60'}}>{stats.active}</p>
        </div>
        <div className="stat-card">
          <h3>Maintenance</h3>
          <p className="stat-value" style={{color: '#f39c12'}}>{stats.maintenance}</p>
        </div>
        <div className="stat-card">
          <h3>Inactive</h3>
          <p className="stat-value" style={{color: '#e74c3c'}}>{stats.inactive}</p>
        </div>
      </div>
      
      {/* Search */}
      <div style={{marginBottom: '1rem'}}>
        <input
          type="text"
          placeholder="🔍 Search vehicles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{padding: '10px', width: '300px', border: '1px solid #ddd', borderRadius: '5px'}}
        />
      </div>
      
      {/* Add Form */}
      <form onSubmit={addVehicle} className="add-form">
        <input
          type="text"
          placeholder="Plate Number (e.g., KCA 001A)"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          required
          style={{textTransform: 'uppercase'}}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Vehicle'}
        </button>
      </form>

      {loading ? (
        <p style={{textAlign: 'center', color: '#666'}}>Loading...</p>
      ) : filteredVehicles.length > 0 ? (
        <Table columns={columns} data={data} />
      ) : (
        <p style={{textAlign: 'center', color: '#666', marginTop: '2rem'}}>
          {searchTerm ? 'No vehicles found matching your search.' : 'No vehicles found. Add your first vehicle above.'}
        </p>
      )}
    </div>
  );
}
