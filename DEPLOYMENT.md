# Deployment Guide for XCEO

This guide covers deploying XCEO to various cloud platforms.

## Table of Contents
- [Render.com (Recommended)](#rendercom-recommended)
- [Heroku](#heroku)
- [Railway](#railway)
- [DigitalOcean App Platform](#digitalocean-app-platform)
- [Self-Hosted VPS](#self-hosted-vps)

## Render.com (Recommended)

### Prerequisites
- GitHub account with forked XCEO repository
- Render.com account
- Anthropic API key

### Automatic Deployment (Using Blueprint)

1. **Deploy with Blueprint**:
   ```bash
   # The repository includes render.yaml for automatic setup
   ```
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Render will detect the `render.yaml` file
   - Click "Apply"

2. **Configure Environment Variables**:
   - `ANTHROPIC_API_KEY`: Your Anthropic API key (required)
   - All other variables are auto-configured

3. **Post-Deployment Setup**:
   ```bash
   # Use Render's shell or SSH
   npm run db:push          # Run database migrations
   npm run db:create-admin  # Create admin user
   ```

### Manual Deployment

1. **Create PostgreSQL Database**:
   - New → PostgreSQL
   - Choose "Starter" plan (free)
   - Note the Internal Database URL

2. **Create Web Service**:
   - New → Web Service
   - Connect GitHub repository
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Environment Variables**:
     - `DATABASE_URL`: Internal Database URL from step 1
     - `ANTHROPIC_API_KEY`: Your API key
     - `SESSION_SECRET`: Click "Generate"
     - `NODE_ENV`: `production`
     - `PORT`: `10000`

## Heroku

### Prerequisites
- Heroku CLI installed
- Heroku account with verified credit card (for addons)

### Deployment Steps

1. **Create Heroku App**:
   ```bash
   heroku create your-app-name
   ```

2. **Add PostgreSQL**:
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

3. **Set Environment Variables**:
   ```bash
   heroku config:set ANTHROPIC_API_KEY=your-api-key
   heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
   heroku config:set NODE_ENV=production
   ```

4. **Deploy**:
   ```bash
   git push heroku main
   ```

5. **Run Migrations**:
   ```bash
   heroku run npm run db:push
   heroku run npm run db:create-admin
   ```

## Railway

### Prerequisites
- Railway account
- GitHub account

### Deployment Steps

1. **Create New Project**:
   - Go to [Railway](https://railway.app)
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Select your forked repository

2. **Add PostgreSQL**:
   - Click "New"
   - Select "Database"
   - Choose "PostgreSQL"

3. **Configure Environment Variables**:
   - Click on your service
   - Go to "Variables" tab
   - Add:
     - `ANTHROPIC_API_KEY`
     - `SESSION_SECRET` (use generated value)
     - `PORT` = `${{PORT}}` (Railway's dynamic port)

4. **Deploy**:
   - Railway automatically deploys on push
   - Run migrations via Railway's console

## DigitalOcean App Platform

### Prerequisites
- DigitalOcean account
- GitHub account

### Deployment Steps

1. **Create App**:
   - Go to App Platform
   - Click "Create App"
   - Choose GitHub repository
   - Select branch

2. **Configure App**:
   - **Build Command**: `npm install && npm run build`
   - **Run Command**: `npm run start`
   - **HTTP Port**: `10000`

3. **Add Database**:
   - Add Component → Database
   - Choose "Dev Database" (PostgreSQL)

4. **Environment Variables**:
   - Go to Settings → App-Level Environment Variables
   - Add:
     - `ANTHROPIC_API_KEY`
     - `SESSION_SECRET`
     - `DATABASE_URL` (auto-set by DO)

5. **Deploy & Initialize**:
   - Click "Deploy"
   - Use console to run migrations

## Self-Hosted VPS

### Prerequisites
- VPS with Ubuntu 20.04+
- Domain name (optional)
- SSL certificate (optional)

### Installation Steps

1. **Install Dependencies**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install PostgreSQL
   sudo apt install -y postgresql postgresql-contrib
   
   # Install PM2 (process manager)
   sudo npm install -g pm2
   ```

2. **Setup PostgreSQL**:
   ```bash
   # Switch to postgres user
   sudo -u postgres psql
   
   # Create database and user
   CREATE DATABASE xceo;
   CREATE USER xceouser WITH ENCRYPTED PASSWORD 'your-password';
   GRANT ALL PRIVILEGES ON DATABASE xceo TO xceouser;
   \q
   ```

3. **Clone and Setup App**:
   ```bash
   # Clone repository
   git clone https://github.com/your-username/xceo.git
   cd xceo
   
   # Install dependencies
   npm install
   
   # Create .env file
   cp .env.production.example .env
   # Edit .env with your values
   
   # Build application
   npm run build
   
   # Run migrations
   npm run db:push
   npm run db:create-admin
   ```

4. **Setup PM2**:
   ```bash
   # Create ecosystem file
   pm2 init
   
   # Edit ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'xceo',
       script: 'dist/index.js',
       instances: 1,
       autorestart: true,
       watch: false,
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       }
     }]
   };
   
   # Start application
   pm2 start ecosystem.config.js
   
   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

5. **Setup Nginx (Optional)**:
   ```bash
   # Install Nginx
   sudo apt install -y nginx
   
   # Create site configuration
   sudo nano /etc/nginx/sites-available/xceo
   ```
   
   Add:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
       
       location /ws {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```
   
   ```bash
   # Enable site
   sudo ln -s /etc/nginx/sites-available/xceo /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. **Setup SSL with Certbot (Optional)**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## Post-Deployment Checklist

- [ ] Database migrations completed (`npm run db:push`)
- [ ] Admin user created (`npm run db:create-admin`)
- [ ] Environment variables configured
- [ ] Health check endpoint responding (`/api/health`)
- [ ] WebSocket connections working
- [ ] SSL certificate installed (production)
- [ ] Monitoring/logging configured
- [ ] Backup strategy implemented

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` format: `postgresql://user:password@host:5432/database`
- Check if database is accessible from app
- Ensure SSL mode matches database requirements

### WebSocket Connection Issues
- Verify WebSocket proxy configuration
- Check if firewall allows WebSocket connections
- Ensure correct protocol (ws:// vs wss://)

### Build Failures
- Check Node.js version (requires 18+)
- Clear cache and node_modules
- Verify all environment variables are set

### Performance Issues
- Enable Node.js clustering
- Configure proper caching headers
- Use CDN for static assets
- Implement database connection pooling

## Monitoring

### Recommended Services
- **Uptime**: UptimeRobot, Pingdom
- **Errors**: Sentry, LogRocket
- **Analytics**: Google Analytics, Plausible
- **Performance**: New Relic, DataDog

### Health Check Endpoint
The app includes `/api/health` endpoint for monitoring:
```json
{
  "status": "healthy",
  "timestamp": "2025-06-24T10:00:00Z",
  "uptime": 12345,
  "environment": "production"
}
```

## Security Recommendations

1. **Environment Variables**:
   - Never commit `.env` files
   - Use strong, unique passwords
   - Rotate secrets regularly

2. **Database**:
   - Enable SSL connections
   - Use connection pooling
   - Regular backups

3. **Application**:
   - Keep dependencies updated
   - Enable CORS properly
   - Use HTTPS in production
   - Implement rate limiting

4. **Monitoring**:
   - Set up alerts for errors
   - Monitor resource usage
   - Track failed login attempts