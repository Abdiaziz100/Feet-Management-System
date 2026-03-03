import React, { useState, useEffect } from 'react';
import api from '../api';
import '../styles/ReportBuilder.css';

function ReportBuilder() {
  const [reportConfig, setReportConfig] = useState({
    title: '',
    dateRange: {
      start: '',
      end: ''
    },
    includeVehicles: false,
    includeDrivers: false,
    includeTrips: false,
    includeFuel: false,
    includeMaintenance: false,
    filters: {
      vehicleStatus: 'all',
      driverStatus: 'all',
      minDistance: '',
      maxDistance: ''
    },
    groupBy: 'none',
    sortBy: 'date',
    format: 'pdf'
  });

  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savedReports, setSavedReports] = useState([]);

  useEffect(() => {
    loadSavedReports();
  }, []);

  const loadSavedReports = () => {
    const saved = localStorage.getItem('savedReports');
    if (saved) {
      setSavedReports(JSON.parse(saved));
    }
  };

  const saveReport = () => {
    if (!reportConfig.title) {
      alert('Please enter a report title');
      return;
    }

    const newReport = {
      id: Date.now(),
      ...reportConfig,
      createdAt: new Date().toISOString()
    };

    const updated = [...savedReports, newReport];
    setSavedReports(updated);
    localStorage.setItem('savedReports', JSON.stringify(updated));
    alert('Report configuration saved!');
  };

  const loadReport = (report) => {
    setReportConfig(report);
  };

  const deleteReport = (reportId) => {
    const updated = savedReports.filter(r => r.id !== reportId);
    setSavedReports(updated);
    localStorage.setItem('savedReports', JSON.stringify(updated));
  };

  const generatePreview = async () => {
    setLoading(true);
    try {
      // Simulate report generation with current data
      const responses = await Promise.all([
        reportConfig.includeVehicles ? api.get('/analytics/vehicle-performance') : null,
        reportConfig.includeDrivers ? api.get('/analytics/driver-performance') : null,
        reportConfig.includeTrips ? api.get('/trips') : null,
        reportConfig.includeFuel ? api.get('/fuel') : null,
        reportConfig.includeMaintenance ? api.get('/maintenance') : null
      ]);

      let combinedData = [];
      
      responses.forEach((response, index) => {
        if (response && response.data) {
          const dataType = ['vehicles', 'drivers', 'trips', 'fuel', 'maintenance'][index];
          const data = Array.isArray(response.data) ? response.data : [response.data];
          
          data.forEach(item => {
            combinedData.push({
              ...item,
              dataType,
              id: `${dataType}_${item.id || Math.random()}`
            });
          });
        }
      });

      // Apply filters
      if (reportConfig.filters.minDistance) {
        combinedData = combinedData.filter(item => 
          !item.distance || item.distance >= parseFloat(reportConfig.filters.minDistance)
        );
      }

      if (reportConfig.filters.maxDistance) {
        combinedData = combinedData.filter(item => 
          !item.distance || item.distance <= parseFloat(reportConfig.filters.maxDistance)
        );
      }

      // Limit preview to 10 items
      setPreviewData(combinedData.slice(0, 10));
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Error generating preview');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!reportConfig.title) {
      alert('Please enter a report title');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/reports/custom', reportConfig, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportConfig.title.replace(/\s+/g, '_')}.${reportConfig.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setReportConfig(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setReportConfig(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  return (
    <div className="report-builder">
      <div className="report-builder-header">
        <h1>📊 Custom Report Builder</h1>
        <p>Create customized reports with advanced filtering and formatting options</p>
      </div>

      <div className="report-builder-content">
        <div className="report-config">
          <div className="config-section">
            <h3>📝 Report Configuration</h3>
            
            <div className="form-group">
              <label>Report Title</label>
              <input
                type="text"
                value={reportConfig.title}
                onChange={(e) => handleConfigChange('title', e.target.value)}
                placeholder="Enter report title"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={reportConfig.dateRange.start}
                  onChange={(e) => handleConfigChange('dateRange.start', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={reportConfig.dateRange.end}
                  onChange={(e) => handleConfigChange('dateRange.end', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="config-section">
            <h3>📋 Data Sources</h3>
            <div className="checkbox-group">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={reportConfig.includeVehicles}
                  onChange={(e) => handleConfigChange('includeVehicles', e.target.checked)}
                />
                <span>🚗 Vehicle Performance Data</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={reportConfig.includeDrivers}
                  onChange={(e) => handleConfigChange('includeDrivers', e.target.checked)}
                />
                <span>👨💼 Driver Performance Data</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={reportConfig.includeTrips}
                  onChange={(e) => handleConfigChange('includeTrips', e.target.checked)}
                />
                <span>🛣️ Trip Records</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={reportConfig.includeFuel}
                  onChange={(e) => handleConfigChange('includeFuel', e.target.checked)}
                />
                <span>⛽ Fuel Records</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={reportConfig.includeMaintenance}
                  onChange={(e) => handleConfigChange('includeMaintenance', e.target.checked)}
                />
                <span>🔧 Maintenance Records</span>
              </label>
            </div>
          </div>

          <div className="config-section">
            <h3>🔍 Filters</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Vehicle Status</label>
                <select
                  value={reportConfig.filters.vehicleStatus}
                  onChange={(e) => handleConfigChange('filters.vehicleStatus', e.target.value)}
                >
                  <option value="all">All Vehicles</option>
                  <option value="active">Active Only</option>
                  <option value="maintenance">In Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="form-group">
                <label>Driver Status</label>
                <select
                  value={reportConfig.filters.driverStatus}
                  onChange={(e) => handleConfigChange('filters.driverStatus', e.target.value)}
                >
                  <option value="all">All Drivers</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Min Distance (km)</label>
                <input
                  type="number"
                  value={reportConfig.filters.minDistance}
                  onChange={(e) => handleConfigChange('filters.minDistance', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>Max Distance (km)</label>
                <input
                  type="number"
                  value={reportConfig.filters.maxDistance}
                  onChange={(e) => handleConfigChange('filters.maxDistance', e.target.value)}
                  placeholder="1000"
                />
              </div>
            </div>
          </div>

          <div className="config-section">
            <h3>⚙️ Output Options</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Group By</label>
                <select
                  value={reportConfig.groupBy}
                  onChange={(e) => handleConfigChange('groupBy', e.target.value)}
                >
                  <option value="none">No Grouping</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="driver">Driver</option>
                  <option value="date">Date</option>
                </select>
              </div>
              <div className="form-group">
                <label>Sort By</label>
                <select
                  value={reportConfig.sortBy}
                  onChange={(e) => handleConfigChange('sortBy', e.target.value)}
                >
                  <option value="date">Date</option>
                  <option value="distance">Distance</option>
                  <option value="cost">Cost</option>
                  <option value="vehicle">Vehicle</option>
                </select>
              </div>
              <div className="form-group">
                <label>Format</label>
                <select
                  value={reportConfig.format}
                  onChange={(e) => handleConfigChange('format', e.target.value)}
                >
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                </select>
              </div>
            </div>
          </div>

          <div className="config-actions">
            <button onClick={generatePreview} disabled={loading} className="preview-btn">
              👁️ Preview Data
            </button>
            <button onClick={saveReport} className="save-btn">
              💾 Save Configuration
            </button>
            <button onClick={generateReport} disabled={loading} className="generate-btn">
              📊 Generate Report
            </button>
          </div>
        </div>

        <div className="report-preview">
          <h3>👁️ Data Preview</h3>
          {loading ? (
            <div className="loading">Generating preview...</div>
          ) : previewData.length > 0 ? (
            <div className="preview-table">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>ID</th>
                    <th>Details</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <span className={`data-type ${item.dataType}`}>
                          {item.dataType}
                        </span>
                      </td>
                      <td>{item.id}</td>
                      <td>
                        {item.vehicle || item.driver || item.name || 'N/A'}
                      </td>
                      <td>
                        {item.distance || item.cost || item.liters || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="preview-note">
                Showing first 10 records. Full report will include all matching data.
              </p>
            </div>
          ) : (
            <div className="no-preview">
              <p>Click "Preview Data" to see a sample of your report data</p>
            </div>
          )}
        </div>
      </div>

      <div className="saved-reports">
        <h3>💾 Saved Report Configurations</h3>
        {savedReports.length > 0 ? (
          <div className="saved-reports-list">
            {savedReports.map((report) => (
              <div key={report.id} className="saved-report-item">
                <div className="report-info">
                  <h4>{report.title}</h4>
                  <p>Created: {new Date(report.createdAt).toLocaleDateString()}</p>
                  <p>Sources: {[
                    report.includeVehicles && 'Vehicles',
                    report.includeDrivers && 'Drivers',
                    report.includeTrips && 'Trips',
                    report.includeFuel && 'Fuel',
                    report.includeMaintenance && 'Maintenance'
                  ].filter(Boolean).join(', ')}</p>
                </div>
                <div className="report-actions">
                  <button onClick={() => loadReport(report)} className="load-btn">
                    📂 Load
                  </button>
                  <button onClick={() => deleteReport(report.id)} className="delete-btn">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No saved report configurations</p>
        )}
      </div>
    </div>
  );
}

export default ReportBuilder;