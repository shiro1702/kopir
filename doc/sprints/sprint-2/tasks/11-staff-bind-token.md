# 11 — Привязка staff-канала через `/bind`

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | ONB-09 |
| **Зависимости** | Sprint 0: `staff-notify`, terminal payment; Sprint 1: точка с `slug` |
| **Оценка** | 6–8 часов |

## Проблема

Сейчас уведомления сотрудникам и кнопки «Оплата получена» / «Печать» завязаны на глобальные env:

```env
STAFF_TELEGRAM_CHAT_ID="123456789"
STAFF_MAX_USER_ID="987654321"
```

Это работает для **одной точки на один деплой**, но не масштабируется:

- нужен redeploy при смене сотрудника;
- нельзя привязать **групповой чат** копицентра;
- при 2–3 партнёрах все заказы уходят в один канал;
- сотруднику сложно узнать свой `chat_id` / `user_id`.

**До этой задачи:** Sprint 1 продолжает использовать env (пилот одной точки).

## Цель

Партнёр или админ генерирует одноразовый токен → сотрудник в боте выполняет `/bind <token>` (или deep link `/start bind_<token>`) → канал сохраняется в БД и привязан к **конкретной точке** (`Point`).

Поддерживаемые каналы:

| Платформа | Куда биндим | Пример |
|-----------|-------------|--------|
| Telegram | личка или **групповой чат** | `chatId` (отрицательный для группы) |
| MAX | личка сотрудника | `userId` |

## Подзадачи

### Схема БД

- [ ] **11.1** Prisma: модель `StaffChannel`

  ```prisma
  enum MessengerPlatform {
    telegram
    max
  }

  model StaffChannel {
    id        String             @id @default(cuid())
    pointId   String
    point     Point              @relation(fields: [pointId], references: [id])
    platform  MessengerPlatform
    chatId    BigInt?            // Telegram: user или group
    userId    BigInt?            // MAX: user_id
    label     String?            // опционально: «Группа стойки»
    isActive  Boolean            @default(true)
    boundAt   DateTime           @default(now())

    @@unique([pointId, platform, chatId])
    @@unique([pointId, platform, userId])
  }
  ```

- [ ] **11.2** Prisma: модель `BindToken` (одноразовый токен привязки)

  ```prisma
  model BindToken {
    token     String    @id          // bind_a7k9m2
    pointId   String
    point     Point     @relation(...)
    purpose   String    @default("staff")
    expiresAt DateTime
    usedAt    DateTime?
    createdAt DateTime  @default(now())
  }
  ```

### Генерация токена

- [ ] **11.3** `POST /api/admin/points/[id]/bind-token` — создать токен (TTL 24 ч, `purpose=staff`)
- [ ] **11.4** Ответ: токен + deep link для TG: `https://t.me/<Bot>?start=bind_<token>`
- [ ] **11.5** Guard: `ADMIN_SECRET` (как у других admin routes)

### Команда `/bind` в ботах

- [ ] **11.6** `handleBind(platform, target, token, adapter)` в `bot/core.ts`
- [ ] **11.7** Telegram: `bot.command('bind', ...)` + обработка `/start bind_<token>` в существующем `start`
- [ ] **11.8** MAX: аналог в `max/handler.ts`
- [ ] **11.9** Валидация: токен существует, не истёк, не использован; `point` активна
- [ ] **11.10** Upsert `StaffChannel` для текущего `chatId` / `userId` + `pointId`
- [ ] **11.11** Ответ сотруднику: «Канал привязан к точке „{name}“»

### Уведомления и авторизация

- [ ] **11.12** `staff-notify.ts`: слать в **все активные** `StaffChannel` точки заказа (вместо env)
- [ ] **11.13** `telegram/bot.ts` callback: проверять `chatId` ∈ staff channels для `order.pointId`
- [ ] **11.14** `max/handler.ts` callback: проверять `userId` ∈ staff channels для точки
- [ ] **11.15** Fallback: если в БД нет каналов для точки — использовать `STAFF_TELEGRAM_CHAT_ID` / `STAFF_MAX_USER_ID` (dev и миграция)

### Документация

- [ ] **11.16** `ENV_SETUP.md`: env staff — legacy fallback, основной путь `/bind`
- [ ] **11.17** `BOT_MESSENGERS.md`: раздел про staff bind

## Критерии приёмки

- [ ] Админ создаёт токен для `point_bgu_1` → сотрудник `/bind bind_xxx` в TG → заказ с этой точки приходит в его чат
- [ ] Привязка **группового чата** TG: бот в группе, `/bind` → уведомления и кнопки работают в группе
- [ ] Заказ с `point_dev_1` **не** попадает в канал, привязанный к `point_bgu_1`
- [ ] Истёкший или повторно использованный токен — понятная ошибка
- [ ] Без привязки и без env — предупреждение в лог, уведомление пропускается (как сейчас)
- [ ] MAX: bind лички → уведомления и callback кнопки работают

## Безопасность

- Токен одноразовый (`usedAt` при успешном bind)
- TTL по умолчанию 24 часа
- Rate limit на `/bind` (опционально, не блокер)
- Не путать с токеном агента (`ONB-03` / `AGT-05`) — разные `purpose`

## Связь со спринтами

| Спринт | Роль |
|--------|------|
| Sprint 1 | env vars, одна точка, демо-оплата |
| **Sprint 2** | эта задача — перед подключением 2–3 партнёра |
| Sprint 3 | генерация bind-токена из partner dashboard (расширение 11.3) |

## Заметки

- Паттерн совпадает с `/start point_<slug>` (клиент) и токеном агента (`ONB-03`)
- Для пилота одной точки можно сгенерировать токен вручную через admin API без UI
- Sprint 3: кнопка «Привязать Telegram» в кабинете партнёра → тот же `BindToken`
