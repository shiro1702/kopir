# 09 — Уведомление «Готово!» (polish + E2E)

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | UX-10 |
| **Зависимости** | 03 (WS complete), 06 (demo pay) |
| **Оценка** | 2–3 часа |

## Цель

После успешной печати клиент получает «Готово! Заберите документ» в том мессенджере, откуда отправил файл. Flow работает end-to-end через demo pay + WS.

## Текущее состояние

- `notifyPrintComplete` уже вызывается из `POST /api/agent/orders/[id]/complete`
- Текст: `formatPrintComplete` в `messages.ts`
- Нужен polish под demo pay и проверка обоих каналов

## Подзадачи

- [ ] **9.1** Обновить тексты под demo-режим:
  - `formatOrderReceived` / `formatQuote` — убрать «перевод на карту», если `DEMO_PAYMENT_ENABLED`
  - После demo pay — `formatPaymentConfirmed` → «Отправлено на печать»
  - `formatPrintComplete` — добавить hint про разделительный лист: «Ищите заказ #XXXXXX на выдаче»
- [ ] **9.2** Убедиться, что WS `job_complete` → тот же `complete.post` handler (или shared function) — уведомление не теряется
- [ ] **9.3** При `FAILED` — `notifyPrintFailed` (новая функция):
  ```
  «Не удалось напечатать заказ #XXXXXX. Обратитесь к сотруднику стойки.»
  ```
- [ ] **9.4** MAX: проверить доставку через `getMaxClient().sendMessage`
- [ ] **9.5** Не дублировать «Готово» при повторном complete (idempotent по статусу `PRINTED`)
- [ ] **9.6** Логировать channel delivery errors без содержимого файла

## Критерии приёмки

- [ ] PDF + demo pay + WS → «Готово!» в Telegram ≤ 5 сек после физической печати
- [ ] Тот же сценарий в MAX (если бот активен на точке)
- [ ] DOCX: quote → demo pay → print → «Готово!»
- [ ] FAILED → клиент получает сообщение об ошибке, не «Готово»

## Заметки

- Push «проблема с печатью» (UX-11) — Sprint 4
- VK-ветка — при добавлении WEB-16
