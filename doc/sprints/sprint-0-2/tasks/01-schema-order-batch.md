# 01 — Prisma: `OrderBatch` + связи

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | FILE-01, WEB-03 |
| **Зависимости** | Sprint 0.1 |
| **Оценка** | 2–3 часа |

## Цель

Добавить сущность пачки заказов, чтобы несколько файлов объединялись в один платёжный контекст.

## Подзадачи

- [ ] **1.1** Добавить модель `OrderBatch`:
  - `id`, `status`, `userId`, `pointId`
  - `totalPages`, `totalAmountKopeks`
  - `createdAt`, `updatedAt`, `paidAt`
- [ ] **1.2** Добавить в `Order` поля:
  - `batchId String?`
  - `batchIndex Int?` (порядок печати в пачке)
- [ ] **1.3** Индексы:
  - `Order(batchId, batchIndex)`
  - `OrderBatch(status, pointId, createdAt)`
- [ ] **1.4** Миграция + `prisma generate`
- [ ] **1.5** Обновить типы в API/боте/агенте

## Критерии приёмки

- [ ] Один `OrderBatch` содержит несколько `Order`
- [ ] Старые одиночные заказы (без `batchId`) продолжают работать
- [ ] Сортировка очереди по `batchIndex` стабильна

## Заметки

- Дробный платёж внутри пачки пока не поддерживаем
- `OrderBatch` в Sprint 0.2 работает только с demo/manual pay
