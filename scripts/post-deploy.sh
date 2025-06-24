#!/bin/bash

echo "🚀 Running post-deployment setup for XCEO..."
echo ""

# Check if we're in production
if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️  Warning: NODE_ENV is not set to 'production'"
    echo "   Current value: $NODE_ENV"
    echo ""
fi

# Check if database URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL is not set"
    echo "   Please ensure your database is properly configured"
    exit 1
fi

echo "✅ Database URL is configured"

# Check if Anthropic API key is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  Warning: ANTHROPIC_API_KEY is not set"
    echo "   AI features will not work without this key"
    echo ""
fi

# Run database migrations
echo ""
echo "📊 Running database migrations..."
npm run db:push

if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ Database migrations failed"
    exit 1
fi

# Create admin user
echo ""
echo "👤 Creating admin user..."
npm run db:create-admin

echo ""
echo "🎉 Post-deployment setup completed!"
echo ""
echo "📝 Default admin credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "⚠️  IMPORTANT: Change the admin password after first login!"
echo ""
echo "🌐 Your app should now be accessible at your Render URL"
echo "   Health check: https://your-app.onrender.com/api/health"