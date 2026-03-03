from flask import Flask, request, jsonify, make_response
from models import db, Vehicle, Driver, Trip, Fuel, Maintenance, User
from datetime import datetime, timedelta
import json
import csv
from io import StringIO, BytesIO
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
import pandas as pd
from collections import defaultdict
import statistics

class AnalyticsEngine:
    """Advanced analytics and reporting engine"""
    
    @staticmethod
    def get_fleet_kpis():
        """Calculate key performance indicators"""
        vehicles = Vehicle.query.all()
        drivers = Driver.query.all()
        trips = Trip.query.all()
        fuel_records = Fuel.query.all()
        maintenance_records = Maintenance.query.all()
        
        # Basic metrics
        total_vehicles = len(vehicles)
        active_vehicles = len([v for v in vehicles if v.status == 'active'])
        total_drivers = len(drivers)
        active_drivers = len([d for d in drivers if d.active])
        
        # Trip metrics
        total_trips = len(trips)
        total_distance = sum(t.distance or 0 for t in trips)
        avg_trip_distance = total_distance / total_trips if total_trips > 0 else 0
        
        # Fuel metrics
        total_fuel_cost = sum(f.cost or 0 for f in fuel_records)
        total_fuel_liters = sum(f.liters or 0 for f in fuel_records)
        avg_fuel_efficiency = total_distance / total_fuel_liters if total_fuel_liters > 0 else 0
        
        # Maintenance metrics
        total_maintenance_cost = sum(m.cost or 0 for m in maintenance_records)
        pending_maintenance = len([m for m in maintenance_records if m.status == 'pending'])
        
        # Cost per km
        total_operational_cost = total_fuel_cost + total_maintenance_cost
        cost_per_km = total_operational_cost / total_distance if total_distance > 0 else 0
        
        # Vehicle utilization
        assigned_vehicles = len([v for v in vehicles if v.driver_name])
        utilization_rate = (assigned_vehicles / total_vehicles * 100) if total_vehicles > 0 else 0
        
        return {
            'fleet_size': total_vehicles,
            'active_vehicles': active_vehicles,
            'total_drivers': total_drivers,
            'active_drivers': active_drivers,
            'utilization_rate': round(utilization_rate, 2),
            'total_trips': total_trips,
            'total_distance': round(total_distance, 2),
            'avg_trip_distance': round(avg_trip_distance, 2),
            'total_fuel_cost': round(total_fuel_cost, 2),
            'total_fuel_liters': round(total_fuel_liters, 2),
            'fuel_efficiency': round(avg_fuel_efficiency, 2),
            'total_maintenance_cost': round(total_maintenance_cost, 2),
            'pending_maintenance': pending_maintenance,
            'cost_per_km': round(cost_per_km, 2),
            'total_operational_cost': round(total_operational_cost, 2)
        }
    
    @staticmethod
    def get_time_series_data(days=30):
        """Get time series data for charts"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Generate date range
        date_range = []
        current_date = start_date
        while current_date <= end_date:
            date_range.append(current_date.strftime('%Y-%m-%d'))
            current_date += timedelta(days=1)
        
        # Initialize data structures
        daily_trips = defaultdict(int)
        daily_fuel_cost = defaultdict(float)
        daily_maintenance_cost = defaultdict(float)
        daily_distance = defaultdict(float)
        
        # Process trips
        trips = Trip.query.all()
        for trip in trips:
            if trip.date:
                trip_date = trip.date
                if start_date.strftime('%Y-%m-%d') <= trip_date <= end_date.strftime('%Y-%m-%d'):
                    daily_trips[trip_date] += 1
                    daily_distance[trip_date] += trip.distance or 0
        
        # Process fuel records
        fuel_records = Fuel.query.all()
        for fuel in fuel_records:
            if fuel.date:
                fuel_date = fuel.date
                if start_date.strftime('%Y-%m-%d') <= fuel_date <= end_date.strftime('%Y-%m-%d'):
                    daily_fuel_cost[fuel_date] += fuel.cost or 0
        
        # Process maintenance records
        maintenance_records = Maintenance.query.all()
        for maintenance in maintenance_records:
            if maintenance.date:
                maint_date = maintenance.date
                if start_date.strftime('%Y-%m-%d') <= maint_date <= end_date.strftime('%Y-%m-%d'):
                    daily_maintenance_cost[maint_date] += maintenance.cost or 0
        
        # Format data for charts
        return {
            'dates': date_range,
            'trips': [daily_trips[date] for date in date_range],
            'fuel_costs': [round(daily_fuel_cost[date], 2) for date in date_range],
            'maintenance_costs': [round(daily_maintenance_cost[date], 2) for date in date_range],
            'distances': [round(daily_distance[date], 2) for date in date_range]
        }
    
    @staticmethod
    def get_vehicle_performance():
        """Analyze vehicle performance metrics"""
        vehicles = Vehicle.query.all()
        performance_data = []
        
        for vehicle in vehicles:
            # Get trips for this vehicle
            vehicle_trips = Trip.query.filter_by(vehicle=vehicle.plate).all()
            vehicle_fuel = Fuel.query.filter_by(vehicle=vehicle.plate).all()
            vehicle_maintenance = Maintenance.query.filter_by(vehicle=vehicle.plate).all()
            
            total_distance = sum(t.distance or 0 for t in vehicle_trips)
            total_fuel_cost = sum(f.cost or 0 for f in vehicle_fuel)
            total_fuel_liters = sum(f.liters or 0 for f in vehicle_fuel)
            total_maintenance_cost = sum(m.cost or 0 for m in vehicle_maintenance)
            
            fuel_efficiency = total_distance / total_fuel_liters if total_fuel_liters > 0 else 0
            cost_per_km = (total_fuel_cost + total_maintenance_cost) / total_distance if total_distance > 0 else 0
            
            performance_data.append({
                'vehicle': vehicle.plate,
                'driver': vehicle.driver_name or 'Unassigned',
                'status': vehicle.status,
                'total_trips': len(vehicle_trips),
                'total_distance': round(total_distance, 2),
                'fuel_efficiency': round(fuel_efficiency, 2),
                'total_fuel_cost': round(total_fuel_cost, 2),
                'total_maintenance_cost': round(total_maintenance_cost, 2),
                'cost_per_km': round(cost_per_km, 2),
                'maintenance_issues': len([m for m in vehicle_maintenance if m.status == 'pending'])
            })
        
        return performance_data
    
    @staticmethod
    def get_driver_performance():
        """Analyze driver performance metrics"""
        drivers = Driver.query.all()
        performance_data = []
        
        for driver in drivers:
            # Get trips for this driver
            driver_trips = Trip.query.filter_by(driver=driver.name).all()
            
            total_distance = sum(t.distance or 0 for t in driver_trips)
            avg_trip_distance = total_distance / len(driver_trips) if driver_trips else 0
            
            # Calculate fuel efficiency for driver's trips
            if driver.assigned_vehicle:
                driver_fuel = Fuel.query.filter_by(vehicle=driver.assigned_vehicle).all()
                total_fuel_liters = sum(f.liters or 0 for f in driver_fuel)
                fuel_efficiency = total_distance / total_fuel_liters if total_fuel_liters > 0 else 0
            else:
                fuel_efficiency = 0
            
            performance_data.append({
                'driver': driver.name,
                'vehicle': driver.assigned_vehicle or 'None',
                'active': driver.active,
                'total_trips': len(driver_trips),
                'total_distance': round(total_distance, 2),
                'avg_trip_distance': round(avg_trip_distance, 2),
                'fuel_efficiency': round(fuel_efficiency, 2),
                'current_location': driver.current_location or 'Unknown'
            })
        
        return performance_data
    
    @staticmethod
    def generate_predictive_insights():
        """Generate predictive analytics insights"""
        insights = []
        
        # Maintenance predictions
        vehicles = Vehicle.query.all()
        for vehicle in vehicles:
            vehicle_trips = Trip.query.filter_by(vehicle=vehicle.plate).all()
            total_distance = sum(t.distance or 0 for t in vehicle_trips)
            
            # Predict maintenance based on distance (every 10,000 km)
            if total_distance > 0:
                next_maintenance_km = ((total_distance // 10000) + 1) * 10000
                remaining_km = next_maintenance_km - total_distance
                
                if remaining_km < 1000:
                    insights.append({
                        'type': 'maintenance_due',
                        'vehicle': vehicle.plate,
                        'message': f'Maintenance due soon for {vehicle.plate} (in {remaining_km:.0f} km)',
                        'priority': 'high' if remaining_km < 500 else 'medium'
                    })
        
        # Fuel cost trends
        fuel_records = Fuel.query.order_by(Fuel.date.desc()).limit(10).all()
        if len(fuel_records) >= 5:
            recent_costs = [f.cost / f.liters for f in fuel_records[:5] if f.liters > 0]
            older_costs = [f.cost / f.liters for f in fuel_records[5:] if f.liters > 0]
            
            if recent_costs and older_costs:
                recent_avg = statistics.mean(recent_costs)
                older_avg = statistics.mean(older_costs)
                
                if recent_avg > older_avg * 1.1:
                    insights.append({
                        'type': 'fuel_cost_increase',
                        'message': f'Fuel costs increased by {((recent_avg/older_avg - 1) * 100):.1f}% recently',
                        'priority': 'medium'
                    })
        
        # Driver performance alerts
        drivers = Driver.query.all()
        for driver in drivers:
            driver_trips = Trip.query.filter_by(driver=driver.name).all()
            if len(driver_trips) >= 5:
                distances = [t.distance for t in driver_trips[-5:] if t.distance]
                if distances:
                    avg_distance = statistics.mean(distances)
                    if avg_distance < 50:  # Short trips might indicate inefficiency
                        insights.append({
                            'type': 'driver_efficiency',
                            'driver': driver.name,
                            'message': f'Driver {driver.name} has been making short trips (avg: {avg_distance:.1f} km)',
                            'priority': 'low'
                        })
        
        return insights

class ReportGenerator:
    """Generate various report formats"""
    
    @staticmethod
    def generate_csv_report(data, filename):
        """Generate CSV report"""
        output = StringIO()
        
        if not data:
            return ""
        
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        
        return output.getvalue()
    
    @staticmethod
    def generate_pdf_report(title, data, filename):
        """Generate PDF report"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        # Title
        elements.append(Paragraph(title, title_style))
        elements.append(Spacer(1, 20))
        
        if data:
            # Create table
            table_data = [list(data[0].keys())]  # Headers
            for row in data:
                table_data.append([str(v) for v in row.values()])
            
            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 14),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            elements.append(table)
        
        # Generate timestamp
        elements.append(Spacer(1, 30))
        timestamp = Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal'])
        elements.append(timestamp)
        
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

# Analytics API endpoints
def create_analytics_routes(app):
    """Create analytics and reporting routes"""
    
    @app.route("/analytics/kpis", methods=["GET"])
    def get_kpis():
        """Get key performance indicators"""
        kpis = AnalyticsEngine.get_fleet_kpis()
        return jsonify(kpis)
    
    @app.route("/analytics/time-series", methods=["GET"])
    def get_time_series():
        """Get time series data for charts"""
        days = request.args.get('days', 30, type=int)
        data = AnalyticsEngine.get_time_series_data(days)
        return jsonify(data)
    
    @app.route("/analytics/vehicle-performance", methods=["GET"])
    def get_vehicle_performance():
        """Get vehicle performance analytics"""
        data = AnalyticsEngine.get_vehicle_performance()
        return jsonify(data)
    
    @app.route("/analytics/driver-performance", methods=["GET"])
    def get_driver_performance():
        """Get driver performance analytics"""
        data = AnalyticsEngine.get_driver_performance()
        return jsonify(data)
    
    @app.route("/analytics/insights", methods=["GET"])
    def get_insights():
        """Get predictive insights"""
        insights = AnalyticsEngine.generate_predictive_insights()
        return jsonify(insights)
    
    @app.route("/reports/export/<report_type>", methods=["GET"])
    def export_report(report_type):
        """Export reports in various formats"""
        format_type = request.args.get('format', 'csv')
        
        # Get data based on report type
        if report_type == 'vehicles':
            data = AnalyticsEngine.get_vehicle_performance()
            title = "Vehicle Performance Report"
        elif report_type == 'drivers':
            data = AnalyticsEngine.get_driver_performance()
            title = "Driver Performance Report"
        elif report_type == 'kpis':
            data = [AnalyticsEngine.get_fleet_kpis()]
            title = "Fleet KPI Report"
        else:
            return jsonify(error="Invalid report type"), 400
        
        if format_type == 'csv':
            csv_data = ReportGenerator.generate_csv_report(data, f"{report_type}.csv")
            response = make_response(csv_data)
            response.headers["Content-Disposition"] = f"attachment; filename={report_type}.csv"
            response.headers["Content-type"] = "text/csv"
            return response
        
        elif format_type == 'pdf':
            pdf_data = ReportGenerator.generate_pdf_report(title, data, f"{report_type}.pdf")
            response = make_response(pdf_data)
            response.headers["Content-Disposition"] = f"attachment; filename={report_type}.pdf"
            response.headers["Content-type"] = "application/pdf"
            return response
        
        else:
            return jsonify(error="Invalid format type"), 400
    
    @app.route("/reports/custom", methods=["POST"])
    def generate_custom_report():
        """Generate custom report based on filters"""
        filters = request.json
        
        # Apply filters and generate custom dataset
        # This is a simplified version - can be expanded based on needs
        report_data = []
        
        if filters.get('include_vehicles'):
            report_data.extend(AnalyticsEngine.get_vehicle_performance())
        
        if filters.get('include_drivers'):
            report_data.extend(AnalyticsEngine.get_driver_performance())
        
        return jsonify(report_data)