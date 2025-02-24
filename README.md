# XCEO 🙅 Your AI CEO
# *The CRM for Solopreneurs*

Keep track of your business with an AI that acts like a CEO - giving you guidance and direction while you stay in control.

## Try it now

https://xceo.replit.app

## What it does

Think of this as having an AI CEO advisor that's available 24/7. While you and your team handle the actual work, the AI CEO helps by:
- Making suggestions on business decisions
- Creating and assigning tasks to your team
- Keeping track of everything happening in your business
- Guiding you through tough choices
- Spotting problems before they get big

You're always in charge - the AI CEO is there to advise and help organize, not to take over (or fire you). You and your team make the final calls on everything.

<img width="1458" alt="image" src="https://github.com/user-attachments/assets/c8a857bb-fa14-4ce3-b033-6b4a8dca4782" />

https://github.com/user-attachments/assets/e706ebda-d96d-47e2-9424-853d0cedbc23

## Main features

- Smart task management: The AI CEO helps create and prioritize work
- Business memory: Stores all your important business info in one place
- Live insights: Shows you how your business is doing in real-time
- Works everywhere: Use it on your phone, tablet, or computer

## Getting started

You'll need:
- Node.js (version 18 or newer)
- PostgreSQL (version 13 or newer)
- An API key from Anthropic for the AI features

### Running on Replit

1. Fork this project on Replit
2. The database will be automatically set up for you
3. Add your Anthropic API key to the `.env` file
4. Click the Run button

### Local Development Setup

1. Get the code:
```bash
git clone https://github.com/kevingduck/xceo.git
cd xceo
```

2. Install what you need:
```bash
npm install
```

3. Set up your database:
   1. Install PostgreSQL if you haven't already
   2. Create a new database: `createdb xceo`
   3. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
   4. Update the DATABASE_URL in `.env` with your database details:
   ```
   # Format: postgresql://username:password@hostname:port/database_name
   # Example for local development with default PostgreSQL setup:
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/xceo"
   ```
   Note: Replace postgres:postgres with your actual PostgreSQL username and password

4. Add your Anthropic API key:
   - Sign up at https://console.anthropic.com/
   - Get your API key from the dashboard
   - Add it to your `.env` file:
   ```
   ANTHROPIC_API_KEY="your-key-here"
   ```

5. Set up the database schema:
```bash
npm run db:push
```

6. Start the development server:
```bash
npm run dev
```

## Why we made this open source

We want to:
- Be transparent
- Let anyone contribute and make it better
- Make it available to all businesses
- Let you customize it for your needs

## Need help?

- Read the docs: [Link to Docs]
- Report issues: [GitHub Issues]
- Join our community: [Link to Forum]

## Thank you

- Anthropic for providing the AI (Claude)
- Everyone who's contributed
- Businesses who've given us feedback

Join us in bringing AI CEO guidance to businesses while keeping humans in control.