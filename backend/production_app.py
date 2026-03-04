import os
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from models import db, Vehicle, Driver, Trip, Fuel, Maintenance, User
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime

app = Flask(__name__)

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
    return jsonify(message="Fleet Management API is running")

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

@app.route("/change-password", methods=["POST"])
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

@app.route("/vehicles/<int:vehicle_id>", methods=["PUT"])
def update_vehicle(vehicle_id):
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify(error="Vehicle not found"), 404
    
    data = request.json
    
    if 'plate' in data:
        new_plate = data['plate'].strip().upper()
        # Check for duplicate
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

@app.route("/vehicles/<int:vehicle_id>", methods=["DELETE"])
def delete_vehicle(vehicle_id):
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify(error="Vehicle not found"), 404
    
    # Clear assignments
    if vehicle.driver_name:
        driver = Driver.query.filter_by(name=vehicle.driver_name).first()
        if driver:
            driver.assigned_vehicle = None
    
    db.session.delete(vehicle)
    db.session.commit()
    
    return jsonify(message="Vehicle deleted successfully")

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

@app.route("/drivers/<int:driver_id>", methods=["PUT"])
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

@app.route("/drivers/<int:driver_id>", methods=["DELETE"])
def delete_driver(driver_id):
    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify(error="Driver not found"), 404
    
    # Clear vehicle assignment
    if driver.assigned_vehicle:
        vehicle = Vehicle.query.filter_by(plate=driver.assigned_vehicle).first()
        if vehicle:
            vehicle.driver_name = None
    
    db.session.delete(driver)
    db.session.commit()
    
    return jsonify(message="Driver deleted successfully")

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

@app.route("/trips/<int:trip_id>", methods=["PUT"])
def update_trip(trip_id):
    trip = Trip.query.get(trip_id)
    if not trip:
        return jsonify(error="Trip not found"), 404
    
    data = request.json
    
    if 'vehicle' in data:
        trip.vehicle = data['vehicle'].strip()
    if 'driver' in data:
        trip.driver = data['driver'].strip()
    if 'start_location' in data:
        trip.start_location = data['start_location'].strip()
    if 'end_location' in data:
        trip.end_location = data['end_location'].strip()
    if 'distance' in data:
        trip.distance = float(data['distance'])
    if 'date' in data:
        trip.date = data['date']
    if 'status' in data:
        trip.status = data['status']
    
    db.session.commit()
    return jsonify(message="Trip updated successfully")

@app.route("/trips/<int:trip_id>", methods=["DELETE"])
def delete_trip(trip_id):
    trip = Trip.query.get(trip_id)
    if not trip:
        return jsonify(error="Trip not found"), 404
    
    db.session.delete(trip)
    db.session.commit()
    
    return jsonify(message="Trip deleted successfully")

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

@app.route("/fuel/<int:fuel_id>", methods=["PUT"])
def update_fuel(fuel_id):
    fuel_record = Fuel.query.get(fuel_id)
    if not fuel_record:
        return jsonify(error="Fuel record not found"), 404
    
    data = request.json
    
    if 'vehicle' in data:
        fuel_record.vehicle = data['vehicle'].strip()
    if 'liters' in data:
        fuel_record.liters = float(data['liters'])
    if 'cost' in data:
        fuel_record.cost = float(data['cost'])
    if 'station' in data:
        fuel_record.station = data['station'].strip()
    if 'date' in data:
        fuel_record.date = data['date']
    
    db.session.commit()
    return jsonify(message="Fuel record updated successfully")

@app.route("/fuel/<int:fuel_id>", methods=["DELETE"])
def delete_fuel(fuel_id):
    fuel_record = Fuel.query.get(fuel_id)
    if not fuel_record:
        return jsonify(error="Fuel record not found"), 404
    
    db.session.delete(fuel_record)
    db.session.commit()
    
    return jsonify(message="Fuel record deleted successfully")

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

@app.route("/maintenance/<int:maintenance_id>", methods=["PUT"])
def update_maintenance(maintenance_id):
    maintenance_record = Maintenance.query.get(maintenance_id)
    if not maintenance_record:
        return jsonify(error="Maintenance record not found"), 404
    
    data = request.json
    
    if 'vehicle' in data:
        maintenance_record.vehicle = data['vehicle'].strip()
    if 'issue' in data:
        maintenance_record.issue = data['issue'].strip()
    if 'description' in data:
        maintenance_record.description = data['description'].strip()
    if 'cost' in data:
        maintenance_record.cost = float(data['cost'])
    if 'date' in data:
        maintenance_record.date = data['date']
    if 'status' in data:
        maintenance_record.status = data['status']
    
    db.session.commit()
    return jsonify(message="Maintenance record updated successfully")

@app.route("/maintenance/<int:maintenance_id>", methods=["DELETE"])
def delete_maintenance(maintenance_id):
    maintenance_record = Maintenance.query.get(maintenance_id)
    if not maintenance_record:
        return jsonify(error="Maintenance record not found"), 404
    
    db.session.delete(maintenance_record)
    db.session.commit()
    
    return jsonify(message="Maintenance record deleted successfully")

# ---------- ASSIGNMENTS ----------
@app.route("/assign", methods=["POST"])
def assign_driver_to_vehicle():
    data = request.json
    driver_id = data.get("driver_id")
    vehicle_plate = data.get("vehicle_plate")
    
    if not driver_id or not vehicle_plate:
        return jsonify(error="Driver ID and vehicle plate are required"), 400
    
    # Get driver and vehicle
    driver = Driver.query.get(driver_id)
    vehicle = Vehicle.query.filter_by(plate=vehicle_plate).first()
    
    if not driver:
        return jsonify(error="Driver not found"), 404
    if not vehicle:
        return jsonify(error="Vehicle not found"), 404
    
    # Clear previous assignments
    old_vehicle = Vehicle.query.filter_by(driver_name=driver.name).first()
    if old_vehicle:
        old_vehicle.driver_name = None
    
    old_driver = Driver.query.filter_by(assigned_vehicle=vehicle_plate).first()
    if old_driver:
        old_driver.assigned_vehicle = None
    
    # Make new assignment
    driver.assigned_vehicle = vehicle_plate
    vehicle.driver_name = driver.name
    
    db.session.commit()
    
    return jsonify(message=f"{driver.name} assigned to vehicle {vehicle_plate}")

@app.route("/assignments", methods=["GET"])
def get_assignments():
    """Get all current driver-vehicle assignments"""
    vehicles = Vehicle.query.filter(Vehicle.driver_name != None).all()
    return jsonify([
        {
            "id": v.id,
            "vehicle_plate": v.plate,
            "driver_name": v.driver_name,
            "status": v.status
        }
        for v in vehicles
    ])

@app.route("/unassign", methods=["POST"])
def unassign_driver():
    """Remove driver from vehicle"""
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
@app.route("/update-location", methods=["POST"])
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

@app.route("/driver-location/<int:driver_id>")
def get_driver_location(driver_id):
    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify(error="Driver not found"), 404
    
    return jsonify({
        "id": driver.id,
        "name": driver.name,
        "vehicle": driver.assigned_vehicle,
        "location": driver.current_location or "Unknown",
        "last_seen": driver.last_seen
    })

# ---------- ALERTS ----------
@app.route("/send-alert", methods=["POST"])
def send_alert():
    data = request.json
    driver_id = data.get("driver_id")
    message = data.get("message")
    
    if not driver_id or not message:
        return jsonify(error="Driver ID and message are required"), 400
    
    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify(error="Driver not found"), 404
    
    # In a real system, this would send SMS/push notification
    print(f"ALERT to {driver.name} ({driver.phone}): {message}")
    
    return jsonify(
        message=f"Alert sent to {driver.name}",
        alert={
            'driver_name': driver.name,
            'phone': driver.phone,
            'message': message,
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    )

# ---------- REPORTS ----------
@app.route("/reports/summary")
def reports_summary():
    """Get comprehensive fleet reports"""
    vehicles = Vehicle.query.all()
    drivers = Driver.query.all()
    trips = Trip.query.all()
    fuel = Fuel.query.all()
    maintenance = Maintenance.query.all()
    
    total_distance = sum(t.distance or 0 for t in trips)
    total_fuel_cost = sum(f.cost or 0 for f in fuel)
    total_maintenance_cost = sum(m.cost or 0 for m in maintenance)
    
    return jsonify(
        fleet={
            "total_vehicles": len(vehicles),
            "active_vehicles": len([v for v in vehicles if v.status == "active"]),
            "maintenance_vehicles": len([v for v in vehicles if v.status == "maintenance"]),
            "inactive_vehicles": len([v for v in vehicles if v.status == "inactive"])
        },
        drivers={
            "total_drivers": len(drivers),
            "active_drivers": len([d for d in drivers if d.active]),
            "assigned_drivers": len([d for d in drivers if d.assigned_vehicle]),
            "unassigned_drivers": len([d for d in drivers if not d.assigned_vehicle])
        },
        trips={
            "total_trips": len(trips),
            "total_distance": total_distance,
            "avg_distance": total_distance / len(trips) if trips else 0
        },
        costs={
            "total_fuel_cost": total_fuel_cost,
            "total_maintenance_cost": total_maintenance_cost,
            "total_operational_cost": total_fuel_cost + total_maintenance_cost
        },
        maintenance={
            "pending": len([m for m in maintenance if m.status == "pending"]),
            "in_progress": len([m for m in maintenance if m.status == "in-progress"]),
            "completed": len([m for m in maintenance if m.status == "completed"])
        }
    )

@app.route("/reports/export/<data_type>")
def export_data(data_type):
    """Export data as CSV"""
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
@app.route("/search")
def search():
    """Search across all entities"""
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify(results=[])
    
    results = {
        "vehicles": [],
        "drivers": [],
        "trips": []
    }
    
    # Search vehicles
    vehicles = Vehicle.query.filter(
        (Vehicle.plate.contains(query)) | 
        (Vehicle.driver_name.contains(query))
    ).all()
    results["vehicles"] = [{"id": v.id, "plate": v.plate, "status": v.status} for v in vehicles]
    
    # Search drivers
    drivers = Driver.query.filter(
        (Driver.name.contains(query)) | 
        (Driver.phone.contains(query))
    ).all()
    results["drivers"] = [{"id": d.id, "name": d.name, "phone": d.phone} for d in drivers]
    
    # Search trips
    trips = Trip.query.filter(
        (Trip.vehicle.contains(query)) | 
        (Trip.driver.contains(query)) |
        (Trip.start_location.contains(query)) |
        (Trip.end_location.contains(query))
    ).all()
    results["trips"] = [{"id": t.id, "vehicle": t.vehicle, "driver": t.driver} for t in trips]
    
    return jsonify(results=results)

if __name__ == "__main__":
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5002)))

