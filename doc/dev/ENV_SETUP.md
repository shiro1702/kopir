# Переменные окружения — где взять и куда положить

Пошаговая инструкция для Sprint 0. Все секреты хранятся **только** в `.env` (локально) и в **Vercel Dashboard** (staging/prod). В git не коммитить.

Полный сценарий деплоя: [DEPLOY.md](./DEPLOY.md).

## Быстрый чеклист

| # | Переменная | Где взять | Куда положить |
|---|------------|-----------|---------------|
| 1 | `DATABASE_URL` | [Neon](https://neon.tech) | `web/.env` + Vercel |
| 2 | `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob | `web/.env` + Vercel |
| 3 | `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/BotFather) | `web/.env` + Vercel |
| 4 | `MAX_BOT_TOKEN` | [MAX для разработчиков](https://dev.max.ru) | `web/.env` + Vercel (опц.) |
| 5 | `MAX_WEBHOOK_SECRET` | Сгенерировать (5–256 символов) | `web/.env` + Vercel (рекомендуется) |
| 6 | `ADMIN_SECRET` | Сгенерировать самому | `web/.env` + Vercel |
| 7 | `AGENT_API_KEY` | Сгенерировать самому | `web/.env` + Vercel + `desktop/.env` |
| 8 | `SERVER_URL` | URL деплоя Vercel | `desktop/.env` |
| 9 | `POINT_ID` | Константа `point_dev_1` | `desktop/.env` |
| 10 | `POINT_OFFLINE_THRESHOLD_SEC` | `20` (опционально) | `web/.env` + Vercel |

---

## 1. Neon — `DATABASE_URL`

**Зачем:** PostgreSQL для пользователей, точек и заказов (Prisma).

### Шаги

1. Зарегистрироваться на [console.neon.tech](https://console.neon.tech)
2. **New Project** → имя, например `kopir`, регион ближе к пользователям (Frankfurt / Singapore)
3. На главной проекта скопировать **Connection string**
4. Выбрать вариант **Pooled connection** (важно для serverless Vercel)
5. Убедиться, что в строке есть `?sslmode=require`

Пример:

```env
DATABASE_URL="postgresql://kopir_owner:AbCdEf123@ep-cool-name-123456.eu-central-1.aws.neon.tech/kopir?sslmode=require"
```

### После получения URL

```bash
cd web
cp .env.example .env
# вставить DATABASE_URL в .env

npm run db:deploy   # применить миграции
npm run db:seed     # создать точку point_dev_1
```

### Совет

- **Локально и Vercel** могут использовать одну и ту же Neon БД на этапе пилота
- Позже: отдельные ветки Neon `dev` / `main` для изоляции

---

## 2. Vercel Blob — `BLOB_READ_WRITE_TOKEN`

**Зачем:** хранение PDF заказов. Локальный диск на Vercel не персистентный — только Blob.

### Шаги

1. Задеплоить проект на [vercel.com](https://vercel.com) (или создать проект заранее)
2. Открыть проект → **Storage** → **Create Database** → **Blob**
3. Подключить store к проекту
4. В настройках store или проекта скопировать **Read/Write Token**

Пример:

```env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxxxxxxxx"
```

Тот же токен — в `web/.env` и в **Vercel → Settings → Environment Variables**.

---

## 3. Telegram — `TELEGRAM_BOT_TOKEN`

**Зачем:** бот принимает PDF, webhook шлёт updates на сервер.

### Шаги

1. Открыть [@BotFather](https://t.me/BotFather) в Telegram
2. `/newbot` → имя и username (должен заканчиваться на `bot`, например `kopir_print_bot`)
3. BotFather пришлёт токен вида `123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

```env
TELEGRAM_BOT_TOKEN="123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### Webhook (после деплоя на Vercel)

**Все каналы одной командой** (Telegram + MAX, если токены заданы):

```bash
curl -X POST "https://ВАШ-ДОМЕН.vercel.app/api/bots/set-webhooks" \
  -H "Authorization: Bearer ВАШ_ADMIN_SECRET"
```

Или скрипт:

```bash
cd web
ADMIN_SECRET=xxx ./scripts/set-bot-webhooks.sh https://ВАШ-ДОМЕН.vercel.app
```

Только Telegram: `POST /api/telegram/set-webhook`. Только MAX: `POST /api/max/set-webhook`.

Подробнее об архитектуре ботов: [BOT_MESSENGERS.md](../project/BOT_MESSENGERS.md).

---

## 4. MAX — `MAX_BOT_TOKEN` и `MAX_WEBHOOK_SECRET`

**Зачем:** бот в мессенджере MAX принимает PDF на том же бэкенде, что Telegram.

### Шаги

1. Зарегистрироваться на [dev.max.ru](https://dev.max.ru)
2. Создать чат-бота → **Расширенные настройки** → скопировать токен
3. Сгенерировать секрет для webhook (латиница, цифры, дефис):

```bash
openssl rand -hex 16
```

```env
MAX_BOT_TOKEN="..."
MAX_WEBHOOK_SECRET="my-webhook-secret-2026"
```

MAX шлёт секрет в заголовке `X-Max-Bot-Api-Secret` — сервер сверяет с env.

### Webhook

Регистрируется через `POST /api/bots/set-webhooks` (см. §3 Telegram) или отдельно `POST /api/max/set-webhook`.

Требования MAX: HTTPS на 443, доверенный сертификат (Vercel подходит).

---

## 5. `ADMIN_SECRET` — секрет админки

**Зачем:** доступ к `/admin`, API `GET /api/admin/orders`, `POST .../pay`, установка webhook.

### Как получить

Сгенерировать случайную строку (32+ символов):

```bash
openssl rand -hex 32
```

```env
ADMIN_SECRET="a1b2c3d4e5f6..."
```

- Вводится один раз в UI админки (`/admin`) — сохраняется в `localStorage` браузера
- На API передаётся как `Authorization: Bearer <ADMIN_SECRET>`

**Не путать** с паролем от Neon/Vercel — это только внутренний ключ Kopir.

---

## 6. `AGENT_API_KEY` — ключ десктоп-агента

**Зачем:** Python-агент на ПК копицентра опрашивает `/api/agent/*`.

### Как получить

Тоже сгенерировать:

```bash
openssl rand -hex 32
```

```env
# web/.env
AGENT_API_KEY="f7e8d9c0..."

# desktop/.env — ТО ЖЕ ЗНАЧЕНИЕ
AGENT_API_KEY="f7e8d9c0..."
```

Агент шлёт заголовок: `Authorization: Bearer <AGENT_API_KEY>`.

При каждом запросе к `/api/agent/*` сервер обновляет `Point.lastSeenAt`. По этому полю определяется, подключён ли агент (см. §9).

---

## 9. `POINT_OFFLINE_THRESHOLD_SEC` — статус агента печати

**Зачем:** сервер и админка понимают, жив ли десктоп-агент на точке. Если агент не обращался к API дольше порога — точка считается offline.

```env
POINT_OFFLINE_THRESHOLD_SEC=20
```

**Как работает (polling MVP):**

- Агент при poll (`POLL_INTERVAL_SEC`, default 5) и при печати (claim, download, complete) обновляет `lastSeenAt` на сервере.
- Если `now - lastSeenAt > POINT_OFFLINE_THRESHOLD_SEC` → offline.
- **Админка** (`/admin`): 🟢/🔴 у каждой точки.
- **Бот:** после подтверждения оплаты клиенту дописывается предупреждение, если агент offline.

**Рекомендация:** держать порог ≥ `2 × POLL_INTERVAL_SEC` агента (при poll=5 → 15–20 сек).

Полная версия с WebSocket heartbeat — Sprint 1, задача [04-heartbeat-offline](../sprints/sprint-1/tasks/04-heartbeat-offline.md).

---

## 7. Vercel — деплой и env

### Первый деплой

1. [vercel.com/new](https://vercel.com/new) → Import Git Repository
2. **Root Directory** = `web` (обязательно!)
3. Framework: Nuxt (определится автоматически)
4. **Environment Variables** — добавить все переменные из `web/.env.example`:

| Name | Environments |
|------|--------------|
| `DATABASE_URL` | Production, Preview, Development |
| `BLOB_READ_WRITE_TOKEN` | Production, Preview, Development |
| `TELEGRAM_BOT_TOKEN` | Production, Preview, Development |
| `MAX_BOT_TOKEN` | Production, Preview, Development (если используете MAX) |
| `MAX_WEBHOOK_SECRET` | Production, Preview, Development (рекомендуется) |
| `ADMIN_SECRET` | Production, Preview, Development |
| `AGENT_API_KEY` | Production, Preview, Development |
| `POINT_OFFLINE_THRESHOLD_SEC` | Production, Preview, Development (опционально, default 20) |

5. Deploy

### URL проекта

После деплоя Vercel даёт URL вида:

```
https://kopir-xxxxx.vercel.app
```

Его использовать как `SERVER_URL` в агенте.

`VERCEL_URL` Vercel выставляет сам — endpoint `set-webhook` использует его для регистрации webhook.

### Миграции на prod Neon

Локально, с prod `DATABASE_URL`:

```bash
cd web
DATABASE_URL="postgresql://..." npm run db:deploy
DATABASE_URL="postgresql://..." npm run db:seed
```

---

## 8. Desktop agent — `desktop/.env`

```bash
cd desktop
cp .env.example .env
```

| Переменная | Значение | Откуда |
|------------|----------|--------|
| `SERVER_URL` | `https://kopir-xxxxx.vercel.app` | Vercel Dashboard → Domains |
| `AGENT_API_KEY` | тот же, что в `web/.env` | см. §5 |
| `POINT_ID` | `point_dev_1` | после `npm run db:seed` |
| `POLL_INTERVAL_SEC` | `5` | по умолчанию |
| `PRINTER_NAME` | пусто или имя принтера | см. ниже |
| `SUMATRA_PATH` | `bin/SumatraPDF.exe` | только Windows |

### Имя принтера

**macOS / Linux:**

```bash
lpstat -p -d
```

**Windows:** Параметры → Принтеры, или `Get-Printer` в PowerShell.

### SumatraPDF (Windows)

1. Скачать portable: [sumatrapdfreader.org](https://www.sumatrapdfreader.org/download-free-pdf-viewer)
2. Положить `SumatraPDF.exe` в `desktop/bin/`
3. Или указать полный путь в `SUMATRA_PATH`

---

## Итоговые файлы

### `web/.env`

```env
DATABASE_URL="postgresql://..."
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
TELEGRAM_BOT_TOKEN="123456789:AAH..."
MAX_BOT_TOKEN="..."              # опционально
MAX_WEBHOOK_SECRET="..."         # опционально, для prod
ADMIN_SECRET="..."
AGENT_API_KEY="..."
POINT_OFFLINE_THRESHOLD_SEC=20
PRICE_PER_PAGE_KOPEKS=1000
CALCULATION_TIMEOUT_SEC=120
PAYMENT_MODE=terminal
POINT_TRANSFER_PHONE="+79001234567"   # СБП-номер копицентра (пилот); fallback если Point.transferPhone пуст
POINT_TRANSFER_BANK_LABEL="Сбербанк, ИП Иванов"
PAYMENT_METHODS_ENABLED="SBP_TRANSFER,ON_SITE"
STAFF_TELEGRAM_CHAT_ID="123456789"   # chat id сотрудника в Telegram
STAFF_MAX_USER_ID="987654321"        # user_id сотрудника в MAX
```

### `desktop/.env`

```env
SERVER_URL="https://kopir-xxxxx.vercel.app"
AGENT_API_KEY="..."          # = web
POINT_ID="point_dev_1"
POLL_INTERVAL_SEC=5
PRINTER_NAME=""
SUMATRA_PATH="bin/SumatraPDF.exe"
USE_WORD=true
USE_SEPARATOR_PAGE=false   # по умолчанию без разделительного листа
```

### Sprint 0.2 — batch (несколько файлов, одна оплата)

```env
BATCH_MAX_FILES=5              # максимум файлов в пачке
BATCH_BUILD_TIMEOUT_MIN=15     # автоотмена незавершённой пачки (минуты)
```

После обновления схемы: `cd web && npm run db:deploy`

---

## Проверка

```bash
# 1. Локальный сервер (нужен web/.env)
cd web && npm run dev
curl http://localhost:3000/api/health

# 2. После деплоя
cd web
ADMIN_SECRET=xxx AGENT_API_KEY=yyy ./scripts/smoke-test.sh https://kopir-xxxxx.vercel.app

# 3. Агент
cd desktop && python -m agent.main
```

---

## Частые ошибки

| Симптом | Причина | Решение |
|---------|---------|---------|
| 401 на `/api/agent/*` | Неверный `AGENT_API_KEY` | Сверить web и desktop `.env` |
| 401 на `/admin` | Неверный `ADMIN_SECRET` | Переввести секрет в UI |
| Бот молчит (TG) | Webhook не установлен | `POST /api/bots/set-webhooks` |
| MAX не отвечает | Нет токена / webhook | `MAX_BOT_TOKEN` + set-webhooks |
| Prisma error | Нет миграций | `npm run db:deploy` |
| Blob upload fail | Нет `BLOB_READ_WRITE_TOKEN` | Создать Blob store в Vercel |
| Агент idle, заказы не печатаются | Заказ не `PAID` | В `/admin`: «Оплата получена» → «Печать» (или кнопки в TG сотрудника) |
| Админка 🔴, агент запущен | Порог offline слишком мал / нет миграции | `npm run db:deploy`; `POINT_OFFLINE_THRESHOLD_SEC` ≥ 2× `POLL_INTERVAL_SEC` |
| `Point not found` | Нет seed | `npm run db:seed` |

---

## Связанные документы

- [PROJECT.md](../project/PROJECT.md) — архитектура и инфра
- [BOT_MESSENGERS.md](../project/BOT_MESSENGERS.md) — Telegram, MAX, как добавить VK
- [sprints/sprint-0/README.md](../sprints/sprint-0/README.md) — Sprint 0
- [web/README.md](../web/README.md) — команды web
- [desktop/README.md](../desktop/README.md) — запуск агента
