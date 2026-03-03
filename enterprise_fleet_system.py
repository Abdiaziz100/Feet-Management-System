from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import json
import csv
import secrets
import statistics
from io import StringIO, BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
import jwt
import os

app = Flask(__name__)
CORS(app, supports_credentials=True)

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'fleet-management-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///enterprise_fleet.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ==================== MODELS ====================
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(100), unique=True)
    role = db.Column(db.String(20), default='user')  # admin, manager, driver, viewer
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Vehicle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    plate = db.Column(db.String(50), unique=True, nullable=False)
    make = db.Column(db.String(50))
    model = db.Column(db.String(50))
    year = db.Column(db.Integer)
    status = db.Column(db.String(20), default='active')
    driver_name = db.Column(db.String(100))
    gps_lat = db.Column(db.Float)
    gps_lng = db.Column(db.Float)
    last_location_update = db.Column(db.DateTime)
    fuel_capacity = db.Column(db.Float, default=50.0)
    mileage = db.Column(db.Float, default=0.0)
    
class Driver(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    license_number = db.Column(db.String(50))
    license_expiry = db.Column(db.Date)
    active = db.Column(db.Boolean, default=True)
    assigned_vehicle = db.Column(db.String(50))
    current_location = db.Column(db.String(200))
    performance_score = db.Column(db.Float, default=0.0)
    
class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vehicle = db.Column(db.String(50), nullable=False)
    driver = db.Column(db.String(100), nullable=False)
    start_location = db.Column(db.String(200))
    end_location = db.Column(db.String(200))
    start_lat = db.Column(db.Float)
    start_lng = db.Column(db.Float)
    end_lat = db.Column(db.Float)
    end_lng = db.Column(db.Float)
    distance = db.Column(db.Float, default=0)
    duration = db.Column(db.Integer)  # minutes
    date = db.Column(db.String(50))
    status = db.Column(db.String(20), default='completed')
    fuel_consumed = db.Column(db.Float)
    
class Fuel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vehicle = db.Column(db.String(50), nullable=False)
    liters = db.Column(db.Float, default=0)
    cost = db.Column(db.Float, default=0)
    price_per_liter = db.Column(db.Float)
    date = db.Column(db.String(50))
    station = db.Column(db.String(100))
    odometer_reading = db.Column(db.Float)
    
class Maintenance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vehicle = db.Column(db.String(50), nullable=False)
    type = db.Column(db.String(50))  # scheduled, repair, inspection
    issue = db.Column(db.String(200))
    description = db.Column(db.Text)
    cost = db.Column(db.Float, default=0)
    date = db.Column(db.String(50))
    scheduled_date = db.Column(db.String(50))
    status = db.Column(db.String(20), default='pending')
    priority = db.Column(db.String(20), default='medium')
    
class Alert(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50))  # maintenance, fuel, speed, geofence
    vehicle = db.Column(db.String(50))
    driver = db.Column(db.String(100))
    message = db.Column(db.Text)
    severity = db.Column(db.String(20), default='medium')
    status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
class Route(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    start_location = db.Column(db.String(200))
    end_location = db.Column(db.String(200))
    waypoints = db.Column(db.Text)  # JSON string
    distance = db.Column(db.Float)
    estimated_duration = db.Column(db.Integer)
    
class Geofence(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    center_lat = db.Column(db.Float)
    center_lng = db.Column(db.Float)
    radius = db.Column(db.Float)  # meters
    type = db.Column(db.String(50))  # allowed, restricted
    
# ==================== ANALYTICS ENGINE ====================
class EnterpriseAnalytics:
    @staticmethod
    def get_comprehensive_kpis():
        vehicles = Vehicle.query.all()
        drivers = Driver.query.all()
        trips = Trip.query.all()
        fuel_records = Fuel.query.all()
        maintenance_records = Maintenance.query.all()
        alerts = Alert.query.filter_by(status='active').all()
        
        # Fleet metrics
        total_vehicles = len(vehicles)
        active_vehicles = len([v for v in vehicles if v.status == 'active'])
        utilization_rate = (len([v for v in vehicles if v.driver_name]) / total_vehicles * 100) if total_vehicles > 0 else 0
        
        # Trip metrics
        total_distance = sum(t.distance or 0 for t in trips)
        total_trips = len(trips)
        avg_trip_distance = total_distance / total_trips if total_trips > 0 else 0
        
        # Fuel metrics
        total_fuel_cost = sum(f.cost or 0 for f in fuel_records)
        total_fuel_liters = sum(f.liters or 0 for f in fuel_records)
        fuel_efficiency = total_distance / total_fuel_liters if total_fuel_liters > 0 else 0
        
        # Cost metrics
        total_maintenance_cost = sum(m.cost or 0 for m in maintenance_records)
        cost_per_km = (total_fuel_cost + total_maintenance_cost) / total_distance if total_distance > 0 else 0
        
        # Performance metrics
        avg_driver_score = statistics.mean([d.performance_score for d in drivers if d.performance_score > 0]) if drivers else 0
        
        return {
            'fleet_size': total_vehicles,
            'active_vehicles': active_vehicles,
            'utilization_rate': round(utilization_rate, 2),
            'total_drivers': len(drivers),
            'active_drivers': len([d for d in drivers if d.active]),
            'total_trips': total_trips,
            'total_distance': round(total_distance, 2),
            'avg_trip_distance': round(avg_trip_distance, 2),
            'fuel_efficiency': round(fuel_efficiency, 2),
            'total_fuel_cost': round(total_fuel_cost, 2),
            'total_maintenance_cost': round(total_maintenance_cost, 2),
            'cost_per_km': round(cost_per_km, 2),
            'active_alerts': len(alerts),
            'avg_driver_score': round(avg_driver_score, 2),
            'pending_maintenance': len([m for m in maintenance_records if m.status == 'pending'])
        }
    
    @staticmethod
    def get_predictive_insights():
        insights = []
        vehicles = Vehicle.query.all()
        
        # Maintenance predictions
        for vehicle in vehicles:
            if vehicle.mileage and vehicle.mileage > 0:
                next_service = ((vehicle.mileage // 10000) + 1) * 10000
                km_to_service = next_service - vehicle.mileage
                
                if km_to_service < 1000:
                    insights.append({
                        'type': 'maintenance_due',
                        'vehicle': vehicle.plate,
                        'message': f'Service due in {km_to_service:.0f} km for {vehicle.plate}',
                        'priority': 'high' if km_to_service < 500 else 'medium'
                    })
        
        # Fuel cost analysis
        recent_fuel = Fuel.query.order_by(Fuel.date.desc()).limit(10).all()
        if len(recent_fuel) >= 5:
            recent_prices = [f.price_per_liter for f in recent_fuel[:5] if f.price_per_liter]
            if recent_prices:
                avg_price = statistics.mean(recent_prices)
                if avg_price > 1.5:  # Example threshold
                    insights.append({
                        'type': 'fuel_cost_alert',
                        'message': f'Fuel prices averaging ${avg_price:.2f}/L - consider fuel optimization',
                        'priority': 'medium'
                    })
        
        return insights

# ==================== ROUTES ====================

# Initialize database
with app.app_context():
    db.create_all()
    
    # Create default users
    if not User.query.filter_by(username='admin').first():
        users = [
            User(username='admin', password=generate_password_hash('admin123'), email='admin@fleet.com', role='admin'),
            User(username='manager', password=generate_password_hash('manager123'), email='manager@fleet.com', role='manager'),
            User(username='driver1', password=generate_password_hash('driver123'), email='driver1@fleet.com', role='driver'),
        ]
        for user in users:
            db.session.add(user)
        db.session.commit()

# Authentication
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password, password):
        token = jwt.encode({
            'user_id': user.id,
            'username': user.username,
            'role': user.role,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['SECRET_KEY'])
        
        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role,
                'email': user.email
            }
        })
    
    return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

# Dashboard Analytics
@app.route("/api/dashboard/kpis")
def dashboard_kpis():
    kpis = EnterpriseAnalytics.get_comprehensive_kpis()
    return jsonify(kpis)

@app.route("/api/dashboard/insights")
def dashboard_insights():
    insights = EnterpriseAnalytics.get_predictive_insights()
    return jsonify(insights)

# Vehicle Management
@app.route("/api/vehicles", methods=["GET", "POST"])
def vehicles():
    if request.method == "POST":
        data = request.json
        vehicle = Vehicle(
            plate=data.get('plate').upper(),
            make=data.get('make'),
            model=data.get('model'),
            year=data.get('year'),
            fuel_capacity=data.get('fuel_capacity', 50.0)
        )
        db.session.add(vehicle)
        db.session.commit()
        return jsonify({'message': 'Vehicle added successfully'}), 201
    
    vehicles = Vehicle.query.all()
    return jsonify([{
        'id': v.id,
        'plate': v.plate,
        'make': v.make,
        'model': v.model,
        'year': v.year,
        'status': v.status,
        'driver_name': v.driver_name,
        'mileage': v.mileage,
        'last_location': {
            'lat': v.gps_lat,
            'lng': v.gps_lng,
            'updated': v.last_location_update.isoformat() if v.last_location_update else None
        }
    } for v in vehicles])

# Real-time GPS Tracking
@app.route("/api/vehicles/<int:vehicle_id>/location", methods=["PUT"])
def update_vehicle_location(vehicle_id):
    data = request.json
    vehicle = Vehicle.query.get(vehicle_id)
    if vehicle:
        vehicle.gps_lat = data.get('lat')
        vehicle.gps_lng = data.get('lng')
        vehicle.last_location_update = datetime.utcnow()
        db.session.commit()
        return jsonify({'message': 'Location updated'})
    return jsonify({'error': 'Vehicle not found'}), 404

@app.route("/api/tracking/live")
def live_tracking():
    vehicles = Vehicle.query.filter(Vehicle.gps_lat.isnot(None)).all()
    return jsonify([{
        'id': v.id,
        'plate': v.plate,
        'driver': v.driver_name,
        'lat': v.gps_lat,
        'lng': v.gps_lng,
        'status': v.status,
        'last_update': v.last_location_update.isoformat() if v.last_location_update else None
    } for v in vehicles])

# Driver Management
@app.route("/api/drivers", methods=["GET", "POST"])
def drivers():
    if request.method == "POST":
        data = request.json
        driver = Driver(
            name=data.get('name'),
            phone=data.get('phone'),
            license_number=data.get('license_number'),
            license_expiry=datetime.strptime(data.get('license_expiry'), '%Y-%m-%d').date() if data.get('license_expiry') else None
        )
        db.session.add(driver)
        db.session.commit()
        return jsonify({'message': 'Driver added successfully'}), 201
    
    drivers = Driver.query.all()
    return jsonify([{
        'id': d.id,
        'name': d.name,
        'phone': d.phone,
        'license_number': d.license_number,
        'license_expiry': d.license_expiry.isoformat() if d.license_expiry else None,
        'active': d.active,
        'assigned_vehicle': d.assigned_vehicle,
        'performance_score': d.performance_score
    } for d in drivers])

# Trip Management
@app.route("/api/trips", methods=["GET", "POST"])
def trips():
    if request.method == "POST":
        data = request.json
        trip = Trip(
            vehicle=data.get('vehicle'),
            driver=data.get('driver'),
            start_location=data.get('start_location'),
            end_location=data.get('end_location'),
            distance=data.get('distance', 0),
            duration=data.get('duration', 0),
            date=data.get('date', datetime.now().strftime('%Y-%m-%d'))
        )
        db.session.add(trip)
        db.session.commit()
        return jsonify({'message': 'Trip recorded successfully'}), 201
    
    trips = Trip.query.order_by(Trip.date.desc()).all()
    return jsonify([{
        'id': t.id,
        'vehicle': t.vehicle,
        'driver': t.driver,
        'start_location': t.start_location,
        'end_location': t.end_location,
        'distance': t.distance,
        'duration': t.duration,
        'date': t.date,
        'status': t.status
    } for t in trips])

# Fuel Management
@app.route("/api/fuel", methods=["GET", "POST"])
def fuel():
    if request.method == "POST":
        data = request.json
        fuel_record = Fuel(
            vehicle=data.get('vehicle'),
            liters=data.get('liters'),
            cost=data.get('cost'),
            price_per_liter=data.get('cost') / data.get('liters') if data.get('liters') > 0 else 0,
            date=data.get('date', datetime.now().strftime('%Y-%m-%d')),
            station=data.get('station'),
            odometer_reading=data.get('odometer_reading')
        )
        db.session.add(fuel_record)
        db.session.commit()
        return jsonify({'message': 'Fuel record added successfully'}), 201
    
    fuel_records = Fuel.query.order_by(Fuel.date.desc()).all()
    return jsonify([{
        'id': f.id,
        'vehicle': f.vehicle,
        'liters': f.liters,
        'cost': f.cost,
        'price_per_liter': f.price_per_liter,
        'date': f.date,
        'station': f.station
    } for f in fuel_records])

# Maintenance Management
@app.route("/api/maintenance", methods=["GET", "POST"])
def maintenance():
    if request.method == "POST":
        data = request.json
        maintenance_record = Maintenance(
            vehicle=data.get('vehicle'),
            type=data.get('type', 'repair'),
            issue=data.get('issue'),
            description=data.get('description'),
            cost=data.get('cost', 0),
            date=data.get('date', datetime.now().strftime('%Y-%m-%d')),
            priority=data.get('priority', 'medium')
        )
        db.session.add(maintenance_record)
        db.session.commit()
        return jsonify({'message': 'Maintenance record added successfully'}), 201
    
    maintenance_records = Maintenance.query.order_by(Maintenance.date.desc()).all()
    return jsonify([{
        'id': m.id,
        'vehicle': m.vehicle,
        'type': m.type,
        'issue': m.issue,
        'description': m.description,
        'cost': m.cost,
        'date': m.date,
        'status': m.status,
        'priority': m.priority
    } for m in maintenance_records])

# Alerts Management
@app.route("/api/alerts")
def alerts():
    alerts = Alert.query.filter_by(status='active').order_by(Alert.created_at.desc()).all()
    return jsonify([{
        'id': a.id,
        'type': a.type,
        'vehicle': a.vehicle,
        'driver': a.driver,
        'message': a.message,
        'severity': a.severity,
        'created_at': a.created_at.isoformat()
    } for a in alerts])

# Reports Export
@app.route("/api/reports/export/<report_type>")
def export_report(report_type):
    format_type = request.args.get('format', 'csv')
    
    if report_type == 'vehicles':
        vehicles = Vehicle.query.all()
        data = [{
            'Plate': v.plate,
            'Make': v.make,
            'Model': v.model,
            'Year': v.year,
            'Status': v.status,
            'Driver': v.driver_name or 'Unassigned',
            'Mileage': v.mileage
        } for v in vehicles]
    elif report_type == 'trips':
        trips = Trip.query.all()
        data = [{
            'Vehicle': t.vehicle,
            'Driver': t.driver,
            'Start': t.start_location,
            'End': t.end_location,
            'Distance': t.distance,
            'Date': t.date
        } for t in trips]
    else:
        return jsonify({'error': 'Invalid report type'}), 400
    
    if format_type == 'csv':
        output = StringIO()
        if data:
            writer = csv.DictWriter(output, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        
        response = make_response(output.getvalue())
        response.headers["Content-Disposition"] = f"attachment; filename={report_type}.csv"
        response.headers["Content-type"] = "text/csv"
        return response
    
    return jsonify({'error': 'Format not supported'}), 400

if __name__ == "__main__":
    app.run(debug=True, port=5000)