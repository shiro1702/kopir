# Kopir Web — Sprint 0

Nuxt 3 + Nitro API for messenger bots (Telegram, MAX), admin panel, and print agent.

Bot architecture: [doc/BOT_MESSENGERS.md](../doc/BOT_MESSENGERS.md).

## Setup

```bash
cd web
cp .env.example .env   # fill Neon, Blob, Telegram, MAX (opt.), secrets
npm install
npm run db:deploy      # against Neon
npm run db:seed
npm run dev
```

## Deploy to Vercel

1. Connect repo — **Root Directory** = `web`
2. Add env vars from `.env.example`
3. Deploy (auto on push)
4. Run migrations against prod Neon:

```bash
cd web
DATABASE_URL="postgresql://..." npm run db:deploy
DATABASE_URL="postgresql://..." npm run db:seed
```

5. Set webhooks (Telegram + MAX if tokens are set):

```bash
ADMIN_SECRET=xxx ./scripts/set-bot-webhooks.sh https://YOUR_APP.vercel.app
```

## API

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/health` | — | Health check |
| `POST /api/telegram/webhook` | Telegram | Bot updates |
| `POST /api/max/webhook` | MAX (`X-Max-Bot-Api-Secret`) | Bot updates |
| `POST /api/bots/set-webhooks` | ADMIN_SECRET | Register all webhooks |
| `POST /api/telegram/set-webhook` | ADMIN_SECRET | Telegram only |
| `POST /api/max/set-webhook` | ADMIN_SECRET | MAX only |
| `GET /api/admin/orders` | ADMIN_SECRET | List orders |
| `POST /api/admin/orders/:id/pay` | ADMIN_SECRET | Confirm payment |
| `GET /api/agent/queue?pointId=` | AGENT_API_KEY | Paid queue |
| `GET /api/agent/orders/:id/file` | AGENT_API_KEY | Download PDF |
| `POST /api/agent/orders/:id/claim` | AGENT_API_KEY | Claim order |
| `POST /api/agent/orders/:id/complete` | AGENT_API_KEY | Finish print |

## Scripts

```bash
npm run dev          # local dev :3000
npm run build        # production build
npm run db:migrate   # create migration (dev)
npm run db:deploy    # apply migrations (prod)
npm run db:seed      # seed point_dev_1
npm run db:studio    # Prisma Studio
```
