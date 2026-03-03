export default function StatCard({ title, value, trend, icon, color }) {
  // Default color scheme based on title
  const getColorScheme = () => {
    const schemes = {
      'total vehicles': { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '🚗' },
      'active vehicles': { bg: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', icon: '✅' },
      'active drivers': { bg: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)', icon: '👨‍💼' },
      "today's trips": { bg: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)', icon: '🛣️' },
      'total trips': { bg: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)', icon: '🛣️' },
      'fuel cost': { bg: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)', icon: '⛽' },
      'pending maintenance': { bg: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)', icon: '🔧' },
      'maintenance': { bg: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)', icon: '🔧' },
    };
    
    const key = title.toLowerCase();
    return schemes[key] || { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '📊' };
  };

  const scheme = color ? { bg: color, icon: icon || '📊' } : getColorScheme();

  return (
    <div className="stat-card enhanced">
      <div className="stat-card-icon" style={{ background: scheme.bg }}>
        {scheme.icon}
      </div>
      <div className="stat-card-content">
        <h3>{title}</h3>
        <p className="stat-value">{value || 0}</p>
        {trend && <p className="stat-trend">{trend}</p>}
      </div>
    </div>
  );
}
