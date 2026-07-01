# Kopir — флоу бота: диаграмма, состояние, роадмап

> **Назначение:** единая карта взаимодействия пользователя с ботом (Telegram / MAX): команды, кнопки, условия показа, переходы.  
> **Код:** `web/server/utils/bot/`, адаптеры `telegram/`, `max/`.  
> **Обновлено:** 01.07.2026

### Визуальные схемы

| Формат | Файл | Как открыть |
|--------|------|-------------|
| **Интерактивная** (вкладки, zoom) | [bot-user-flow-diagram.html](./bot-user-flow-diagram.html) | `open doc/product/bot-user-flow-diagram.html` |
| **Картинка-обзор** | [bot-user-flow-overview.png](./bot-user-flow-overview.png) | для презентаций / Notion |
| **Живой чеклист** | [bot-user-flow-status.md](./bot-user-flow-status.md) | быстрое обновление статусов |

![Обзор флоу бота](./bot-user-flow-overview.png)

**Связанные документы:** [payment-flow.md](./payment-flow.md) · [batch-edit-flow.md](./batch-edit-flow.md) · [bot-point-selection.md](./bot-point-selection.md) · [point-availability.md](./point-availability.md) · [bot-support-flow.md](./bot-support-flow.md) · [BOT_MESSENGERS.md](../project/BOT_MESSENGERS.md) · [SPRINTS.md](../sprints/SPRINTS.md) · [ROADMAP.md](../roadmap/ROADMAP.md)

---

## Легенда статусов

| Маркер | Значение |
|--------|----------|
| ✅ | Реализовано и в проде / sandbox |
| 🟡 | Частично (код есть, E2E или полировка не закрыты) |
| ⬜ | Запланировано, в коде нет |
| ⏸ | Отложено (не ближайший спринт) |
| ❌ | Отменено / заменено другим решением |

В диаграммах узлы с суффиксом `(✅)` / `(🟡)` / `(⬜)` — **текущее состояние реализации**.

---

## Текущее состояние (снимок)

> Обновляй эту таблицу при закрытии спринтов. Детальный реестр фич: [FEATURES.md](../project/FEATURES.md).

| Блок | Статус | Спринт | Примечание |
|------|--------|--------|------------|
| `/start`, deep link `point_*` | ✅ | 0 | Привязка точки через `preferences` |
| `/bind` (staff) | ✅ | 2 | Токен из админки `/admin/points` |
| Сбор пачки (batch) | ✅ | 0.2 | До 5 файлов, `COLLECTING` |
| PDF + Word (.doc/.docx) | ✅ | 0.1 | Word → `CALCULATING` на агенте |
| Reply-клавиатура «Оплатить» / «Отменить» | ✅ | 0.2 | TG: reply; MAX: inline callback |
| Удаление файла из пачки | ✅ | 1 | Inline `batch_remove:*` |
| Статусные сообщения (edit + typing) | ✅ | 1 | Один messageId на файл |
| Выбор способа оплаты | ✅ | 1 | Перевод / на месте |
| Т-Банк СБП онлайн | 🟡 | 3 | Init/GetQr/webhook ✅; E2E sandbox ⬜ |
| «Готово!» после печати | 🟡 | 1 | Код частично; UX-10 не закрыт |
| Блокировка offline-точки | ⬜ | 1 | MON-02 |
| Повтор печати клиентом | ✅ | 1 | `order_retry:*` при сбое |
| Staff: подтверждение оплаты | ✅ | 0–1 | `staff_pay:*`, `staff_batch_confirm:*` |
| Staff: ручная печать при сбое | ✅ | 1 | `staff_manual_print:*` |
| Mini App / корзина | ⬜ | 4 | WEB-07 |
| VK / Viber бот | ⬜ | 5 | WEB-16, WEB-17 |
| AI FAQ в боте | ⏸ | — | AI-01 |

**Активный спринт:** [Sprint 3 — Т-Банк](../sprints/sprint-3/README.md) (sandbox).

---

## Роли и каналы

```mermaid
flowchart LR
  subgraph clients [Клиенты]
    U[Пользователь]
  end
  subgraph bots [Боты]
    TG[Telegram grammY]
    MAX[MAX Bot API]
  end
  subgraph core [Общее ядро]
    C[bot/core.ts]
    PH[payment-handlers]
    CB[client-callbacks]
  end
  subgraph staff [Сотрудник точки]
    ST[Staff-чат TG/MAX]
  end
  U --> TG & MAX
  TG & MAX --> C & PH & CB
  C --> ST
  PH --> ST
```

Один человек в TG и MAX = два `User` в БД (пилот). Staff привязывается к точке через `/bind bind_*`.

---

## Иерархия команд и действий

### Команды (текст)

| Команда | Кто | Условие | Действие | Статус |
|---------|-----|---------|----------|--------|
| `/start` | Клиент | всегда | Приветствие `MSG_START`, сохранить `point_slug` | ✅ |
| `/start point_<slug>` | Клиент | deep link / QR | Точка печати | ✅ |
| `/start bind_<token>` | Staff | токен из админки | Привязка `StaffChannel` к точке | ✅ |
| `/bind <token>` | Staff | альтернатива deep link | То же, что `bind_*` в `/start` | ✅ |
| Текст `✅ Оплатить` | Клиент | TG only; есть пачка `COLLECTING`; режим `ready` | `finalizeBatch` → выбор оплаты | ✅ |
| Текст `❌ Отменить пачку` | Клиент | TG; есть пачка `COLLECTING` | `cancelBatch` | ✅ |

### Reply-клавиатура (Telegram)

| Кнопка | Показать когда | Скрыть когда |
|--------|----------------|--------------|
| `✅ Оплатить` | `getBatchKeyboardMode === 'ready'` (нет файлов в `CALCULATING`) | `calculating` или пачки нет |
| `❌ Отменить пачку` | Всегда, пока пачка `COLLECTING` | После finalize / cancel |

MAX: те же действия через **inline** `batch_finalize` / `batch_cancel` (reply-клавиатуры нет).

### Inline-кнопки клиента (callback)

| Payload | Экран / контекст | Условие | Статус |
|---------|------------------|---------|--------|
| `batch_finalize` | Управление пачкой | MAX; пачка `COLLECTING`, mode `ready` | ✅ |
| `batch_cancel` | Управление пачкой | Пачка `COLLECTING` | ✅ |
| `batch_remove:{orderId}` | Сообщение файла | Пачка `COLLECTING`; order не `CALCULATING` | ✅ |
| `batch_remove_confirm:{orderId}` | Подтверждение удаления | После «Удалить» | ✅ |
| `batch_remove_cancel:{orderId}` | Отмена удаления | На экране confirm | ✅ |
| `pay_method:sbp_transfer:{id}` | После finalize | Метод в `paymentMethodsEnabled` + есть телефон | ✅ |
| `pay_method:on_site:{id}` | После finalize | Метод включён на точке | ✅ |
| `pay_method:tbank_online:{id}` | После finalize | Метод + `isTbankConfigured()` | 🟡 |
| `pay_claimed:{id}` | Инструкция перевода | Выбран `SBP_TRANSFER` | ✅ |
| `pay_change_method:{id}` | Любой способ до confirm | `AWAITING_PAYMENT`, нет `paymentConfirmedAt` | ✅ |
| `pay_check_status:{paymentId}` | Онлайн СБП | После Init Т-Банка | 🟡 |
| `order_retry:{orderId}` | Ошибка печати | Order в failed-состоянии | ✅ |

`{id}` = `orderId` или `batchId`.

### Inline-кнопки staff (callback)

| Payload | Когда показывается | Статус |
|---------|-------------------|--------|
| `staff_pay:{orderId}` | Клиент: перевод + «Я оплатил» **или** on-site выбран | ✅ |
| `staff_batch_confirm:{batchId}` | То же для пачки | ✅ |
| `staff_print:{orderId}` | Legacy двухшаговый on-site (если включён) | ✅ |
| `staff_retry_print:{orderId}` | Сбой автопечати | ✅ |
| `staff_manual_print:{orderId}` | Staff распечатал вручную | ✅ |

Staff callback маршрутизируется только если payload **не** клиентский (`staff-auth.ts`).

---

## Главная диаграмма: клиентский флоу

```mermaid
stateDiagram-v2
    direction TB

  [*] --> Idle: /start (✅)

  Idle --> Collecting: отправить PDF/Word (✅)

  state Collecting {
    [*] --> FileReceiving
    FileReceiving --> FileReady: upload OK, PDF (✅)
    FileReceiving --> FileCalculating: upload OK, Word (✅)
    FileCalculating --> FileReady: агент посчитал (✅)
    FileReceiving --> FileError: upload fail (✅)
    FileCalculating --> FileError: CALCULATION_FAILED (✅)
    FileReady --> FileReady: ещё файл (≤5) (✅)
    FileReady --> FileRemoved: 🗑 удалить (✅)
    FileRemoved --> FileReady: новый файл
    FileReady --> CollectingBlocked: лимит 5 файлов (✅)
  }

  Collecting --> AwaitingPayment: Оплатить / batch_finalize (✅)
  Collecting --> Cancelled: Отменить пачку (✅)
  Cancelled --> Idle: MSG_BATCH_CANCELLED

  state AwaitingPayment {
    [*] --> ChooseMethod
    ChooseMethod --> TransferPending: перевод СБП (✅)
    ChooseMethod --> OnSitePending: на месте (✅)
    ChooseMethod --> OnlinePending: Т-Банк СБП (🟡)
    TransferPending --> StaffConfirm: клиент «Я оплатил» (✅)
    OnSitePending --> StaffConfirm: staff уведомлён сразу (✅)
    OnlinePending --> Paid: webhook / проверить оплату (🟡)
    ChooseMethod --> ChooseMethod: другой способ (✅)
    TransferPending --> StaffConfirm: staff confirm
    OnSitePending --> StaffConfirm: staff confirm
  }

  StaffConfirm --> Paid: staff_pay / staff_batch_confirm (✅)
  Paid --> Printing: startOrderPrint (✅)

  state Printing {
    [*] --> InQueue
    InQueue --> Done: успех (✅)
    InQueue --> PrintFailed: ошибка агента (✅)
    PrintFailed --> InQueue: order_retry / auto-retry (✅)
  }

  Done --> [*]: Готово! (🟡)
  PrintFailed --> [*]: сообщение + retry (✅)
```

### Условия переходов (кратко)

| Из | В | Условие |
|----|---|---------|
| `Idle` | `Collecting` | Документ PDF/Word; точка резолвится по `point_slug` |
| `Collecting` | `Collecting` | `activeCount < BATCH_MAX_FILES` (default 5) |
| `Collecting` | `AwaitingPayment` | Все order ≠ `CALCULATING`; `finalizeBatch` OK |
| `Collecting` | `Cancelled` | `batch_cancel` или таймаут `BATCH_BUILD_TIMEOUT_MIN` (15 мин) |
| `AwaitingPayment` | `Paid` | `paymentConfirmedAt` (staff или webhook Т-Банка) |
| `Paid` | `Printing` | Агент online **или** заказ в очереди (offline → 🟡 предупреждение) |
| `Printing` | `Done` | Агент: `COMPLETED` / уведомление клиенту |

---

## Диаграмма: сбор файла (детально)

```mermaid
flowchart TD
  A[Пользователь отправил документ] --> B{Тип файла?}
  B -->|PDF| C[Order AWAITING_PAYMENT]
  B -->|Word| D[Order CALCULATING]
  B -->|другое| E[MSG_UNSUPPORTED_FILE]

  C --> F["📥 Принимаю… → edit"]
  D --> F
  F --> G{Upload Blob}
  G -->|fail| H[edit: ошибка]
  G -->|ok PDF| I["edit: 📎 Файл готов + 🗑"]
  G -->|ok Word| J["edit: ⏳ Считаем…"]
  J --> K{Агент calculation}
  K -->|ok| I
  K -->|fail| L["edit: ❌ + 🗑"]

  I --> M{keyboardMode}
  M -->|ready| N["Reply/inline: ✅ Оплатить + ❌ Отменить"]
  M -->|calculating| O["Только ❌ Отменить"]

  style C fill:#e8f5e9
  style D fill:#fff3e0
  style E fill:#ffebee
```

**Показать `🗑 Удалить`:** order в пачке `COLLECTING`, статус не `CALCULATING`.  
**Скрыть `✅ Оплатить`:** хотя бы один файл в `CALCULATING`.

---

## Диаграмма: оплата

```mermaid
flowchart TD
  subgraph finalize [После «Оплатить» ✅]
    F1[formatBatchSummary]
    F2[formatPaymentMethodChoice]
    F3[inline: методы из Point.paymentMethodsEnabled]
  end

  F1 --> F2 --> F3

  F3 --> M1[📱 Перевод]
  F3 --> M2[💳 На месте]
  F3 --> M3[💳 Онлайн СБП 🟡]

  M1 --> T1[Реквизиты + Я оплатил]
  M2 --> T2[Инструкция на стойку]
  M3 --> T3[QR URL + Проверить оплату]

  T1 -->|pay_claimed| ST1[Staff: проверьте банк ✅]
  T2 --> ST2[Staff: клиент идёт на стойку ✅]
  T3 -->|webhook| PAID[PAID + печать 🟡]

  ST1 --> CONF[staff_pay / staff_batch_confirm]
  ST2 --> CONF
  CONF --> PAID

  PAID --> PRINT[Агент печатает ✅]

  style M3 fill:#fff9c4
  style PAID fill:#e8f5e9
```

Фильтрация методов (`payment-config.ts`):

- `SBP_TRANSFER` — только если задан `transferPhone` (точка или env)
- `TBANK_ONLINE` — только если настроен Т-Банк (sandbox/prod keys)
- `ON_SITE` — всегда, если включён в списке

---

## Диаграмма: staff (параллельный флоу)

```mermaid
sequenceDiagram
  participant C as Клиент
  participant B as Бот
  participant ST as Staff-чат
  participant A as Агент

  Note over C,A: Перевод СБП (✅)
  C->>B: выбор перевода
  C->>B: Я оплатил
  B->>ST: Проверьте приложение банка
  ST->>B: Оплата получена
  B->>C: Оплата принята
  B->>A: print job

  Note over C,A: На месте (✅)
  C->>B: выбор на месте
  B->>ST: Клиент идёт на стойку
  ST->>B: Оплатить пачку / Оплата получена
  B->>A: print job

  Note over C,A: Т-Банк (🟡)
  C->>B: Онлайн СБП
  C->>B: оплата в банке
  B->>B: webhook succeeded
  B->>A: print job (без staff)
```

Fallback staff-канала: env `STAFF_TELEGRAM_CHAT_ID` / `STAFF_MAX_USER_ID`, если нет `StaffChannel` в БД.

---

## Статусы в БД (для привязки к UI)

### OrderBatch

| Статус | Что видит клиент | Доступные действия |
|--------|------------------|-------------------|
| `COLLECTING` | Слоты файлов, reply/inline управление | Файлы, удалить, оплатить, отменить |
| `AWAITING_PAYMENT` | Сводка + выбор оплаты | Методы оплаты, смена способа |
| `PAID` | «Оплата принята» | — (ждёт печать) |
| `CANCELLED` | «Пачка отменена» | `/start`, новый файл |

### Order (внутри пачки)

| Статус | UI |
|--------|-----|
| `AWAITING_PAYMENT` | PDF готов, цена посчитана |
| `CALCULATING` | «Считаем страницы…», без 🗑 |
| `CALCULATION_FAILED` | Ошибка + 🗑 |
| `PAID` / `PRINTING` / `COMPLETED` / `FAILED` | После оплаты; retry при FAILED |

---

## Роадмап UX бота

Синхронизировано с [ROADMAP.md](../roadmap/ROADMAP.md) и [SPRINTS.md](../sprints/SPRINTS.md).

### Ближайшие спринты

| Спринт | UX в боте | Статус |
|--------|-----------|--------|
| **3** Т-Банк | Кнопка «Оплатить СБП», webhook → автопечать, «Проверить оплату» | 🟡 |
| **3** | Облачная касса — чек в мессенджер | ⏸ PAY-04 |
| **4** Онбординг | Mini App: загрузка, превью PDF, корзина | ⬜ |
| **4** | Статичная карта точек, выбор точки в боте | ⬜ WEB-10 |
| **5** К 1 сентября | «Готово!» стабильно; «Проблема с печатью» | ⬜ UX-10, UX-11 |
| **5** | VK-бот, мультиссылка QR `/go?point=` | ⬜ WEB-16, WEB-09 |

### Средний горизонт (после MVP)

| Фича | Описание | Feature |
|------|----------|---------|
| Калькулятор в реальном времени | Ч/Б, дуплекс, копии до оплаты | UX-01–04 |
| Выбор точки | Геолокация, ручной номер | UX-06, UX-07 |
| Статус печати live | «3 из 15 стр.» | UX-09 |
| Таймаут неоплаченных | Напоминание + автоотмена 30 мин | payment-flow фаза 2 |
| Блок offline-точки | Не принимать заказ, если агент offline | MON-02 |
| AI FAQ | Groq в боте | ⏸ AI-01 |

### Отменено / backlog

| Было | Решение |
|------|---------|
| WebSocket в Sprint 1 | ❌ → polling + `lastSeenAt` (достаточно для 1–3 точек) |
| Демо-оплата без денег | ❌ cancelled — есть ручная оплата |
| Команды `/udalit N` | ⏸ — inline 🗑 достаточно для MVP |
| «Моя пачка» (сводка) | ⏸ — лента сообщений + Mini App позже |

---

## Календарь (июль – сентябрь 2026)

| Период | Фокус бота |
|--------|------------|
| **Июль, нед. 1** | Закрыть Sprint 3 sandbox E2E (10+ платежей) |
| **Июль, нед. 2–3** | Sprint 2 хвосты: `/bind` в проде на 2–3 точках |
| **Август** | Sprint 4: Mini App, partner-facing UX |
| **До 1 сент.** | 5+ точек, «Готово!», VK deep link в QR |
| **Сентябрь+** | Рост, принт-бокс сценарии (отдельный агент) |

---

## Как обновлять этот документ

1. **Снимок «Текущее состояние»** — при merge фичи или закрытии спринта.
2. **Маркеры на диаграммах** — менять `(✅)` → `(🟡)` → `(⬜)` у соответствующих узлов.
3. **Новый callback** — добавить строку в таблицу «Inline-кнопки» + ветку в mermaid.
4. **Реестр фич** — дублировать статус в [FEATURES.md](../project/FEATURES.md) (источник правды по ID).

### Чеклист при изменении `bot/core.ts` или `keyboards.ts`

- [ ] Таблица команд / callbacks
- [ ] Условия reply-клавиатуры
- [ ] Диаграмма оплаты (если новый `pay_*`)
- [ ] Снимок статуса вверху файла
- [ ] [payment-flow.md](./payment-flow.md) — если меняется бизнес-логика оплаты

---

## Файлы в репозитории

```
web/server/utils/bot/
  core.ts              # handleStart, handleDocument, batch, remove
  payment-handlers.ts  # выбор оплаты, Т-Банк UI
  client-callbacks.ts  # маршрутизация inline
  keyboards.ts         # payload-ы кнопок
  messages.ts          # тексты RU
web/server/utils/telegram/bot.ts
web/server/utils/max/handler.ts
web/server/utils/staff-actions.ts
web/server/utils/staff-notify.ts
```
