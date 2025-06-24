#!/bin/bash

echo "🚀 Starting XCEO Application..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env file and add your:"
    echo "   - DATABASE_URL (default: postgresql://user@localhost:5432/xceo)"
    echo "   - ANTHROPIC_API_KEY (required for AI features)"
    echo ""
    read -p "Press Enter after updating .env file to continue..."
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if database needs setup
echo "🗄️  Checking database..."
npm run db:push 2>&1 | grep -q "Changes applied" && echo "✅ Database schema is up to date"

# Check if admin user exists
echo "👤 Checking admin user..."
if ! npm run db:create-admin 2>/dev/null | grep -q "already exists"; then
    echo "✅ Admin user created (username: admin, password: admin123)"
else
    echo "✅ Admin user already exists"
fi

# Kill any existing processes on ports
echo "🔄 Cleaning up old processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Start servers
echo ""
echo "🚀 Starting servers..."
echo "   Backend: http://localhost:3000"
echo "   Frontend: http://localhost:5173"
echo ""
echo "📝 Login with: username 'admin', password 'admin123'"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Start backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
npx vite &
FRONTEND_PID=$!

# Function to handle cleanup
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set up cleanup on Ctrl+C
trap cleanup INT

# Wait for processes
wait