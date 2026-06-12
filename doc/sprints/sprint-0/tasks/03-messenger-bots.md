# 03 — Мультиканальные боты: Telegram + MAX

| | |
|---|---|
| **Статус** | ✅ done |
| **Feature** | WEB-08, WEB-14, WEB-15 |
| **Зависимости** | 01, 02, 04 |
| **Оценка** | 3–4 часа (Telegram) + 2–3 часа (MAX + core) |

## Цель

Пользователь отправляет PDF в **Telegram** или **MAX** → заказ `AWAITING_PAYMENT` → инструкция по оплате.  
Одна бизнес-логика; новые мессенджеры (VK, Viber) подключаются адаптерами без копипасты.

## Архитектура

См. [BOT_MESSENGERS.md](../../../project/BOT_MESSENGERS.md).

```
server/utils/bot/core.ts     ← handleStart, handlePdfDocument, notifyPaymentConfirmed
server/utils/telegram/bot.ts ← grammY
server/utils/max/handler.ts  ← MAX webhook
```

## Подзадачи

- [x] **3.1** grammY: `/start`, приём `message:document` (PDF)
- [x] **3.2** `server/utils/bot/core.ts` — общая логика заказа
- [x] **3.3** MAX: webhook `message_created` + `bot_started`, скачивание `type: file`
- [x] **3.4** Prisma: `User.maxUserId` (nullable), `telegramId` nullable
- [x] **3.5** `POST /api/bots/set-webhooks` — универсальная регистрация webhook
- [x] **3.6** `notifyPaymentConfirmed` — Telegram и/или MAX по полям пользователя
- [x] **3.7** Скрипт `web/scripts/set-bot-webhooks.sh`
- [ ] **3.8** E2E в MAX (нужен токен и деплой на HTTPS)

## Env

```env
TELEGRAM_BOT_TOKEN="..."
MAX_BOT_TOKEN="..."           # опционально
MAX_WEBHOOK_SECRET="..."      # рекомендуется для prod
```

## Webhook после деплоя

```bash
ADMIN_SECRET=xxx ./scripts/set-bot-webhooks.sh https://<app>.vercel.app
```

## Критерии приёмки

- [x] `/start` в Telegram отвечает за < 2 сек
- [x] PDF → Vercel Blob, Order в Neon
- [x] MAX: `bot_started` и файл `type: file` обрабатываются тем же core
- [x] Админка: пользователь помечен как TG или MAX
- [ ] E2E MAX на staging (ручной тест)

## Будущее

- WEB-16 VK-бот — тот же `core.ts`, новый `server/utils/vk/`
- WEB-09 мультиссылка QR — редирект на TG / MAX / VK
