#!/bin/bash
# RoundWise MVP Setup Script

echo "Setting up RoundWise MVP..."

# Backend setup
echo ""
echo "=== Backend Setup ==="
cd backend

if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env and add your OPENROUTER_API_KEY"
fi

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Backend setup complete!"

# Frontend setup
echo ""
echo "=== Frontend Setup ==="
cd ../frontend

if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
fi

echo "Installing npm dependencies..."
npm install

echo "Frontend setup complete!"

# Summary
echo ""
echo "=== Setup Complete ==="
echo ""
echo "To start the application:"
echo ""
echo "1. Terminal 1 (Backend):"
echo "   cd backend"
echo "   python -m backend.main"
echo ""
echo "2. Terminal 2 (Frontend):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "Frontend will open at http://localhost:5173"
echo "Backend API at http://localhost:8000"
