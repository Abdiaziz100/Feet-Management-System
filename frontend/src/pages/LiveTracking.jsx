import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function LiveTracking() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter] = useState({ lat: -1.2921, lng: 36.8219 }); // Nairobi

  const loadDrivers = () => {
    api.get("/drivers").then(res => {
      const driversWithLocation = res.data.map((driver, index) => ({
        ...driver,
        lat: mapCenter.lat + (Math.random() - 0.5) * 0.1,
        lng: mapCenter.lng + (Math.random() - 0.5) * 0.1,
        status: Math.random() > 0.3 ? 'active' : 'offline',
        speed: Math.floor(Math.random() * 60),
        lastUpdate: new Date().toLocaleTimeString()
      }));
      setDrivers(driversWithLocation);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadDrivers();
    const interval = setInterval(loadDrivers, 15000);
    return () => clearInterval(interval);
  }, []);

  const activeDrivers = drivers.filter(d => d.status === 'active').length;
  const offlineDrivers = drivers.filter(d => d.status === 'offline').length;

  const handleDriverClick = (driver) => {
    setSelectedDriver(driver);
  };

  const openInOSM = (driver) => {
    window.open(`https://www.openstreetmap.org/?mlat=${driver.lat}&mlon=${driver.lng}#map=15/${driver.lat}/${driver.lng}`, '_blank');
  };

  if (loading) {
    return (
      <div className="content">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading live tracking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content" style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 10px', color: '#2c3e50' }}>🗺️ Live Fleet Tracking</h2>
        <p style={{ margin: 0, color: '#7f8c8d' }}>Real-time GPS tracking of all fleet vehicles</p>
      </div>

      {/* Status Bar */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <div style={{ background: 'white', padding: '15px 25px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27ae60', animation: 'pulse 2s infinite' }}></span>
          <span style={{ fontWeight: '600' }}>{activeDrivers} Active</span>
        </div>
        <div style={{ background: 'white', padding: '15px 25px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#e74c3c' }}></span>
          <span style={{ fontWeight: '600' }}>{offlineDrivers} Offline</span>
        </div>
        <button onClick={loadDrivers} style={{ marginLeft: 'auto', padding: '12px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
          🔄 Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Map Section */}
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '600', color: '#2c3e50' }}>Map View - Nairobi Region</span>
            <a href={`https://www.openstreetmap.org/#map=12/${mapCenter.lat}/${mapCenter.lng}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3498db', textDecoration: 'none', fontSize: '14px' }}>
              Open Full Map ↗
            </a>
          </div>
          <div style={{ height: '500px', background: 'linear-gradient(135deg, #e8f5e9 0%, #e3f2fd 100%)', position: 'relative' }}>
            {/* Simulated Map with OpenStreetMap tiles */}
            <img 
              src={`https://tile.openstreetmap.org/12/${Math.floor(mapCenter.lat * 2 + 2048)}/${Math.floor(mapCenter.lng * 2 + 2048)}.png`}
              alt="Map"
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(232, 245, 233, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>🗺️</div>
              <p style={{ color: '#555', marginBottom: '20px' }}>Interactive Map - Nairobi Region</p>
              <p style={{ color: '#888', fontSize: '14px' }}>Center: {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}</p>
            </div>
            
            {/* Driver Markers */}
            {drivers.map((driver, index) => (
              <div
                key={driver.id}
                onClick={() => handleDriverClick(driver)}
                style={{
                  position: 'absolute',
                  top: `${30 + (index * 5)}%`,
                  left: `${20 + (index * 15)}%`,
                  cursor: 'pointer',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10
                }}
              >
                <div style={{ 
                  fontSize: '28px',
                  filter: driver.status === 'active' ? 'drop-shadow(0 0 5px #27ae60)' : 'grayscale(100%)'
                }}>
                  {driver.status === 'active' ? '🚗' : '🚙'}
                </div>
                <div style={{ 
                  position: 'absolute', 
                  top: '30px', 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  background: driver.status === 'active' ? '#27ae60' : '#e74c3c',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  whiteSpace: 'nowrap'
                }}>
                  {driver.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Driver List */}
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee' }}>
            <h3 style={{ margin: 0, color: '#2c3e50' }}>🚗 Driver List ({drivers.length})</h3>
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {drivers.map(driver => (
              <div
                key={driver.id}
                onClick={() => handleDriverClick(driver)}
                style={{
                  padding: '15px 20px',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                  background: selectedDriver?.id === driver.id ? '#f0f8ff' : 'white',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#2c3e50' }}>{driver.name}</span>
                  <span style={{ 
                    padding: '3px 10px', 
                    borderRadius: '12px', 
                    fontSize: '11px',
                    fontWeight: '600',
                    background: driver.status === 'active' ? '#d4edda' : '#f8d7da',
                    color: driver.status === 'active' ? '#155724' : '#721c24'
                  }}>
                    {driver.status === 'active' ? '🟢 Active' : '🔴 Offline'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#7f8c8d' }}>
                  <div>📍 {driver.lat.toFixed(4)}, {driver.lng.toFixed(4)}</div>
                  {driver.status === 'active' && <div>⚡ {driver.speed} km/h</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Driver Details */}
      {selectedDriver && (
        <div style={{ marginTop: '20px', background: 'white', borderRadius: '16px', padding: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#2c3e50' }}>👤 Driver Details: {selectedDriver.name}</h3>
            <button onClick={() => setSelectedDriver(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
              <div style={{ color: '#7f8c8d', fontSize: '12px', marginBottom: '5px' }}>Phone</div>
              <div style={{ fontWeight: '600', color: '#2c3e50' }}>{selectedDriver.phone || 'Not provided'}</div>
            </div>
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
              <div style={{ color: '#7f8c8d', fontSize: '12px', marginBottom: '5px' }}>License</div>
              <div style={{ fontWeight: '600', color: '#2c3e50' }}>{selectedDriver.license_number || 'Not provided'}</div>
            </div>
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
              <div style={{ color: '#7f8c8d', fontSize: '12px', marginBottom: '5px' }}>GPS Location</div>
              <div style={{ fontWeight: '600', color: '#2c3e50' }}>{selectedDriver.lat.toFixed(4)}, {selectedDriver.lng.toFixed(4)}</div>
            </div>
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
              <div style={{ color: '#7f8c8d', fontSize: '12px', marginBottom: '5px' }}>Last Update</div>
              <div style={{ fontWeight: '600', color: '#2c3e50' }}>{selectedDriver.lastUpdate}</div>
            </div>
          </div>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => openInOSM(selectedDriver)} style={{ padding: '10px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
              🗺️ View on Map
            </button>
            <button style={{ padding: '10px 20px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
              📤 Send Alert
            </button>
            <button style={{ padding: '10px 20px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
              🛑 Emergency Stop
            </button>
            <button style={{ padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
              📞 Call Driver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

