# Kopir — контекст проекта для Cursor

> **Назначение файла:** единая точка правды о продукте, стеке и архитектуре. Читай этот документ в начале любой сессии, прежде чем писать код.

## Что это

**Kopir** — SaaS-платформа self-service печати для копировальных центров и автономных принт-боксов.

Пользователь загружает документ через **Telegram Mini App** или **веб-сайт**, настраивает параметры, оплачивает (**СБП / Т-Банк**), принтер печатает автоматически. Владелец точки видит дашборд и получает уведомления в Telegram.

**Стартовый рынок:** Улан-Удэ (БГУ, ВСГУТУ, БГСХА и др. — ~30–40 тыс. студентов).  
**Модель запуска:** сначала софт на ПК копицентра (0 ₽ железа), потом собственные боксы.

## Ключевые решения (уже приняты)

| Тема | Решение |
|------|---------|
| Архитектура | Monorepo: `web/` (Nuxt) + `desktop/` (Python) |
| Фронт + API | **Nuxt 3 + Nitro** — один проект: сайт, Mini App, REST/WebSocket API |
| Десктоп-агент | **Python** (PySide6 GUI → `.exe` для Windows копицентров) |
| БД облако | **PostgreSQL (Neon)** + **Prisma** |
| Файлы заказов (PDF) | **Vercel Blob** (не локальный диск на serverless) |
| Кэш / heartbeat | **Redis** (статусы принтеров, TTL-коды) — с Sprint 1 |
| БД на устройстве | **SQLite** (очередь офлайн, локальные настройки) |
| Платежи MVP | **Т-Банк** (СБП через API эквайринга) |
| AI (опционально) | **Groq** — FAQ, классификация документов |
| UI | Tailwind + shadcn-vue / мобильный first |
| Юр. модель | **Агентский договор** (ИП УСН 6%), налог только с комиссии платформы |
| Старт без железа | Python `.exe` на ПК партнёра вместо Orange Pi |
| Разделитель заказов | Умный разделительный лист, toggle `USE_SEPARATOR_PAGE` |
| Безопасность бокса | Печать только после сканирования QR на корпусе (не сразу после оплаты) |
| Файлы | PDF в **Vercel Blob**; конвертация в облаке; автоудаление после печати |
| Чеки | Облачная касса (ФЗ-54) |

## Структура репозитория

```
kopir/
├── web/                 # Nuxt 3: сайт, Mini App, Nitro API, админки
├── desktop/             # Python: агент печати для Windows (копицентры / боксы)
├── doc/
│   ├── PROJECT.md       # ← этот файл
│   ├── FEATURES.md      # фичи со статусами
│   ├── ROADMAP.md       # этапы продукта
│   ├── SPRINTS.md       # задачи по спринтам
│   └── brainstorm/      # исходный брейншторм
└── .cursorrules         # правила для AI (создать при старте кода)
```

## Архитектура

```
[ Пользователь ]
   │  Telegram Mini App, MAX bot / Web / Bot
   ▼
[ Nuxt 3 + Nitro ]  ←→  Neon (PostgreSQL) + Vercel Blob
   │                    Redis — с Sprint 1
   │  WebSocket / HTTP
   ▼
[ Desktop Agent (Python) ]  — Windows ПК копицентра
   │  или Orange Pi / мини-ПК в боксе
   ▼
[ Принтер ]
```

### Поток заказа (happy path)

1. Пользователь сканирует QR точки → открывается Mini App с `point_id`
2. Загружает файл → сервер конвертирует в PDF, считает страницы
3. Выбирает параметры (Ч/Б, дуплекс, копии, страницы) → видит цену
4. Оплачивает через СБП (Т-Банк webhook)
5. Сервер шлёт задание агенту по WebSocket
6. Агент печатает (+ опционально разделительный лист)
7. Агент отчитывается: `printed` / `error` / `partial`
8. Бот (Telegram / MAX / …) уведомляет пользователя: «Готово!» / возврат при ошибке

### Роли

| Роль | Доступ |
|------|--------|
| **User** | Mini App, бот, заказы, поддержка |
| **Partner** | Дашборд своей точки, вывод средств, пауза приёма заказов |
| **Super-admin** | Вся сеть, GMV, комиссии, тарифы, партнёры |

## Бизнес-модели

1. **Revenue Share 80/20** — старт с копицентрами (платформа 20%, партнёр 80%)
2. **SaaS** — ~2 500 ₽/мес за принтер для крупных сетей
3. **Собственные боксы** — 100% выручки, ~33 000 ₽ CapEx на точку

**Выплаты MVP:** еженедельно вручную по СБП → позже Mass Payments API.

## Ценообразование (ориентир Улан-Удэ)

- Ч/Б А4: **15 ₽/стр** (себестоимость ~1,5 ₽)
- Динамическая лесенка (позже): 1–3 стр. дороже, от 20 стр. — скидка

## Технологии по слоям

### Web (`web/`)

- **Nuxt 3** (SPA-режим для Mini App)
- **Nitro** — API routes в `server/api/`
- **Prisma** + **Neon** (PostgreSQL)
- **Vercel Blob** (`@vercel/blob`) — хранение PDF заказов
- **Redis** — heartbeat, коды печати (Sprint 1+)
- **Telegram WebApp SDK** — initData, MainButton
- **pdf-lib / pdf-parse** — анализ PDF на сервере
- **LibreOffice headless** или CloudConvert — DOCX→PDF
- **Socket.io / Nitro WebSocket** — связь с агентами
- **Leaflet** — карта точек (MVP), позже Яндекс.Карты
- **Т-Банк API** — Init, GetQr, webhook
- **Мессенджер-боты** — общее ядро `server/utils/bot/core.ts` + адаптеры (Telegram grammY, MAX Bot API; VK — план). См. [BOT_MESSENGERS.md](./BOT_MESSENGERS.md)

### Desktop (`desktop/`)

- **Python 3.11+**
- **PySide6** — GUI дашборд партнёра
- **PyInstaller** — сборка `kopir-agent.exe`
- **pywin32** — очередь печати Windows
- **SumatraPDF CLI** или **pdf2printer** — тихая печать PDF
- **websockets / aiohttp** — связь с Nitro
- Windows Service / автозагрузка + сворачивание в трей

### Box / Orange Pi (этап 3+)

- **Linux** + **CUPS** (`lp`)
- **hostapd + dnsmasq** — локальный Wi-Fi (опционально)
- **SQLite** — локальная очередь
- Read-only root FS, `/tmp` RAM-disk для PDF
- Ethernet предпочтительнее 4G/SIM

### Инфра

**Staging / пилот (Sprint 0–1):**

| Слой | Сервис |
|------|--------|
| Хостинг API + фронт | **Vercel** (Nuxt 3, `nitro.preset: 'vercel'`) |
| БД | **Neon** free tier → `DATABASE_URL` |
| PDF-файлы | **Vercel Blob** → `BLOB_READ_WRITE_TOKEN` |
| Telegram webhook | `https://<app>.vercel.app/api/telegram/webhook` |
| MAX webhook | `https://<app>.vercel.app/api/max/webhook` |
| Все webhooks разом | `POST /api/bots/set-webhooks` |

Локальная разработка использует те же Neon + Blob (токены в `web/.env`), не папку `uploads/` — на Vercel диск не персистентный.

**Продакшен (Sprint 2+):**

- **Vercel** — Mini App, REST, бот (polling агента ок; WebSocket — ограниченно)
- **VPS** — когда нужен стабильный WebSocket агент ↔ сервер (Sprint 1+)
- **Upstash** — managed Redis (heartbeat)
- Облачная касса: АТОЛ Онлайн / Orange Data

**Деплой на Vercel (чеклист):**

1. Создать проект Neon → скопировать `DATABASE_URL` (connection string с `?sslmode=require`)
2. В Vercel: Storage → Blob → создать store → `BLOB_READ_WRITE_TOKEN`
3. Root Directory = `web`, Framework = Nuxt
4. Env: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `TELEGRAM_BOT_TOKEN`, `MAX_BOT_TOKEN` (опц.), `ADMIN_SECRET`, `AGENT_API_KEY`
5. После первого деплоя: `npx prisma migrate deploy` + `npx prisma db seed` (локально с prod `DATABASE_URL`)
6. Установить webhooks: `POST /api/bots/set-webhooks` или `./scripts/set-bot-webhooks.sh`
7. В `desktop/.env`: `SERVER_URL=https://<app>.vercel.app`

## Ограничения и риски (учитывать в коде)

- VPN на телефоне ломает локальный Wi-Fi — предупреждение в UI
- DOCX может «поехать» при конвертации — превью + дисклеймер
- Антивирусы блокируют `.exe` — инструкция по исключениям
- ФЗ-152: не хранить файлы дольше печати / 24 ч
- Агентский договор обязателен до масштабирования выплат
- Сезонность: пик сент–июнь, спад июль–август

## Конкуренты

Тяжёлые вендинговые киоски (Копиркин, Printme) — дорого, устаревший UX.  
Наше УТП: **«экран в кармане»** — Mini App вместо тачскрина на автомате.

## Связанные документы

- [FEATURES.md](./FEATURES.md) — статусы фич
- [BOT_MESSENGERS.md](./BOT_MESSENGERS.md) — мультиканальные боты, как добавить VK
- [ROADMAP.md](./ROADMAP.md) — этапы 1–4
- [SPRINTS.md](./SPRINTS.md) — текущие задачи
- [brainstorm/11.06.2026.md](./brainstorm/11.06.2026.md) — полный брейншторм

## Именование в коде

- `point` / `location` — точка печати (копицентр или бокс)
- `agent` — десктоп/бокс клиент
- `order` / `job` — заказ на печать
- `partner` — владелец точки
