import { useEffect, useState } from "react";
import api from "../api";
import Table from "../components/Table.jsx";
import { notifySuccess, notifyError } from "../components/NotificationSystem.jsx";

export default function Maintenance() {
  const [maintenance, setMaintenance] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicle, setVehicle] = useState("");
  const [issue, setIssue] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [status, setStatus] = useState("pending");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMaintenance();
    loadVehicles();
  }, []);

  const loadMaintenance = async () => {
    setLoading(true);
    try {
      const response = await api.get("/maintenance");
      setMaintenance(response.data);
    } catch (error) {
      console.error("Error loading maintenance:", error);
      notifyError("Failed to load maintenance records");
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

  const addMaintenance = async (e) => {
    e.preventDefault();
    try {
      await api.post("/maintenance", { 
        vehicle, 
        issue: issue.trim(), 
        description: description.trim(), 
        cost: cost ? parseFloat(cost) : 0, 
        status, 
        date 
      });
      setVehicle("");
      setIssue("");
      setDescription("");
      setCost("");
      setStatus("pending");
      setDate(new Date().toISOString().split('T')[0]);
      await loadMaintenance();
      notifySuccess("Maintenance record added successfully!");
    } catch (error) {
      console.error("Error adding maintenance:", error);
      notifyError(error.response?.data?.error || "Error adding maintenance record");
    }
  };

  const updateMaintenanceStatus = async (id, newStatus) => {
    try {
      await api.put(`/maintenance/${id}`, { status: newStatus });
      await loadMaintenance();
      notifySuccess("Status updated successfully!");
    } catch (error) {
      console.error("Error updating status:", error);
      notifyError("Error updating status");
    }
  };

  const deleteMaintenance = async (id) => {
    if (!window.confirm("Are you sure you want to delete this maintenance record?")) {
      return;
    }
    
    try {
      await api.delete(`/maintenance/${id}`);
      await loadMaintenance();
      notifySuccess("Maintenance record deleted!");
    } catch (error) {
      console.error("Error deleting maintenance:", error);
      notifyError("Error deleting maintenance record");
    }
  };

  const exportMaintenance = () => {
    window.open("http://localhost:5002/reports/export/maintenance", "_blank");
  };

  // Filter maintenance based on search term
  const filteredMaintenance = maintenance.filter(m => 
    m.vehicle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.issue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = ["ID", "Vehicle", "Issue", "Cost (KES)", "Status", "Date", "Actions"];
  const data = filteredMaintenance.map(m => [
    m.id,
    m.vehicle || 'N/A',
    m.issue,
    `KES ${(m.cost || 0).toFixed(2)}`,
    <select 
      value={m.status}
      onChange={(e) => updateMaintenanceStatus(m.id, e.target.value)}
      style={{padding: '5px', borderRadius: '4px', border: '1px solid #ddd'}}
    >
      <option value="pending">Pending</option>
      <option value="in-progress">In Progress</option>
      <option value="completed">Completed</option>
    </select>,
    m.date || 'N/A',
    <button 
      onClick={() => deleteMaintenance(m.id)}
      style={{padding: '5px 10px', fontSize: '12px', cursor: 'pointer', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px'}}
    >
      Delete
    </button>
  ]);

  // Stats
  const pendingCount = maintenance.filter(m => m.status === 'pending').length;
  const inProgressCount = maintenance.filter(m => m.status === 'in-progress').length;
  const completedCount = maintenance.filter(m => m.status === 'completed').length;
  const totalCost = maintenance.reduce((sum, m) => sum + (m.cost || 0), 0);

  return (
    <div className="content">
      <h2>Maintenance Management</h2>
      
      {/* Stats */}
      <div className="stats">
        <div className="stat-card">
          <h3>Pending</h3>
          <p className="stat-value" style={{color: '#f39c12'}}>{pendingCount}</p>
        </div>
        <div className="stat-card">
          <h3>In Progress</h3>
          <p className="stat-value" style={{color: '#3498db'}}>{inProgressCount}</p>
        </div>
        <div className="stat-card">
          <h3>Completed</h3>
          <p className="stat-value" style={{color: '#27ae60'}}>{completedCount}</p>
        </div>
        <div className="stat-card">
          <h3>Total Cost</h3>
          <p className="stat-value">KES {totalCost.toFixed(2)}</p>
        </div>
      </div>
      
      {/* Search and Export */}
      <div style={{marginBottom: '1rem', display: 'flex', gap: '10px'}}>
        <input
          type="text"
          placeholder="🔍 Search maintenance records..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{padding: '10px', width: '300px', border: '1px solid #ddd', borderRadius: '5px'}}
        />
        <button 
          onClick={exportMaintenance}
          style={{padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}
        >
          📥 Export CSV
        </button>
      </div>
      
      {/* Add Form */}
      <form onSubmit={addMaintenance} className="add-form">
        <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} required>
          <option value="">Select Vehicle</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.plate}>{v.plate}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Issue Title"
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="number"
          step="0.01"
          placeholder="Cost (KES)"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Maintenance'}
        </button>
      </form>

      {loading ? (
        <p style={{textAlign: 'center', color: '#666'}}>Loading...</p>
      ) : filteredMaintenance.length > 0 ? (
        <Table columns={columns} data={data} />
      ) : (
        <p style={{textAlign: 'center', color: '#666', marginTop: '2rem'}}>
          {searchTerm ? 'No maintenance records found matching your search.' : 'No maintenance records found. Add your first maintenance record above.'}
        </p>
      )}
    </div>
  );
}
