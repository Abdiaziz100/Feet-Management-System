import { useEffect, useState } from "react";
import api from "../api";

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [formData, setFormData] = useState({ name: "", phone: "", license_number: "" });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadDrivers(); }, []);

  const loadDrivers = () => { api.get("/drivers").then(res => setDrivers(res.data)); };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({ name: "", phone: "", license_number: "" });
    setEditingId(null);
  };

  const addDriver = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert("Name is required");
    setLoading(true);
    try {
      await api.post("/drivers", { name: formData.name.trim(), phone: formData.phone.trim(), license_number: formData.license_number.trim(), active: true });
      resetForm();
      loadDrivers();
      alert("Driver added successfully!");
    } catch (error) { alert("Error: " + error.message); }
    finally { setLoading(false); }
  };

  const startEdit = (driver) => {
    setEditingId(driver.id);
    setFormData({ name: driver.name, phone: driver.phone || "", license_number: driver.license_number || "" });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert("Name is required");
    setLoading(true);
    try {
      await api.put(`/drivers/${editingId}`, { name: formData.name.trim(), phone: formData.phone.trim(), license_number: formData.license_number.trim() });
      resetForm();
      loadDrivers();
      alert("Driver updated successfully!");
    } catch (error) { alert("Error: " + error.message); }
    finally { setLoading(false); }
  };

  const toggleDriverStatus = async (driver) => {
    try {
      await api.put(`/drivers/${driver.id}`, { active: !driver.active });
      loadDrivers();
    } catch (error) { alert("Error updating driver"); }
  };

  const deleteDriver = async (id) => {
    if (!window.confirm("Delete this driver?")) return;
    try { await api.delete(`/drivers/${id}`); loadDrivers(); alert("Deleted!"); }
    catch (error) { alert("Error deleting driver"); }
  };

  return (
    <div className="content" style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>👨‍💼 Driver Management</h2>
      
      <form onSubmit={editingId ? saveEdit : addDriver} style={{ background: 'white', padding: '25px', borderRadius: '16px', marginBottom: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 20px', color: '#2c3e50' }}>{editingId ? '✏️ Edit Driver' : '➕ Add New Driver'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555', fontSize: '14px' }}>Full Name *</label>
            <input type="text" name="name" placeholder="Enter full name" value={formData.name} onChange={handleInputChange} required style={{ width: '100%', padding: '12px', border: '2px solid #e1e5e9', borderRadius: '8px', fontSize: '14px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555', fontSize: '14px' }}>Phone Number</label>
            <input type="tel" name="phone" placeholder="+254 700 000 000" value={formData.phone} onChange={handleInputChange} style={{ width: '100%', padding: '12px', border: '2px solid #e1e5e9', borderRadius: '8px', fontSize: '14px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555', fontSize: '14px' }}>License Number</label>
            <input type="text" name="license_number" placeholder="DL-000000" value={formData.license_number} onChange={handleInputChange} style={{ width: '100%', padding: '12px', border: '2px solid #e1e5e9', borderRadius: '8px', fontSize: '14px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
            <button type="submit" disabled={loading} style={{ flex: '1', padding: '14px 24px', background: loading ? '#95a5a6' : editingId ? 'linear-gradient(135deg, #3498db, #2980b9)' : 'linear-gradient(135deg, #27ae60, #2ecc71)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Saving...' : editingId ? '💾 Save Changes' : '➕ Add Driver'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} style={{ padding: '14px 20px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3498db' }}>{drivers.length}</div>
          <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Total Drivers</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#27ae60' }}>{drivers.filter(d => d.active).length}</div>
          <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Active Drivers</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#e74c3c' }}>{drivers.filter(d => !d.assigned_vehicle || d.assigned_vehicle === 'No vehicle assigned').length}</div>
          <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Unassigned</div>
        </div>
      </div>

      {/* Driver Table */}
      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}><h3 style={{ margin: 0, color: '#2c3e50' }}>📋 All Drivers</h3></div>
        {drivers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}><p>No drivers registered yet!</p></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '15px', textAlign: 'left', color: '#555', fontWeight: '600' }}>ID</th>
                <th style={{ padding: '15px', textAlign: 'left', color: '#555', fontWeight: '600' }}>Name</th>
                <th style={{ padding: '15px', textAlign: 'left', color: '#555', fontWeight: '600' }}>Phone</th>
                <th style={{ padding: '15px', textAlign: 'left', color: '#555', fontWeight: '600' }}>License</th>
                <th style={{ padding: '15px', textAlign: 'left', color: '#555', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '15px', textAlign: 'left', color: '#555', fontWeight: '600' }}>Vehicle</th>
                <th style={{ padding: '15px', textAlign: 'left', color: '#555', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver, index) => (
                <tr key={driver.id} style={{ background: index % 2 === 0 ? 'white' : '#f8f9fa', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px', color: '#7f8c8d' }}>{driver.id}</td>
                  <td style={{ padding: '15px', fontWeight: '600', color: '#2c3e50' }}>{driver.name}</td>
                  <td style={{ padding: '15px' }}>{driver.phone ? <a href={`tel:${driver.phone}`} style={{ color: '#3498db', textDecoration: 'none' }}>📞 {driver.phone}</a> : <span style={{ color: '#ccc' }}>Not provided</span>}</td>
                  <td style={{ padding: '15px' }}>{driver.license_number ? <span style={{ background: '#e8f4fd', padding: '4px 10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' }}>{driver.license_number}</span> : <span style={{ color: '#ccc' }}>Not provided</span>}</td>
                  <td style={{ padding: '15px' }}><span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', background: driver.active ? '#d4edda' : '#f8d7da', color: driver.active ? '#155724' : '#721c24' }}>{driver.active ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ padding: '15px' }}>{driver.assigned_vehicle && driver.assigned_vehicle !== 'No vehicle assigned' ? <span style={{ background: '#27ae60', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '12px' }}>🚗 {driver.assigned_vehicle}</span> : <span style={{ color: '#e74c3c', fontSize: '13px' }}>Not assigned</span>}</td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => startEdit(driver)} style={{ padding: '6px 12px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                      <button onClick={() => toggleDriverStatus(driver)} style={{ padding: '6px 12px', background: driver.active ? '#f39c12' : '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>{driver.active ? 'Deactivate' : 'Activate'}</button>
                      <button onClick={() => deleteDriver(driver.id)} style={{ padding: '6px 12px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

