# 07 — Количество копий в боте (UX-04)

| | |
|---|---|
| **Спринт** | 5 |
| **Статус** | ✅ done |
| **Приоритет** | P1 |
| **Feature** | UX-04 |
| **Зависимости** | batch-edit-flow ✅, онлайн-оплата ✅ |
| **Оценка** | 1–1.5 дня |

## Проблема

Клиент всегда печатает **один экземпляр** всего файла. Для заявлений, договоров и справок типичны 2–3 копии — сейчас приходится дублировать файл в пачке или печатать вручную у партнёра.

## Цель

До оплаты клиент меняет **количество копий** (1–10) на каждый файл. Цена и печать учитывают `pageCount × copies`.

## Scope

### Модель и API

- [ ] **7.1** Prisma: `Order.copies Int @default(1)`
- [ ] **7.2** Helper `order-pricing.ts`: `billablePages`, `computeOrderAmountKopeks`
- [ ] **7.3** `updateOrderCopies(orderId, userId, copies)` в `batch.ts`
- [ ] **7.4** `PATCH /api/batches/:batchId/orders/:orderId` `{ copies }` — для Mini App позже

### Бот (TG + MAX)

- [ ] **7.5** Inline-кнопки `−` / `N коп.` / `+` на сообщении готового файла
- [ ] **7.6** Callbacks `order_copies_dec/inc:{orderId}` — только в `COLLECTING`, статус `AWAITING_PAYMENT`
- [ ] **7.7** Тексты: `5 стр. × 2 копии = 10`, пересчёт суммы пачки

### Агент

- [ ] **7.8** `copies` в print queue API
- [ ] **7.9** SumatraPDF / `lp` / Word `PrintOut(Copies=N)`

### Смежное

- [ ] **7.10** Partner stats, admin, описание платежа Т-Банк — billable pages
- [ ] **7.11** Unit-тесты pricing + updateOrderCopies

## Не в scope

- Диапазон страниц (FILE-05) → [Sprint 6 / 04](../../sprint-6/tasks/04-page-range.md)
- Дуплекс, ч/б (UX-02, UX-03) → Sprint 6 Mini App
- UI копий в Mini App (API готов)

## DoD

- [ ] PDF 5 стр. × 3 копии → цена ×3 в боте до оплаты
- [ ] После оплаты агент печатает 3 экземпляра
- [ ] MAX и Telegram: одинаковое поведение
- [ ] Нельзя менять копии во время `CALCULATING` и после «Оплатить»

## Связанные задачи

- [batch-edit-flow.md](../../../product/batch-edit-flow.md)
- Sprint 6: [02-print-miniapp.md](../../sprint-6/tasks/02-print-miniapp.md) — reuse API
- Sprint 6: [04-page-range.md](../../sprint-6/tasks/04-page-range.md) — backlog
