# Переменные окружения — где взять и куда положить

Пошаговая инструкция для Sprint 0. Все секреты хранятся **только** в `.env` (локально) и в **Vercel Dashboard** (staging/prod). В git не коммитить.

## Быстрый чеклист

| # | Переменная | Где взять | Куда положить |
|---|------------|-----------|---------------|
| 1 | `DATABASE_URL` | [Neon](https://neon.tech) | `web/.env` + Vercel |
| 2 | `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob | `web/.env` + Vercel |
| 3 | `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/BotFather) | `web/.env` + Vercel |
| 4 | `ADMIN_SECRET` | Сгенерировать самому | `web/.env` + Vercel |
| 5 | `AGENT_API_KEY` | Сгенерировать самому | `web/.env` + Vercel + `desktop/.env` |
| 6 | `SERVER_URL` | URL деплоя Vercel | `desktop/.env` |
| 7 | `POINT_ID` | Константа `point_dev_1` | `desktop/.env` |

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

```bash
curl -X POST "https://ВАШ-ДОМЕН.vercel.app/api/telegram/set-webhook" \
  -H "Authorization: Bearer ВАШ_ADMIN_SECRET"
```

Или скрипт:

```bash
cd web
ADMIN_SECRET=xxx ./scripts/deploy-checklist.sh https://ВАШ-ДОМЕН.vercel.app
```

---

## 4. `ADMIN_SECRET` — секрет админки

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

## 5. `AGENT_API_KEY` — ключ десктоп-агента

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

---

## 6. Vercel — деплой и env

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
| `ADMIN_SECRET` | Production, Preview, Development |
| `AGENT_API_KEY` | Production, Preview, Development |

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

## 7. Desktop agent — `desktop/.env`

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
ADMIN_SECRET="..."
AGENT_API_KEY="..."
```

### `desktop/.env`

```env
SERVER_URL="https://kopir-xxxxx.vercel.app"
AGENT_API_KEY="..."          # = web
POINT_ID="point_dev_1"
POLL_INTERVAL_SEC=5
PRINTER_NAME=""
SUMATRA_PATH="bin/SumatraPDF.exe"
```

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
| Бот молчит | Webhook не установлен | `POST /api/telegram/set-webhook` |
| Prisma error | Нет миграций | `npm run db:deploy` |
| Blob upload fail | Нет `BLOB_READ_WRITE_TOKEN` | Создать Blob store в Vercel |
| Агент idle, заказы не печатаются | Заказ не `PAID` | Нажать «Оплатить» в `/admin` |
| `Point not found` | Нет seed | `npm run db:seed` |

---

## Связанные документы

- [PROJECT.md](./PROJECT.md) — архитектура и инфра
- [sprints/sprint-0/README.md](./sprints/sprint-0/README.md) — Sprint 0
- [web/README.md](../web/README.md) — команды web
- [desktop/README.md](../desktop/README.md) — запуск агента
