# Sprint 0.1 — «DOCX: подсчёт и оплата»

| | |
|---|---|
| **Период** | после закрытия Sprint 0 (~19–25 июня 2026, 1 неделя) |
| **Цель** | Клиент шлёт `.doc`/`.docx` → агент считает листы в Word → бот показывает цену → после оплаты печать |
| **Этап roadmap** | [Этап 1 — Ручной пилот](../../roadmap/ROADMAP.md#этап-1--ручной-пилот-proof-of-concept) |
| **Feature IDs** | FILE-01, FILE-10, FILE-11, AGT-14, AGT-15, WEB-03 |
| **Документация** | [product/docx-conversion.md](../../product/docx-conversion.md) |

## Definition of Done

- [ ] `.docx` из Telegram/MAX → статус `CALCULATING` → через ≤ 20 сек клиент видит «N страниц, X ₽»
- [ ] После «Оплачено» в админке — Word печатает тот же файл
- [ ] PDF-flow не сломан (как в Sprint 0)
- [ ] 3 успешных docx-заказа подряд на Windows с MS Word
- [ ] При отсутствии Word — понятная ошибка клиенту, статус `CALCULATION_FAILED`

## Архитектура

```
[ Telegram / MAX ] ──docx──► [ Nuxt/Nitro ]
         │                        │
         │                   CALCULATING
         │                        │
         └◄── «15 стр, 150 ₽» ────┤◄── POST /calculation
                                  │
                    poll ◄────────┘
              [ Python + Word ]
                    │
              count → AWAITING_PAYMENT
              print → (после PAID)
```

**Вне скоупа 0.1:** Mini App, Т-Банк, LibreOffice на сервере, preview, дуплекс, цвет.

**Позже:** VPS + Gotenberg → см. [docx-conversion.md](../../product/docx-conversion.md#будущее-свой-сервер--libreoffice).

## Задачи

| # | Задача | Статус | Файл |
|---|--------|--------|------|
| 01 | Prisma: статусы + mimeType | ✅ | [tasks/01-schema-docx-statuses.md](./tasks/01-schema-docx-statuses.md) |
| 02 | Бот: приём doc/docx | ✅ | [tasks/02-bot-accept-docx.md](./tasks/02-bot-accept-docx.md) |
| 03 | API: очередь CALCULATING + calculation | ✅ | [tasks/03-api-calculation.md](./tasks/03-api-calculation.md) |
| 04 | Агент: Word page count (pywin32) | ✅ | [tasks/04-agent-word-count.md](./tasks/04-agent-word-count.md) |
| 05 | Агент: печать docx через Word | ✅ | [tasks/05-agent-word-print.md](./tasks/05-agent-word-print.md) |
| 06 | Бот: сообщение с ценой + уведомления | ✅ | [tasks/06-bot-price-message.md](./tasks/06-bot-price-message.md) |
| 07 | E2E: docx → цена → оплата → печать | ⬜ | [tasks/07-e2e-docx.md](./tasks/07-e2e-docx.md) |

## Порядок выполнения

```
01 ──► 02 ──► 03 ──► 04 ──► 06
                    │
                    └──► 05 ──► 07
```

## Окружение (дополнительно к Sprint 0)

### `web/.env`

```env
PRICE_PER_PAGE_KOPEKS=1000   # 10 ₽ за страницу (пилот)
CALCULATION_TIMEOUT_SEC=120  # CALCULATING → CALCULATION_FAILED
```

### `desktop/.env`

```env
# Windows only for docx in Sprint 0.1
USE_WORD=true
```

### `desktop/requirements.txt` (Windows)

```
pywin32>=306; sys_platform == "win32"
```

## Ежедневный чеклист

| День | Фокус |
|------|-------|
| Д1 | 01, 02 |
| Д2 | 03, 04 |
| Д3 | 05, 06 |
| Д4 | 07, ретро |

## Ретро

Шаблон в [SPRINTS.md](../SPRINTS.md#ретро-шаблон).

## После спринта

→ [Sprint 1 — Бета в копицентре](../SPRINTS.md#sprint-1--бета-в-копицентре) (WebSocket, разделительный лист)
