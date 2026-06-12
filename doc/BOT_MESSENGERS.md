# Kopir — мультиканальные боты (мессенджеры)

> Единая бизнес-логика ботов + тонкие адаптеры под каждый мессенджер.  
> Новый канал (VK, Viber, WhatsApp) = новый адаптер, без дублирования заказов и оплаты.

## Зачем

Пользователь может прийти из любого мессенджера, популярного в РФ:

| Канал | Статус | Библиотека / API |
|-------|--------|------------------|
| **Telegram** | ✅ Sprint 0 | [grammY](https://grammy.dev) |
| **MAX** | ✅ Sprint 0 | [MAX Bot API](https://dev.max.ru/docs-api) |
| **VK** | ⬜ Этап 3–4 | [VK Bots Long Poll / Callback](https://dev.vk.com/api/bots/getting-started) |
| **Viber** | ⬜ Этап 4 | Viber REST API |
| **Web / PWA** | ⬜ Sprint 2 | тот же REST API заказов |

Все каналы ведут в **один** Nitro-бэкенд, одну БД и один агент печати.

## Архитектура

```
                    ┌─────────────────────────────────────┐
                    │  server/utils/bot/                  │
                    │  core.ts      — заказы, PDF, оплата │
                    │  messages.ts  — тексты на русском   │
                    │  preferences.ts — point_slug        │
                    └──────────────┬──────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
  telegram/bot.ts           max/handler.ts            vk/bot.ts (будущее)
  grammY webhook            REST webhook              Callback API
         │                         │                         │
         ▼                         ▼                         ▼
/api/telegram/webhook      /api/max/webhook           /api/vk/webhook
```

### Контракт адаптера

Каждый мессенджер реализует:

1. **Webhook** — `POST /api/<platform>/webhook`
2. **Set webhook** — `POST /api/<platform>/set-webhook` (защищён `ADMIN_SECRET`)
3. **Отправка текста** — через API платформы
4. **Скачивание файла** — из входящего сообщения в `Buffer`

Общие обработчики в `core.ts`:

| Функция | Что делает |
|---------|------------|
| `handleStart` | Приветствие, привязка `point_slug` |
| `handlePdfDocument` | PDF → Blob → Order `AWAITING_PAYMENT` |
| `notifyPaymentConfirmed` | Уведомление в тот мессенджер, откуда пришёл пользователь |

### Универсальная установка webhook

Один вызов регистрирует все настроенные боты (пропускает каналы без токена в env):

```bash
curl -X POST "https://<app>.vercel.app/api/bots/set-webhooks" \
  -H "Authorization: Bearer $ADMIN_SECRET"
```

Скрипт:

```bash
cd web
ADMIN_SECRET=xxx ./scripts/set-bot-webhooks.sh https://<app>.vercel.app
```

## Модель пользователя (Prisma)

Сейчас — **отдельное nullable-поле на платформу**:

```prisma
model User {
  telegramId BigInt? @unique
  maxUserId  BigInt? @unique
  // vkUserId  BigInt? @unique  — при добавлении VK
}
```

Один человек в двух мессенджерах = два `User` (допустимо на пилоте).

**План на этап 3** (при 3+ каналах): рефакторинг в `messengerPlatform` + `messengerUserId` с `@@unique([messengerPlatform, messengerUserId])` и опциональная склейка аккаунтов.

## Переменные окружения

| Переменная | Платформа | Обязательность |
|------------|-----------|----------------|
| `TELEGRAM_BOT_TOKEN` | Telegram | если нужен TG-бот |
| `MAX_BOT_TOKEN` | MAX | если нужен MAX-бот |
| `MAX_WEBHOOK_SECRET` | MAX | рекомендуется в prod |
| `VK_BOT_TOKEN` | VK | будущее |
| `VK_CONFIRMATION_SECRET` | VK | будущее |

Подробнее: [ENV_SETUP.md](./ENV_SETUP.md).

## Как добавить новый мессенджер (чеклист)

Пример: **VK-бот** на этапе 3–4.

1. **Prisma** — поле `vkUserId BigInt? @unique` (или общая схема `MessengerPlatform`)
2. **`server/utils/vk/`** — клиент API + `handler.ts`, маппинг событий → `handleStart` / `handlePdfDocument`
3. **`server/api/vk/webhook.post.ts`** + `set-webhook.post.ts`
4. **`nuxt.config.ts`** — `vkBotToken`, `vkConfirmationSecret` в `runtimeConfig`
5. **`server/api/bots/set-webhooks.post.ts`** — блок регистрации VK
6. **`notifyPaymentConfirmed`** — ветка отправки через VK API
7. **Документация** — строка в этой таблице + `FEATURES.md` WEB-16 → ✅
8. **QR / мультиссылка** — добавить deep link VK в редиректор (WEB-09)

Бизнес-логику в `core.ts` **не трогаем** — только адаптер.

## Deep link точки печати

| Платформа | Формат |
|-----------|--------|
| Telegram | `https://t.me/BotName?start=point_bgu_smolina` |
| MAX | `payload` в событии `bot_started` (если настроен в кабинете) |
| VK | `vk.me/club123?ref=point_bgu_smolina` (план) |
| Универсальный QR | редиректор `/go?point=...` → выбор мессенджера (WEB-09) |

Пока без QR-редиректора используется дефолтная точка `point_dev_1`.

## Файлы в репозитории

```
web/server/utils/bot/       # общая логика
web/server/utils/telegram/  # grammY
web/server/utils/max/       # MAX Bot API
web/server/api/bots/        # set-webhooks (все каналы)
web/server/api/telegram/
web/server/api/max/
web/scripts/set-bot-webhooks.sh
```

## Связанные документы

- [FEATURES.md](./FEATURES.md) — WEB-08, WEB-14–17
- [ENV_SETUP.md](./ENV_SETUP.md) — токены и webhook
- [sprints/sprint-0/tasks/03-messenger-bots.md](./sprints/sprint-0/tasks/03-messenger-bots.md) — задача спринта
