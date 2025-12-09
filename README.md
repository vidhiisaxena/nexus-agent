# Nexus Agent

Full-stack project with server, mobile app, and kiosk app.

## Project Structure

```
nexus-agent/
├── server/          # Node.js + Express + Socket.io server
├── mobile-app/      # Mobile application
├── kiosk-app/       # Kiosk application
└── package.json     # Root workspace configuration
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Redis

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `server/.env` and update with your values
   - Set `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`, and `OPENAI_API_KEY`

### Running the Server

```bash
npm run dev:server
```

The server will start on port 5000 (or the port specified in `.env`).

### Health Check

Visit `http://localhost:5000/api/health` to verify the server is running.

## Environment Variables

- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection URL
- `JWT_SECRET` - Secret key for JWT tokens
- `OPENAI_API_KEY` - OpenAI API key

