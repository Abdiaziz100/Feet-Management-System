
#!/bin/bash
set -e

# Install frontend dependencies
cd frontend
npm install
npm run build

# Go back to root
cd ..

# The built files will be served by Flask from frontend/dist/


