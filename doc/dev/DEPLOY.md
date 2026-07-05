# Деплой на Vercel + Neon + Blob

Пошаговая инструкция: как поднять `web/` (Nuxt 3 + Nitro) в продакшене.  
Секреты и переменные окружения — в [ENV_SETUP.md](./ENV_SETUP.md).

## Что куда деплоится

```
GitHub (monorepo kopir/)
        │
        ▼
   Vercel (Root Directory = web/)
        │
        ├── Neon PostgreSQL  ← DATABASE_URL (Prisma)
        └── Vercel Blob      ← BLOB_READ_WRITE_TOKEN (PDF/DOCX заказов)
```

| Сервис | Роль | Переменная |
|--------|------|------------|
| **Vercel** | Хостинг Nuxt/Nitro (serverless functions) | — |
| **Neon** | PostgreSQL: пользователи, точки, заказы | `DATABASE_URL` |
| **Vercel Blob** | Временное хранение файлов заказов | `BLOB_READ_WRITE_TOKEN` |

Локальный диск на Vercel **не персистентный** — файлы заказов только в Blob. После печати сервер удаляет объект из Blob (`deleteOrderFile`).

---

## Предварительные требования

- Аккаунт [GitHub](https://github.com) с репозиторием `kopir`
- Аккаунт [Vercel](https://vercel.com)
- Аккаунт [Neon](https://neon.tech)
- Node.js 20+ локально (для миграций и seed)

---

## 1. Neon — база данных

### 1.1 Создать проект

1. [console.neon.tech](https://console.neon.tech) → **New Project**
2. Имя: `kopir`, регион — ближе к пользователям (например Frankfurt)
3. Скопировать **Connection string**

### 1.2 Pooled connection (обязательно)

Для serverless Vercel нужен **pooled** endpoint, не direct:

- В Neon Dashboard → **Connection Details** → вкладка **Pooled connection**
- В строке должен быть хост вида `ep-xxx-pooler.region.aws.neon.tech`
- Параметр `?sslmode=require` обязателен

```env
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.eu-central-1.aws.neon.tech/kopir?sslmode=require"
```

### 1.3 Миграции и seed

Выполняются **локально**, не на Vercel (миграции — отдельный шаг после деплоя):

```bash
cd web
cp .env.example .env
# вставить DATABASE_URL

npm install
npm run db:deploy    # prisma migrate deploy
npm run db:seed      # точка point_dev_1
```

Проверка:

```bash
npm run db:studio    # открыть Prisma Studio
```

### 1.4 Dev / prod

На этапе пилота можно использовать **одну** Neon БД и для локальной разработки, и для Vercel.

Позже — отдельные ветки Neon (`dev` / `main`) или отдельные проекты для изоляции preview/prod.

---

## 2. Vercel Blob — файлы заказов

### 2.1 Создать store

1. Задеплоить проект на Vercel (шаг 3) **или** создать пустой проект заранее
2. Проект → **Storage** → **Create Database** → **Blob**
3. Имя store, например `kopir-files`
4. **Connect to Project** — привязать к проекту Kopir

Vercel автоматически добавит `BLOB_READ_WRITE_TOKEN` в Environment Variables проекта.

### 2.2 Локальная разработка

Скопировать тот же токен в `web/.env`:

```env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxx"
```

Без токена загрузка файлов в боте вернёт `500` с кодом `BLOB_NOT_CONFIGURED`.

### 2.3 Как используется в коде

- Путь в store: `orders/{orderId}.pdf` (или `.docx`)
- Загрузка: `put()` через `@vercel/blob`
- Скачивание агентом: публичный URL из поля `filePath` в заказе
- Удаление после печати: `del()`

Конфигурация: `web/nuxt.config.ts` → `runtimeConfig.blobReadWriteToken`, утилиты в `web/server/utils/blob.ts`.

---

## 3. Vercel — деплой приложения

### 3.1 Импорт репозитория

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**
2. Выбрать репозиторий `kopir`

### 3.2 Настройки проекта (критично)

| Параметр | Значение |
|----------|----------|
| **Root Directory** | `web` |
| **Framework Preset** | Nuxt.js (авто) |
| **Build Command** | `npm run build` |
| **Install Command** | `npm install` |
| **Output Directory** | **пусто** (не `public`, не `dist`) |

Nuxt 3 + `nitro.preset: 'vercel'` в `nuxt.config.ts` сам пишет артефакты в `.vercel/output` (Build Output API).  
**Не добавляйте** `web/vercel.json` с `"framework": "nuxtjs"` — Vercel начнёт искать статическую папку `public` и деплой упадёт.

### 3.3 Environment Variables

Добавить в **Settings → Environment Variables** (Production, Preview, Development):

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `DATABASE_URL` | да | Neon pooled connection string |
| `BLOB_READ_WRITE_TOKEN` | да | Из Blob store (или авто при connect) |
| `TELEGRAM_BOT_TOKEN` | да | [@BotFather](https://t.me/BotFather) |
| `ADMIN_SECRET` | да | `openssl rand -hex 32` |
| `AGENT_API_KEY` | да | `openssl rand -hex 32` |
| `MAX_BOT_TOKEN` | нет | MAX мессенджер |
| `MAX_WEBHOOK_SECRET` | нет | Секрет webhook MAX |
| `PRICE_PER_PAGE_KOPEKS` | нет | По умолчанию `1000` (10 ₽/стр.) |
| `CALCULATION_TIMEOUT_SEC` | нет | По умолчанию `120` |
| `PAYMENT_MODE` | нет | `terminal` (Sprint 0) |
| `STAFF_TELEGRAM_CHAT_ID` | нет | Chat ID сотрудника |
| `STAFF_MAX_USER_ID` | нет | User ID сотрудника в MAX |

Полный список и где взять значения: [ENV_SETUP.md](./ENV_SETUP.md).

### 3.4 Deploy

Нажать **Deploy**. После успеха Vercel выдаст URL:

```
https://kopir-xxxxx.vercel.app
```

`VERCEL_URL` Vercel выставляет автоматически — используется при регистрации webhook.

### 3.5 Кастомный домен (опционально)

**Settings → Domains** → добавить домен, настроить DNS по инструкции Vercel.

После привязки домена обновить webhook (шаг 4) и `SERVER_URL` в `desktop/.env`.

---

## 4. После первого деплоя

### 4.1 Миграции на prod Neon

Если БД ещё пустая или появились новые миграции:

```bash
cd web
DATABASE_URL="postgresql://..." npm run db:deploy
DATABASE_URL="postgresql://..." npm run db:seed   # только при первом запуске
```

> Миграции **не** запускаются автоматически при деплое Vercel. Запускать вручную или через CI (позже).

### 4.2 Webhook ботов

Секрет подхватывается из `web/.env`, если не передан в командной строке:

```bash
cd web
./scripts/set-bot-webhooks.sh https://kopir-seven.vercel.app
```

Или явно:

```bash
ADMIN_SECRET=ваш_реальный_секрет ./scripts/set-bot-webhooks.sh https://kopir-seven.vercel.app
```

> Не подставляйте буквально `...` — нужен полный `ADMIN_SECRET` из `.env` или Vercel → Settings → Environment Variables.

На Vercel задайте `NUXT_PUBLIC_SITE_URL=https://kopir-seven.vercel.app` — иначе webhook Telegram/MAX привяжется к случайному URL деплоя (`*.vercel.app`).

После миграции MAX API (Sprint 4, задача 08) сертификат Минцифры копируется в serverless-бандл при `npm run build` (`scripts/copy-certs-to-vercel.mjs`). Без redeploy MAX webhook вернёт `"error": "fetch failed"`.

Или вручную:

```bash
curl -X POST "https://kopir-xxxxx.vercel.app/api/bots/set-webhooks" \
  -H "Authorization: Bearer ВАШ_ADMIN_SECRET"
```

### 4.3 Smoke test

```bash
cd web
ADMIN_SECRET=xxx AGENT_API_KEY=yyy ./scripts/smoke-test.sh https://kopir-xxxxx.vercel.app
```

Или чеклист:

```bash
./scripts/deploy-checklist.sh https://kopir-xxxxx.vercel.app
```

Ожидаемый ответ health:

```bash
curl https://kopir-xxxxx.vercel.app/api/health
# {"ok":true,...}
```

### 4.4 Desktop agent

В `desktop/.env` на ПК копицентра:

```env
SERVER_URL="https://kopir-xxxxx.vercel.app"
AGENT_API_KEY="..."      # тот же, что в Vercel
POINT_ID="point_dev_1"   # после db:seed
```

Подробнее: [ENV_SETUP.md §8](./ENV_SETUP.md#8-desktop-agent--desktopenv).

---

## 5. Повседневный workflow

### Автодеплой

| Событие | Результат |
|---------|-----------|
| Push в `main` | Production deploy |
| Pull Request | Preview deploy (отдельный URL) |

### Новая миграция Prisma

```bash
# локально — создать миграцию
cd web
npm run db:migrate

# закоммитить prisma/migrations/
git add prisma/migrations/
git commit -m "feat: add migration ..."

# после merge / деплоя — применить на prod
DATABASE_URL="postgresql://..." npm run db:deploy
```

### Обновление env на Vercel

**Settings → Environment Variables** → изменить → **Redeploy** (или дождаться следующего push).

### Preview deployments

Preview получают те же env vars (если включены для Preview). Для изоляции позже:

- отдельная Neon branch для preview
- отдельный Blob store (или тот же на пилоте)

---

## 6. Мониторинг и отладка

### Vercel

- **Deployments** — логи билда
- **Functions** / **Logs** — runtime-логи API (`[blob] delete failed`, ошибки Prisma)
- **Storage → Blob** — список файлов, usage

### Neon

- **Monitoring** — connections, query load
- **Branches** — бэкапы, point-in-time restore

### Типичные ошибки

| Симптом | Причина | Решение |
|---------|---------|---------|
| Build fail на Vercel | Root Directory не `web` | Исправить в Settings |
| `No Output Directory named "public"` | Output Directory = `public` в Dashboard, или `nitro.hooks.compiled` в `nuxt.config` | Очистить Output Directory; не использовать `nitro.hooks.compiled` — он ломает генерацию `.vercel/output/config.json` |
| `PrismaClientInitializationError` | Неверный `DATABASE_URL` / нет SSL | Pooled URL + `sslmode=require` |
| `BLOB_NOT_CONFIGURED` | Нет токена Blob | Storage → Blob → connect / добавить env |
| 401 на `/api/agent/*` | Разные `AGENT_API_KEY` | Сверить Vercel и `desktop/.env` |
| Бот не отвечает | Webhook не зарегистрирован | `set-bot-webhooks.sh` |
| `Point not found` | Нет seed | `npm run db:seed` с prod URL |
| Too many DB connections | Direct URL вместо pooled | Переключить на pooler в Neon |
| T-Bank `certificate verify failed` | Нет Russian Trusted CA | Сертификаты в `web/certs/` (авто); при сбое — redeploy |

---

## 7. Безопасность

- **Не коммитить** `.env` — только `.env.example`
- `ADMIN_SECRET` и `AGENT_API_KEY` — длинные случайные строки (`openssl rand -hex 32`)
- Blob store: файлы заказов с `access: 'public'` — URL знает только тот, у кого есть `filePath` из API агента
- После печати файл удаляется из Blob
- Содержимое PDF **не логировать**

---

## 8. Стоимость (ориентир)

| Сервис | Free tier (на момент написания) |
|--------|-----------------------------------|
| Vercel Hobby | Бесплатно для личных/малых проектов |
| Neon Free | 0.5 GB storage, compute limits |
| Vercel Blob | Лимит по storage/transfer на Hobby |

Для пилота Sprint 0–1 free tier обычно достаточно. Следить за usage в дашбордах.

---

## Чеклист первого деплоя

- [ ] Neon project создан, pooled `DATABASE_URL` скопирован
- [ ] `npm run db:deploy` и `npm run db:seed` выполнены
- [ ] Vercel project: Root Directory = `web`
- [ ] Все env vars добавлены в Vercel
- [ ] Blob store создан и подключён к проекту
- [ ] Deploy успешен, `/api/health` отвечает `ok`
- [ ] Webhook ботов зарегистрирован (`set-bot-webhooks.sh`)
- [ ] `desktop/.env`: `SERVER_URL`, `AGENT_API_KEY`, `POINT_ID`
- [ ] E2E: PDF в бот → оплата в админке → печать агентом

---

## Связанные документы

- [ENV_SETUP.md](./ENV_SETUP.md) — все переменные окружения
- [web/README.md](../../web/README.md) — команды npm, API endpoints
- [project/PROJECT.md](../project/PROJECT.md) — архитектура
- [sprints/sprint-0/README.md](../sprints/sprint-0/README.md) — Sprint 0
