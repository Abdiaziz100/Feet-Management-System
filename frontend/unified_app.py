

import os
import sys

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from models import db, Vehicle, Driver, Trip, Fuel, Maintenance, User
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime

app = Flask(__name__, static_folder='dist', static_url_path='')

# Configuration for production
CORS_ORIGIN = os.environ.get('CORS_ORIGIN', '*')
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///database.db')

# Configure CORS for production
CORS(app, 
     supports_credentials=True,
     origins=[CORS_ORIGIN] if CORS_ORIGIN != '*' else '*')

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', os.urandom(24))
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
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
    return send_from_directory(app.static_folder, 'index.html')

# ---------- AUTH ----------
@app.route("/api/login", methods=["POST"])
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

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify(message="Logged out successfully")

@app.route("/api/check-auth", methods=["GET"])
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

@app.route("/api/change-password", methods=["POST"])
@login_required
def change_password():
    data = request.json
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")
    
    user = User.query.get(session['user_id'])
    
    if not check_password_hash(user.password, current_password):
        return jsonify(error="Current password is incorrect"), 400
    
    user.password = generate_password_hash(new_password)
    db.session.commit()
    
    return jsonify(message="Password changed successfully")

# ---------- DASHBOARD ----------
@app.route("/api/stats")
def stats():
    total_vehicles = Vehicle.query.count()
    active_vehicles = Vehicle.query.filter_by(status="active").count()
    active_drivers = Driver.query.filter_by(active=True).count()
    today_trips = Trip.query.count()
    fuel_cost = sum(f.cost for f in Fuel.query.all())
    pending_maintenance = Maintenance.query.filter_by(status="pending").count()
    in_progress_maintenance = Maintenance.query.filter_by(status="in-progress").count()
    
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
@app.route("/api/vehicles", methods=["GET", "POST"])
def vehicles():
    if request.method == "POST":
        data = request.json
        plate = data.get("plate", "").strip().upper()
        if not plate:
            return jsonify(error="Plate number is required"), 400
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
        {"id": v.id, "plate": v.plate, "status": v.status, "driver_name": v.driver_name or "Unassigned"}
        for v in vehicles_list
    ])

@app.route("/api/vehicles/<int:vehicle_id>", methods=["PUT"])
def update_vehicle(vehicle_id):
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify(error="Vehicle not found"), 404
    
    data = request.json
    if 'plate' in data:
        new_plate = data['plate'].strip().upper()
        existing = Vehicle.query.filter_by(plate=new_plate).first()
        if existing and existing.id != vehicle_id:
            return jsonify(error="Vehicle with this plate already exists"), 400
        vehicle.plate = new_plate
    if 'status' in data:
        vehicle.status = data['status']
    if 'driver_name' in data:
        vehicle.driver_name = data['driver_name'] or None
    
    db.session.commit()
    return jsonify(message="Vehicle updated successfully")

@app.route("/api/vehicles/<int:vehicle_id>", methods=["DELETE"])
def delete_vehicle(vehicle_id):
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify(error="Vehicle not found"), 404
    
    if vehicle.driver_name:
        driver = Driver.query.filter_by(name=vehicle.driver_name).first()
        if driver:
            driver.assigned_vehicle = None
    
    db.session.delete(vehicle)
    db.session.commit()
    return jsonify(message="Vehicle deleted successfully")

# ---------- DRIVERS ----------
@app.route("/api/drivers", methods=["GET", "POST"])
def drivers():
    if request.method == "POST":
        data = request.json
        name = data.get("name", "").strip()
        if not name:
            return jsonify(error="Driver name is required"), 400
        
        driver = Driver(
            name=name,
            phone=data.get("phone", "").strip(),
            license_number=data.get("license_number", "").strip(),
            active=data.get("active", True),
            assigned_vehicle=data.get("assigned_vehicle") or None,
            current_location=data.get("current_location") or None
        )
        db.session.add(driver)
        db.session.commit()
        
        return jsonify(
            message="Driver registered successfully",
            driver={"id": driver.id, "name": driver.name, "phone": driver.phone, "license_number": driver.license_number}
        ), 201

    drivers_list = Driver.query.all()
    return jsonify([
        {"id": d.id, "name": d.name, "phone": d.phone, "license_number": d.license_number,
         "active": d.active, "assigned_vehicle": d.assigned_vehicle or "No vehicle assigned",
         "current_location": d.current_location or "Location unknown", "last_seen": d.last_seen}
        for d in drivers_list
    ])

@app.route("/api/drivers/<int:driver_id>", methods=["PUT"])
def update_driver(driver_id):
    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify(error="Driver not found"), 404
    
    data = request.json
    if 'name' in data:
        driver.name = data['name'].strip()
    if 'phone' in data:
        driver.phone = data['phone'].strip()
    if 'license_number' in data:
        driver.license_number = data['license_number'].strip()
    if 'active' in data:
        driver.active = data['active']
    if 'assigned_vehicle' in data:
        driver.assigned_vehicle = data['assigned_vehicle'] or None
    if 'current_location' in data:
        driver.current_location = data['current_location']
    
    db.session.commit()
    return jsonify(message="Driver updated successfully")

@app.route("/api/drivers/<int:driver_id>", methods=["DELETE"])
def delete_driver(driver_id):
    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify(error="Driver not found"), 404
    
    if driver.assigned_vehicle:
        vehicle = Vehicle.query.filter_by(plate=driver.assigned_vehicle).first()
        if vehicle:
            vehicle.driver_name = None
    
    db.session.delete(driver)
    db.session.commit()
    return jsonify(message="Driver deleted successfully")

# ---------- TRIPS ----------
@app.route("/api/trips", methods=["GET", "POST"])
def trips():
    if request.method == "POST":
        data = request.json
        vehicle = data.get("vehicle", "").strip()
        driver = data.get("driver", "").strip()
        start_location = data.get("start_location", "").strip()
        end_location = data.get("end_location", "").strip()
        
        if not all([vehicle, driver, start_location, end_location]):
            return jsonify(error="All fields are required"), 400
        
        trip = Trip(
            vehicle=vehicle, driver=driver, start_location=start_location,
            end_location=end_location, distance=float(data.get("distance", 0)),
            date=data.get("date", datetime.now().strftime("%Y-%m-%d")),
            status=data.get("status", "completed")
        )
        db.session.add(trip)
        db.session.commit()
        return jsonify(message="Trip recorded successfully", trip={"id": trip.id, "vehicle": trip.vehicle, "driver": trip.driver}), 201

    trips_list = Trip.query.order_by(Trip.id.desc()).all()
    return jsonify([
        {"id": t.id, "vehicle": t.vehicle, "driver": t.driver, "start_location": t.start_location,
         "end_location": t.end_location, "distance": t.distance, "date": t.date, "status": t.status}
        for t in trips_list
    ])

@app.route("/api/trips/<int:trip_id>", methods=["PUT"])
def update_trip(trip_id):
    trip = Trip.query.get(trip_id)
    if not trip:
        return jsonify(error="Trip not found"), 404
    data = request.json
    for key in ['vehicle', 'driver', 'start_location', 'end_location']:
        if key in data:
            setattr(trip, key, data[key].strip())
    if 'distance' in data:
        trip.distance = float(data['distance'])
    if 'date' in data:
        trip.date = data['date']
    if 'status' in data:
        trip.status = data['status']
    db.session.commit()
    return jsonify(message="Trip updated successfully")

@app.route("/api/trips/<int:trip_id>", methods=["DELETE"])
def delete_trip(trip_id):
    trip = Trip.query.get(trip_id)
    if not trip:
        return jsonify(error="Trip not found"), 404
    db.session.delete(trip)
    db.session.commit()
    return jsonify(message="Trip deleted successfully")

# ---------- FUEL ----------
@app.route("/api/fuel", methods=["GET", "POST"])
def fuel():
    if request.method == "POST":
        data = request.json
        vehicle = data.get("vehicle", "").strip()
        if not vehicle:
            return jsonify(error="Vehicle is required"), 400
        
        fuel_record = Fuel(
            vehicle=vehicle, liters=float(data.get("liters", 0)), cost=float(data.get("cost", 0)),
            date=data.get("date", datetime.now().strftime("%Y-%m-%d")),
            station=data.get("station", "").strip()
        )
        db.session.add(fuel_record)
        db.session.commit()
        return jsonify(message="Fuel record added successfully", fuel={"id": fuel_record.id, "vehicle": fuel_record.vehicle}), 201

    fuel_list = Fuel.query.order_by(Fuel.id.desc()).all()
    return jsonify([
        {"id": f.id, "vehicle": f.vehicle, "liters": f.liters, "cost": f.cost,
         "station": f.station or "N/A", "date": f.date}
        for f in fuel_list
    ])

@app.route("/api/fuel/<int:fuel_id>", methods=["PUT"])
def update_fuel(fuel_id):
    fuel_record = Fuel.query.get(fuel_id)
    if not fuel_record:
        return jsonify(error="Fuel record not found"), 404
    data = request.json
    for key in ['vehicle', 'liters', 'cost', 'station', 'date']:
        if key in data:
            setattr(fuel_record, key, float(data[key]) if key in ['liters', 'cost'] else data[key].strip())
    db.session.commit()
    return jsonify(message="Fuel record updated successfully")

@app.route("/api/fuel/<int:fuel_id>", methods=["DELETE"])
def delete_fuel(fuel_id):
    fuel_record = Fuel.query.get(fuel_id)
    if not fuel_record:
        return jsonify(error="Fuel record not found"), 404
    db.session.delete(fuel_record)
    db.session.commit()
    return jsonify(message="Fuel record deleted successfully")

# ---------- MAINTENANCE ----------
@app.route("/api/maintenance", methods=["GET", "POST"])
def maintenance():
    if request.method == "POST":
        data = request.json
        vehicle = data.get("vehicle", "").strip()
        issue = data.get("issue", "").strip()
        if not vehicle or not issue:
            return jsonify(error="Vehicle and issue are required"), 400
        
        maintenance_record = Maintenance(
            vehicle=vehicle, issue=issue, description=data.get("description", "").strip(),
            cost=float(data.get("cost", 0)), date=data.get("date", datetime.now().strftime("%Y-%m-%d")),
            status=data.get("status", "pending")
        )
        db.session.add(maintenance_record)
        db.session.commit()
        return jsonify(message="Maintenance record added successfully", maintenance={"id": maintenance_record.id, "vehicle": maintenance_record.vehicle}), 201

    maintenance_list = Maintenance.query.order_by(Maintenance.id.desc()).all()
    return jsonify([
        {"id": m.id, "vehicle": m.vehicle, "issue": m.issue, "description": m.description or "N/A",
         "cost": m.cost, "date": m.date, "status": m.status}
        for m in maintenance_list
    ])

@app.route("/api/maintenance/<int:maintenance_id>", methods=["PUT"])
def update_maintenance(maintenance_id):
    maintenance_record = Maintenance.query.get(maintenance_id)
    if not maintenance_record:
        return jsonify(error="Maintenance record not found"), 404
    data = request.json
    for key in ['vehicle', 'issue', 'description', 'cost', 'date', 'status']:
        if key in data:
            setattr(maintenance_record, key, float(data[key]) if key == 'cost' else data[key].strip() if key in ['vehicle', 'issue', 'description'] else data[key])
    db.session.commit()
    return jsonify(message="Maintenance record updated successfully")

@app.route("/api/maintenance/<int:maintenance_id>", methods=["DELETE"])
def delete_maintenance(maintenance_id):
    maintenance_record = Maintenance.query.get(maintenance_id)
    if not maintenance_record:
        return jsonify(error="Maintenance record not found"), 404
    db.session.delete(maintenance_record)
    db.session.commit()
    return jsonify(message="Maintenance record deleted successfully")

# ---------- ASSIGNMENTS ----------
@app.route("/api/assign", methods=["POST"])
def assign_driver_to_vehicle():
    data = request.json
    driver_id = data.get("driver_id")
    vehicle_plate = data.get("vehicle_plate")
    
    if not driver_id or not vehicle_plate:
        return jsonify(error="Driver ID and vehicle plate are required"), 400
    
    driver = Driver.query.get(driver_id)
    vehicle = Vehicle.query.filter_by(plate=vehicle_plate).first()
    
    if not driver:
        return jsonify(error="Driver not found"), 404
    if not vehicle:
        return jsonify(error="Vehicle not found"), 404
    
    old_vehicle = Vehicle.query.filter_by(driver_name=driver.name).first()
    if old_vehicle:
        old_vehicle.driver_name = None
    old_driver = Driver.query.filter_by(assigned_vehicle=vehicle_plate).first()
    if old_driver:
        old_driver.assigned_vehicle = None
    
    driver.assigned_vehicle = vehicle_plate
    vehicle.driver_name = driver.name
    db.session.commit()
    return jsonify(message=f"{driver.name} assigned to vehicle {vehicle_plate}")

@app.route("/api/assignments", methods=["GET"])
def get_assignments():
    vehicles = Vehicle.query.filter(Vehicle.driver_name != None).all()
    return jsonify([
        {"id": v.id, "vehicle_plate": v.plate, "driver_name": v.driver_name, "status": v.status}
        for v in vehicles
    ])

@app.route("/api/unassign", methods=["POST"])
def unassign_driver():
    data = request.json
    vehicle_plate = data.get("vehicle_plate")
    vehicle = Vehicle.query.filter_by(plate=vehicle_plate).first()
    if not vehicle:
        return jsonify(error="Vehicle not found"), 404
    if vehicle.driver_name:
        driver = Driver.query.filter_by(name=vehicle.driver_name).first()
        if driver:
            driver.assigned_vehicle = None
    vehicle.driver_name = None
    db.session.commit()
    return jsonify(message="Driver unassigned from vehicle")

# ---------- LOCATION TRACKING ----------
@app.route("/api/update-location", methods=["POST"])
def update_driver_location():
    data = request.json
    driver_id = data.get("driver_id")
    location = data.get("location")
    if not driver_id or not location:
        return jsonify(error="Driver ID and location are required"), 400
    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify(error="Driver not found"), 404
    driver.current_location = location.strip()
    driver.last_seen = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    db.session.commit()
    return jsonify(message=f"Location updated for {driver.name}")

@app.route("/api/driver-location/<int:driver_id>")
def get_driver_location(driver_id):
    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify(error="Driver not found"), 404
    return jsonify({
        "id": driver.id, "name": driver.name, "vehicle": driver.assigned_vehicle,
        "location": driver.current_location or "Unknown", "last_seen": driver.last_seen
    })

# ---------- ALERTS ----------
@app.route("/api/send-alert", methods=["POST"])
def send_alert():
    data = request.json
    driver_id = data.get("driver_id")
    message = data.get("message")
    if not driver_id or not message:
        return jsonify(error="Driver ID and message are required"), 400
    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify(error="Driver not found"), 404
    print(f"ALERT to {driver.name} ({driver.phone}): {message}")
    return jsonify(message=f"Alert sent to {driver.name}", alert={
        'driver_name': driver.name, 'phone': driver.phone, 'message': message,
        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

# ---------- REPORTS ----------
@app.route("/api/reports/summary")
def reports_summary():
    vehicles = Vehicle.query.all()
    drivers = Driver.query.all()
    trips = Trip.query.all()
    fuel = Fuel.query.all()
    maintenance = Maintenance.query.all()
    total_distance = sum(t.distance or 0 for t in trips)
    total_fuel_cost = sum(f.cost or 0 for f in fuel)
    total_maintenance_cost = sum(m.cost or 0 for m in maintenance)
    return jsonify(
        fleet={"total_vehicles": len(vehicles), "active_vehicles": len([v for v in vehicles if v.status == "active"]),
               "maintenance_vehicles": len([v for v in vehicles if v.status == "maintenance"]),
               "inactive_vehicles": len([v for v in vehicles if v.status == "inactive"])},
        drivers={"total_drivers": len(drivers), "active_drivers": len([d for d in drivers if d.active]),
                 "assigned_drivers": len([d for d in drivers if d.assigned_vehicle]),
                 "unassigned_drivers": len([d for d in drivers if not d.assigned_vehicle])},
        trips={"total_trips": len(trips), "total_distance": total_distance,
               "avg_distance": total_distance / len(trips) if trips else 0},
        costs={"total_fuel_cost": total_fuel_cost, "total_maintenance_cost": total_maintenance_cost,
               "total_operational_cost": total_fuel_cost + total_maintenance_cost},
        maintenance={"pending": len([m for m in maintenance if m.status == "pending"]),
                    "in_progress": len([m for m in maintenance if m.status == "in-progress"]),
                    "completed": len([m for m in maintenance if m.status == "completed"])}
    )

@app.route("/api/reports/export/<data_type>")
def export_data(data_type):
    import csv
    from io import StringIO
    from flask import make_response
    
    output = StringIO()
    writer = csv.writer(output)
    
    if data_type == "trips":
        trips = Trip.query.all()
        writer.writerow(["ID", "Vehicle", "Driver", "Start", "End", "Distance", "Date", "Status"])
        for t in trips:
            writer.writerow([t.id, t.vehicle, t.driver, t.start_location, t.end_location, t.distance, t.date, t.status])
    elif data_type == "fuel":
        fuel = Fuel.query.all()
        writer.writerow(["ID", "Vehicle", "Liters", "Cost", "Station", "Date"])
        for f in fuel:
            writer.writerow([f.id, f.vehicle, f.liters, f.cost, f.station, f.date])
    elif data_type == "maintenance":
        maintenance = Maintenance.query.all()
        writer.writerow(["ID", "Vehicle", "Issue", "Description", "Cost", "Date", "Status"])
        for m in maintenance:
            writer.writerow([m.id, m.vehicle, m.issue, m.description, m.cost, m.date, m.status])
    else:
        return jsonify(error="Invalid data type"), 400
    
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = f"attachment; filename={data_type}.csv"
    response.headers["Content-type"] = "text/csv"
    return response

# ---------- SEARCH ----------
@app.route("/api/search")
def search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify(results=[])
    
    results = {"vehicles": [], "drivers": [], "trips": []}
    
    vehicles = Vehicle.query.filter(
        (Vehicle.plate.contains(query)) | (Vehicle.driver_name.contains(query))
    ).all()
    results["vehicles"] = [{"id": v.id, "plate": v.plate, "status": v.status} for v in vehicles]
    
    drivers = Driver.query.filter(
        (Driver.name.contains(query)) | (Driver.phone.contains(query))
    ).all()
    results["drivers"] = [{"id": d.id, "name": d.name, "phone": d.phone} for d in drivers]
    
    trips = Trip.query.filter(
        (Trip.vehicle.contains(query)) | (Trip.driver.contains(query)) |
        (Trip.start_location.contains(query)) | (Trip.end_location.contains(query))
    ).all()
    results["trips"] = [{"id": t.id, "vehicle": t.vehicle, "driver": t.driver} for t in trips]
    
    return jsonify(results=results)

# Serve React app for all other routes (SPA support)
@app.route('/<path:path>')
def serve_static(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == "__main__":
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5002)))
