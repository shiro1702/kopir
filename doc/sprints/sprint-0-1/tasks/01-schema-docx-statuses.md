# 01 — Prisma: статусы и mimeType

| | |
|---|---|
| **Статус** | ✅ done |
| **Feature** | FILE-10 |
| **Зависимости** | Sprint 0 закрыт |
| **Оценка** | 1–2 часа |

## Цель

Расширить модель заказа для двухфазного flow: подсчёт → оплата → печать.

## Подзадачи

- [ ] **1.1** Добавить в `OrderStatus`:
  ```prisma
  CALCULATING
  CALCULATION_FAILED
  ```
  (между созданием и `AWAITING_PAYMENT`)

- [ ] **1.2** Поле `mimeType String?` на `Order`

- [ ] **1.3** Опционально `calculatedAt DateTime?` — когда агент вернул page count

- [ ] **1.4** Миграция + `prisma generate`

- [ ] **1.5** Обновить типы в agent/admin routes

## Критерии приёмки

- [ ] Можно создать заказ со статусом `CALCULATING`
- [ ] Старые заказы (PDF) работают без миграции данных
- [ ] Admin pay не принимает заказы в `CALCULATING`

## Заметки

- `amountKopeks` заполняется после calculation
- `printableFilePath` — не в 0.1, добавим с VPS
