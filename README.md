<div align="center">

<img src="public/pulse-logo.png" width="60" alt="Pulse Logo" />

# Pulse

**Self-hosted uptime monitoring with real-time alerts, multi-region probing, and beautiful public status pages.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://prisma.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](Dockerfile)

</div>

---

## 📸 Screenshots

| Dashboard Overview | Monitors List |
| :---: | :---: |
| ![Dashboard](public/screenshots/dashboard.png) | ![Monitors](public/screenshots/monitors.png) |
| **Monitor Analytics** | **Public Status Pages** |
| ![Analytics](public/screenshots/analytics.png) | ![Status Pages](public/screenshots/status-pages.png) |

---

## ✨ Features

- **10+ Monitor Types** — HTTP(s), Keyword, SSL/TLS, DNS, Port, SMTP, Ping, Minecraft, Steam, Discord
- **Multi-Region Probing** — Deploy Cloudflare Workers as edge probes for distributed, real-world checks from multiple geographic regions
- **Public Status Pages** — Share beautiful, real-time status pages with your users (with per-node latency display)
- **Incident Management** — Automatic incident creation, AI-powered root cause analysis, and manual update posts
- **Smart Alerts** — Discord webhook & SMTP email notifications on downtime and recovery
- **Live Analytics** — Latency charts, uptime percentage, SLA tracking, and check history per monitor
- **Badge Generator** — Embed live status badges in any README or website
- **Monitor Groups** — Organize monitors into logical groups
- **User Management** — Admin panel with role-based access
- **Docker Ready** — One-command deployment with Docker Compose

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) 18+ or [Docker](https://docker.com)
- A running database (SQLite by default, zero config)

### Option A: Docker (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/pulse.git
cd pulse

# 2. Copy the environment file
cp .env.example .env

# 3. Edit .env and set a strong NEXTAUTH_SECRET
nano .env

# 4. Start with Docker Compose
docker compose up -d
```

Visit **http://localhost:3000** and register your first account.

---

### Option B: Manual Setup

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/pulse.git
cd pulse
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env — at minimum set NEXTAUTH_SECRET and DATABASE_URL

# 3. Set up the database
npx prisma migrate deploy
npx prisma generate

# 4. Start the development server
npm run dev
```

Visit **http://localhost:3000** — register and log in.

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and fill in the values:

```env
# Application
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-very-strong-random-secret-here    # generate with: openssl rand -base64 32

# Database (SQLite default — no setup needed)
DATABASE_URL="file:./dev.db"

# Optional: PostgreSQL
# DATABASE_URL="postgresql://user:pass@host:5432/pulse"
```

> All other settings (SMTP, Discord Webhook, Edge Probes) are configured via the **Settings** page in the UI — no need to restart the server.

---

## 🌍 Multi-Region Monitoring (Cloudflare Edge Probes)

Pulse supports real distributed checks from globally distributed Cloudflare Workers.

### Setup

**1. Deploy the Edge Probe Worker**

Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create Worker.

Paste the contents of [`public/edge-probe.js`](public/edge-probe.js) into the editor and deploy.

**2. Add a Secret**

In the Worker → Settings → Variables and Secrets:
- Name: `PROBE_SECRET`
- Value: any strong random string (e.g., `openssl rand -hex 32`)

**3. Register the Worker in Pulse**

Dashboard → Settings → **Cloudflare Edge Probes** → Add Edge Node:

| Field | Value |
|---|---|
| Node ID | `us-east` (must match your monitor's region setting) |
| Display Name | `US East` |
| Worker URL | `https://your-worker.workers.dev` |
| Probe Secret | The same secret from step 2 |

Click **Test** to verify connectivity, then **Save Settings**.

**4. Assign Regions to Monitors**

When creating or editing a monitor, select the regions (nodes) that should check it. Each region runs checks independently, and results appear in analytics and on the public status page.

---

## 🐳 Docker Deployment

```bash
docker compose up -d
```

The `docker-compose.yml` includes:
- The Pulse app (port 3000)
- Automatic database migrations on startup

For production with a reverse proxy (nginx/Caddy), set `NEXTAUTH_URL` to your public domain.

---

## 📡 API

Pulse exposes a REST API. See [`API_DOCS.md`](API_DOCS.md) for full documentation.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/monitors` | List all monitors |
| `POST` | `/api/monitors` | Create a monitor |
| `PATCH` | `/api/monitors/:id` | Update a monitor |
| `DELETE` | `/api/monitors/:id` | Delete a monitor |
| `POST` | `/api/monitors/:id/test` | Trigger an immediate check |
| `GET` | `/api/monitors/:id/analytics` | Get uptime & latency data |
| `GET` | `/api/monitors/:id/badge` | SVG status badge |
| `GET` | `/api/status/:slug` | Public status page data |
| `GET` | `/api/settings` | Get all settings |
| `POST` | `/api/settings` | Save settings |
| `POST` | `/api/settings/test-probe` | Test an edge probe connection |

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Database | SQLite (Prisma ORM) |
| Auth | NextAuth.js |
| UI | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| Edge Probes | Cloudflare Workers |
| Deployment | Docker / Node.js |

---

## 📁 Project Structure

```
pulse/
├── prisma/              # Database schema & migrations
├── public/
│   ├── edge-probe.js    # Cloudflare Worker script
│   └── screenshots/     # README screenshots
├── src/
│   ├── app/
│   │   ├── api/         # REST API routes
│   │   ├── dashboard/   # Dashboard pages
│   │   └── status/      # Public status pages
│   ├── components/      # Reusable UI components
│   └── lib/
│       ├── auth.ts      # NextAuth config
│       ├── db.ts        # Prisma client
│       └── scheduler.ts # Monitor scheduling engine
├── docker-compose.yml
└── Dockerfile
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  Built with ❤️ using Next.js, Prisma & Cloudflare Workers
</div>