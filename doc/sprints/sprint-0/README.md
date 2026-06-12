# Sprint 0 — «Первая печать»

| | |
|---|---|
| **Период** | 11–18 июня 2026 (1 неделя) |
| **Цель** | Файл из Telegram доезжает до принтера за < 30 сек |
| **Этап roadmap** | [Этап 1 — Ручной пилот](../../ROADMAP.md#этап-1--ручной-пилот-proof-of-concept) |
| **Feature IDs** | INF-01, WEB-01, WEB-02, WEB-03, WEB-08, AGT-01, AGT-02, PAY-01 |

## Definition of Done

- [ ] 5 успешных печатей подряд без правок кода между ними
- [ ] Время от отправки файла в бота до старта печати < 45 сек
- [ ] Задокументированы: ОС агента, имя принтера, среднее время
- [ ] Есть договорённость (устная) с 1 копицентром на следующий спринт

## Архитектура спринта

```
[ Telegram ] ──document──► [ Nuxt/Nitro на Vercel ]
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
              Neon (PostgreSQL)      Vercel Blob (PDF)
              orders, users          filePath = blob key
                    │
         ◄──poll 5s── [ Python agent ]
                    │
              [ Принтер ]
```

**Вне скоупа Sprint 0:** Mini App, Т-Банк, WebSocket, GUI, DOCX, карта, Redis.

**Инфра пилота:** Neon (free) + Vercel Blob + Vercel. Локальный `uploads/` не используем — не работает на serverless.

## Задачи

| # | Задача | Статус | Файл |
|---|--------|--------|------|
| 01 | Monorepo + Nuxt 3 scaffold | ✅ | [tasks/01-monorepo-web-scaffold.md](./tasks/01-monorepo-web-scaffold.md) |
| 02 | Prisma: User, Point, Order | ✅ | [tasks/02-prisma-schema.md](./tasks/02-prisma-schema.md) |
| 03 | Telegram Bot: /start + PDF | ✅ | [tasks/03-telegram-bot.md](./tasks/03-telegram-bot.md) |
| 04 | API: upload + create order | ✅ | [tasks/04-api-orders.md](./tasks/04-api-orders.md) |
| 05 | Desktop: polling-агент | ✅ | [tasks/05-desktop-agent.md](./tasks/05-desktop-agent.md) |
| 06 | Печать PDF на принтере | ✅ | [tasks/06-print-pdf.md](./tasks/06-print-pdf.md) |
| 07 | Админка: ручное «Оплачено» | ✅ | [tasks/07-admin-manual-payment.md](./tasks/07-admin-manual-payment.md) |
| 08 | E2E: бот → принтер | ⬜ | [tasks/08-e2e-test.md](./tasks/08-e2e-test.md) |
| 09 | Договориться с копицентром | ⬜ | [tasks/09-partner-outreach.md](./tasks/09-partner-outreach.md) |

## Порядок выполнения

```
01 ──► 02 ──► 04 ──► 03
              │
              └──► 07
05 ──► 06 ──► 08 (нужны 03, 04, 07)
09 — параллельно с любого дня
```

## Окружение

📖 **Подробная инструкция:** [ENV_SETUP.md](../../ENV_SETUP.md) — где взять каждый ключ, пошагово.

### Переменные (`.env` в `web/`)

```env
# Neon → Dashboard → Connection string (pooled, ssl)
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/kopir?sslmode=require"

# Vercel → Storage → Blob → Read/Write token
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

TELEGRAM_BOT_TOKEN="..."
ADMIN_SECRET="..."          # для /admin и set-webhook
AGENT_API_KEY="..."         # desktop → server auth
```

### Переменные (`desktop/.env`)

```env
# Локально:
SERVER_URL="http://localhost:3000"
# Staging на Vercel:
# SERVER_URL="https://kopir-xxx.vercel.app"

AGENT_API_KEY="..."
POINT_ID="point_dev_1"
POLL_INTERVAL_SEC=5
```

### Деплой staging (опционально в Sprint 0)

1. Подключить репозиторий к Vercel, Root Directory = `web`
2. Добавить env из таблицы выше (те же Neon + Blob, что и локально)
3. `prisma migrate deploy` против prod Neon
4. Webhook: `POST /api/telegram/set-webhook` или вручную через Bot API
5. Агент на ПК копицентра смотрит на `SERVER_URL` Vercel

Подробнее: [PROJECT.md — Инфра](../../PROJECT.md#инфра)

## Ежедневный чеклист

| День | Фокус |
|------|-------|
| Д1 | Задачи 01, 02 |
| Д2 | Задачи 03, 04 |
| Д3 | Задачи 05, 06 (локально на своём ПК) |
| Д4 | Задача 07, первый E2E |
| Д5 | Задача 08, отладка, 5 печатей |
| Д6–7 | Задача 09, ретро, буфер |

## Ретро

Шаблон в конце [SPRINTS.md](../../SPRINTS.md#ретро-шаблон). Заполнить 18 июня.

## После спринта

→ [Sprint 1 — Бета в копицентре](../sprint-1/README.md) *(создать при старте)*
