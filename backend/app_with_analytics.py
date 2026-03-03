from flask import Flask, request, jsonify, session
from flask_cors import CORS
from models import db, Vehicle, Driver, Trip, Fuel, Maintenance, User
from analytics import create_analytics_routes
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import os
from datetime import datetime

app = Flask(__name__)
CORS(app, supports_credentials=True)

app.config['SECRET_KEY'] = os.urandom(24)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Create tables
with app.app_context():
    db.create_all()
    
    # Create default admin user if not exists
    if not User.query.filter_by(username='admin').first():
        admin = User(
            username='admin',
            password=generate_password_hash('password'),
            email='admin@fleetke.com'
        )
        db.session.add(admin)
        db.session.commit()

# Add analytics routes
create_analytics_routes(app)

# ---------- Auth Middleware ----------
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify(error="Authentication required"), 401
        return f(*args, **kwargs)
    return decorated_function

# ---------- ROOT ----------
@app.route("/")
def home():
    return jsonify(message="Fleet Management API with Analytics is running")

# ---------- AUTH ----------
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "")
    
    user = User.query.filter_by(username=username).first()
    
    if user and check_password_hash(user.password, password):
        session['user_id'] = user.id
        session['username'] = user.username
        return jsonify(
            success=True,
            user={
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        )
    
    return jsonify(success=False, error="Invalid credentials"), 401

@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify(message="Logged out successfully")

@app.route("/check-auth", methods=["GET"])
def check_auth():
    if 'user_id' in session:
        return jsonify(
            authenticated=True,
            user={
                'id': session.get('user_id'),
                'username': session.get('username')
            }
        )
    return jsonify(authenticated=False)

# ---------- DASHBOARD ----------
@app.route("/stats")
def stats():
    total_vehicles = Vehicle.query.count()
    active_vehicles = Vehicle.query.filter_by(status="active").count()
    active_drivers = Driver.query.filter_by(active=True).count()
    today_trips = Trip.query.count()
    fuel_cost = sum(f.cost for f in Fuel.query.all())
    pending_maintenance = Maintenance.query.filter_by(status="pending").count()
    in_progress_maintenance = Maintenance.query.filter_by(status="in-progress").count()
    
    # Calculate additional stats
    trips = Trip.query.all()
    total_distance = sum(t.distance or 0 for t in trips)
    
    return jsonify(
        totalVehicles=total_vehicles,
        activeVehicles=active_vehicles,
        activeDrivers=active_drivers,
        todayTrips=today_trips,
        fuelCost=fuel_cost,
        maintenance=pending_maintenance,
        inProgressMaintenance=in_progress_maintenance,
        totalDistance=total_distance
    )

# ---------- VEHICLES ----------
@app.route("/vehicles", methods=["GET", "POST"])
def vehicles():
    if request.method == "POST":
        data = request.json
        
        # Validation
        plate = data.get("plate", "").strip().upper()
        if not plate:
            return jsonify(error="Plate number is required"), 400
        
        # Check for duplicate plate
        if Vehicle.query.filter_by(plate=plate).first():
            return jsonify(error="Vehicle with this plate already exists"), 400
        
        vehicle = Vehicle(
            plate=plate,
            status=data.get("status", "active"),
            driver_name=data.get("driver_name") or None
        )
        db.session.add(vehicle)
        db.session.commit()
        
        return jsonify(
            message="Vehicle added successfully",
            vehicle={"id": vehicle.id, "plate": vehicle.plate, "status": vehicle.status}
        ), 201

    vehicles_list = Vehicle.query.all()
    return jsonify([
        {
            "id": v.id, 
            "plate": v.plate, 
            "status": v.status, 
            "driver_name": v.driver_name or "Unassigned"
        }
        for v in vehicles_list
    ])

# ---------- DRIVERS ----------
@app.route("/drivers", methods=["GET", "POST"])
def drivers():
    if request.method == "POST":
        data = request.json
        
        # Validation
        name = data.get("name", "").strip()
        phone = data.get("phone", "").strip()
        license_number = data.get("license_number", "").strip()
        
        if not name:
            return jsonify(error="Driver name is required"), 400
        
        driver = Driver(
            name=name,
            phone=phone,
            license_number=license_number,
            active=data.get("active", True),
            assigned_vehicle=data.get("assigned_vehicle") or None,
            current_location=data.get("current_location") or None
        )
        db.session.add(driver)
        db.session.commit()
        
        return jsonify(
            message="Driver registered successfully",
            driver={
                "id": driver.id,
                "name": driver.name,
                "phone": driver.phone,
                "license_number": driver.license_number
            }
        ), 201

    drivers_list = Driver.query.all()
    return jsonify([
        {
            "id": d.id, 
            "name": d.name, 
            "phone": d.phone, 
            "license_number": d.license_number,
            "active": d.active, 
            "assigned_vehicle": d.assigned_vehicle or "No vehicle assigned",
            "current_location": d.current_location or "Location unknown", 
            "last_seen": d.last_seen
        }
        for d in drivers_list
    ])

# ---------- TRIPS ----------
@app.route("/trips", methods=["GET", "POST"])
def trips():
    if request.method == "POST":
        data = request.json
        
        # Validation
        vehicle = data.get("vehicle", "").strip()
        driver = data.get("driver", "").strip()
        start_location = data.get("start_location", "").strip()
        end_location = data.get("end_location", "").strip()
        
        if not all([vehicle, driver, start_location, end_location]):
            return jsonify(error="All fields are required"), 400
        
        trip = Trip(
            vehicle=vehicle,
            driver=driver,
            start_location=start_location,
            end_location=end_location,
            distance=float(data.get("distance", 0)),
            date=data.get("date", datetime.now().strftime("%Y-%m-%d")),
            status=data.get("status", "completed")
        )
        db.session.add(trip)
        db.session.commit()
        
        return jsonify(
            message="Trip recorded successfully",
            trip={"id": trip.id, "vehicle": trip.vehicle, "driver": trip.driver}
        ), 201

    trips_list = Trip.query.order_by(Trip.id.desc()).all()
    return jsonify([
        {
            "id": t.id, 
            "vehicle": t.vehicle, 
            "driver": t.driver, 
            "start_location": t.start_location, 
            "end_location": t.end_location, 
            "distance": t.distance, 
            "date": t.date, 
            "status": t.status
        }
        for t in trips_list
    ])

# ---------- FUEL ----------
@app.route("/fuel", methods=["GET", "POST"])
def fuel():
    if request.method == "POST":
        data = request.json
        
        # Validation
        vehicle = data.get("vehicle", "").strip()
        liters = data.get("liters", 0)
        cost = data.get("cost", 0)
        
        if not vehicle:
            return jsonify(error="Vehicle is required"), 400
        
        fuel_record = Fuel(
            vehicle=vehicle,
            liters=float(liters),
            cost=float(cost),
            date=data.get("date", datetime.now().strftime("%Y-%m-%d")),
            station=data.get("station", "").strip()
        )
        db.session.add(fuel_record)
        db.session.commit()
        
        return jsonify(
            message="Fuel record added successfully",
            fuel={"id": fuel_record.id, "vehicle": fuel_record.vehicle}
        ), 201

    fuel_list = Fuel.query.order_by(Fuel.id.desc()).all()
    return jsonify([
        {
            "id": f.id, 
            "vehicle": f.vehicle, 
            "liters": f.liters, 
            "cost": f.cost, 
            "station": f.station or "N/A", 
            "date": f.date
        }
        for f in fuel_list
    ])

# ---------- MAINTENANCE ----------
@app.route("/maintenance", methods=["GET", "POST"])
def maintenance():
    if request.method == "POST":
        data = request.json
        
        # Validation
        vehicle = data.get("vehicle", "").strip()
        issue = data.get("issue", "").strip()
        
        if not vehicle or not issue:
            return jsonify(error="Vehicle and issue are required"), 400
        
        maintenance_record = Maintenance(
            vehicle=vehicle,
            issue=issue,
            description=data.get("description", "").strip(),
            cost=float(data.get("cost", 0)),
            date=data.get("date", datetime.now().strftime("%Y-%m-%d")),
            status=data.get("status", "pending")
        )
        db.session.add(maintenance_record)
        db.session.commit()
        
        return jsonify(
            message="Maintenance record added successfully",
            maintenance={"id": maintenance_record.id, "vehicle": maintenance_record.vehicle}
        ), 201

    maintenance_list = Maintenance.query.order_by(Maintenance.id.desc()).all()
    return jsonify([
        {
            "id": m.id, 
            "vehicle": m.vehicle, 
            "issue": m.issue, 
            "description": m.description or "N/A", 
            "cost": m.cost, 
            "date": m.date, 
            "status": m.status
        }
        for m in maintenance_list
    ])

if __name__ == "__main__":
    app.run(debug=True, port=5002)