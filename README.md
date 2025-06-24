# XCEO 🤖 Your AI-Powered Business Command Center

> **Transform your solo business into a well-oiled machine with an AI CEO that works for YOU**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13%2B-blue)](https://www.postgresql.org)

## 🎯 Who Is This For?

XCEO is perfect for:
- **Solopreneurs** drowning in tasks and decisions
- **Small business owners** who need executive-level guidance without the executive-level salary
- **Freelancers** juggling multiple clients and projects
- **Startup founders** who need to stay organized while moving fast
- **Side hustlers** trying to scale their business efficiently

## 🚀 What Makes XCEO Different?

Unlike traditional CRMs that just store data, XCEO actively helps you run your business:

### 🧠 AI-Powered Business Intelligence
- **Real-time advice** from an AI trained on business best practices
- **Smart task prioritization** based on your business goals
- **Proactive problem detection** before issues become crises
- **Data-driven insights** from your business metrics

### 📊 Complete Business Management
- **Task & Project Management** - Never lose track of what needs to be done
- **Team Collaboration** - Coordinate with contractors and partners
- **Customer Insights** - Track interactions and opportunities
- **Financial Overview** - Monitor your business health
- **Strategic Planning** - Set and track long-term objectives

### 💬 Your 24/7 Business Advisor
- Ask questions about your business strategy
- Get help making tough decisions
- Receive suggestions for growth opportunities
- Learn from AI-analyzed patterns in your data

## 🎥 See It In Action

<img width="1458" alt="XCEO Dashboard" src="https://github.com/user-attachments/assets/c8a857bb-fa14-4ce3-b033-6b4a8dca4782" />

Watch the demo video: https://github.com/user-attachments/assets/e706ebda-d96d-47e2-9424-853d0cedbc23

## ⚡ Quick Start

### Option 1: Run Locally in 5 Minutes

```bash
# Clone the repository
git clone https://github.com/kevingduck/xceo.git
cd xceo

# Run the setup script
./start.sh
```

The setup script will:
- Check for required dependencies
- Set up your database
- Create an admin account
- Start both frontend and backend servers

**Default login:** 
- Username: `admin`
- Password: `admin123`

### Option 2: Deploy on Render (Recommended for Production)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/kevingduck/xceo)

1. Click the Deploy to Render button above
2. Connect your GitHub account if prompted
3. Fill in the required environment variables:
   - `ANTHROPIC_API_KEY` - Your Anthropic API key
   - Leave other fields as default
4. Click "Create Web Service"
5. Wait for the build and deployment to complete (5-10 minutes)
6. Access your app at `https://your-app-name.onrender.com`

**Note**: The free tier spins down after 15 minutes of inactivity. Consider upgrading for always-on service.

### Option 3: Deploy on Other Platforms

**Heroku**:
- Add Heroku Postgres addon
- Set `DATABASE_URL` automatically provided
- Add `ANTHROPIC_API_KEY` to config vars
- Deploy using Heroku Git or GitHub integration

**Railway**:
- Use the PostgreSQL plugin
- Environment variables are automatically injected
- Deploy directly from GitHub

**DigitalOcean App Platform**:
- Add a managed database
- Configure environment variables in the app settings
- Deploy from GitHub repository

## 🚀 Production Deployment

### Using Render.com (Recommended)

This project includes a `render.yaml` blueprint for easy deployment:

1. **Fork this repository** to your GitHub account

2. **Sign up for Render** at [render.com](https://render.com)

3. **Create New Blueprint Instance**:
   - Go to your Render dashboard
   - Click "New +" → "Blueprint"
   - Connect your GitHub account
   - Select your forked repository
   - Click "Connect"

4. **Configure Environment Variables**:
   - `ANTHROPIC_API_KEY`: Your Anthropic API key (required)
   - Other variables are auto-configured

5. **Deploy**:
   - Review the services (Web Service + PostgreSQL)
   - Click "Apply"
   - Wait for deployment (5-10 minutes)

6. **Post-Deployment**:
   ```bash
   # SSH into your Render service or use the Shell tab
   npm run db:push          # Run migrations
   npm run db:create-admin  # Create admin user
   ```

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | Auto-set by Render |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features | Yes | - |
| `SESSION_SECRET` | Session encryption key | Yes | Auto-generated |
| `PORT` | Server port | No | 10000 |
| `NODE_ENV` | Environment mode | No | production |
| `ALLOWED_ORIGINS` | CORS allowed origins | No | Your Render URL |

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + PostgreSQL
- **AI**: Anthropic Claude API
- **Real-time**: WebSocket for live updates
- **Auth**: Session-based authentication
- **ORM**: Drizzle ORM

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Anthropic API Key ([Get one here](https://console.anthropic.com/))

## 🔧 Detailed Setup

### 1. Environment Configuration

Create a `.env` file:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/xceo"

# AI Configuration
ANTHROPIC_API_KEY="sk-ant-api..."

# Optional
PORT=3000
```

### 2. Database Setup

```bash
# Create database
createdb xceo

# Run migrations
npm run db:push

# Create admin user (optional - start.sh does this)
npm run db:create-admin
```

### 3. Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Or use the convenience script
./start.sh
```

## 🎮 Features Overview

### Dashboard
- Real-time business metrics
- Task overview and priorities
- Recent activity feed
- Quick actions panel

### AI Chat
- Natural language interaction
- Context-aware responses
- Business strategy advice
- Task creation from conversations

### Task Management
- Kanban board view
- Priority-based sorting
- Due date tracking
- Team assignment

### Team Management
- Add team members and contractors
- Track skills and availability
- Assign tasks and projects
- Performance insights

### Business Intelligence
- Revenue tracking
- Customer analytics
- Task completion rates
- Growth projections

### Settings & Configuration
- Business profile setup
- AI behavior customization
- Integration settings
- Data export options

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation
- Keep commits focused and descriptive

## 🐛 Troubleshooting

### Common Issues

**"Cannot connect to database"**
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database exists: `psql -l`

**"AI features not working"**
- Verify ANTHROPIC_API_KEY is set
- Check API key validity
- Ensure you have API credits

**"Port already in use"**
- Kill existing processes: `pkill -f node`
- Change PORT in .env

## 📈 Roadmap

- [ ] Mobile app (React Native)
- [ ] Email integration
- [ ] Calendar sync
- [ ] Invoice generation
- [ ] Advanced analytics
- [ ] Team performance tracking
- [ ] Client portal
- [ ] Automated workflows
- [ ] Third-party integrations

## 💡 Use Cases

### For Freelancers
- Track client projects and deadlines
- Manage invoices and payments
- Get advice on pricing strategies
- Automate follow-ups

### For Consultants
- Organize client engagements
- Track billable hours
- Generate reports
- Manage referrals

### For E-commerce Owners
- Monitor sales trends
- Track inventory
- Analyze customer behavior
- Plan marketing campaigns

### For Content Creators
- Content calendar management
- Audience analytics
- Sponsorship tracking
- Revenue optimization

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for Claude AI
- [Replit](https://replit.com) for hosting support
- All our contributors and early adopters

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Documentation](https://github.com/kevingduck/xceo/wiki)
- [Issues](https://github.com/kevingduck/xceo/issues)
- [Discussions](https://github.com/kevingduck/xceo/discussions)

---

**Built with ❤️ by solopreneurs, for solopreneurs**

*Because every business deserves executive-level guidance*