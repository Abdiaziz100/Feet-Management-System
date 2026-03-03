# Fleet Management System

A complete fleet management system built with React frontend and Flask backend.

## Features

- **Dashboard**: Overview of fleet statistics
- **Vehicle Management**: Add and track vehicles
- **Driver Management**: Manage driver information
- **Trip Tracking**: Record and monitor trips
- **Fuel Management**: Track fuel costs
- **Maintenance**: Schedule and track maintenance
- **Reports**: Generate various fleet reports

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Run the Flask server:
```bash
python app.py
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Default Login

- **Username**: admin
- **Password**: password

## Project Structure

```
fleet-management-system/
├── backend/
│   ├── app.py              # Flask application
│   ├── models.py           # Database models
│   ├── requirements.txt    # Python dependencies
│   └── database.db         # SQLite database (auto-created)
└── frontend/
    ├── src/
    │   ├── pages/          # React pages
    │   ├── components/     # Reusable components
    │   ├── styles/         # CSS styles
    │   ├── api.js          # API configuration
    │   └── App.jsx         # Main app component
    └── package.json        # Node.js dependencies
```

## API Endpoints

- `POST /login` - User authentication
- `GET /stats` - Dashboard statistics
- `GET|POST /vehicles` - Vehicle management
- `GET|POST /drivers` - Driver management
- `GET|POST /trips` - Trip management
- `GET|POST /fuel` - Fuel management
- `GET|POST /maintenance` - Maintenance management

## Technologies Used

### Backend
- Flask (Python web framework)
- SQLAlchemy (Database ORM)
- SQLite (Database)
- Flask-CORS (Cross-origin requests)

### Frontend
- React (UI framework)
- React Router (Navigation)
- Axios (HTTP client)
- CSS3 (Styling)

## Development Notes

- The system uses SQLite for simplicity - perfect for development and small deployments
- All data is stored locally in `backend/database.db`
- The frontend uses modern React hooks and functional components
- Responsive design works on desktop and mobile devices