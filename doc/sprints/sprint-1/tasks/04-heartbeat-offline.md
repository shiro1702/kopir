# 04 — Heartbeat + блокировка offline-точки

| | |
|---|---|
| **Статус** | 🟡 частично (polling MVP, Sprint 0) |
| **Feature** | AGT-08, MON-01, MON-02 |
| **Зависимости** | 03 (WebSocket — для полной версии) |
| **Оценка** | 3–4 часа (полная версия с WS) |

## Цель

Сервер знает, жива ли точка; клиент и сотрудник видят, доступна ли печать.

## Реализовано (Sprint 0, вариант B — polling)

- [x] **4.1a** Prisma `Point.lastSeenAt` — время последнего контакта агента
- [x] **4.1b** Агент обновляет `lastSeenAt` при каждом запросе к `/api/agent/*` (queue, claim, file, calculation, complete)
- [x] **4.4a** `isPointAgentOnline()` — offline если `now - lastSeenAt > POINT_OFFLINE_THRESHOLD_SEC` (default 20 сек)
- [x] **4.5a** Бот: после подтверждения оплаты — предупреждение `MSG_AGENT_OFFLINE_AFTER_PAYMENT`, если агент offline
- [x] **4.6** Админка: индикатор 🟢/🔴 у точки (шапка + колонка «Точка»)

**Не блокируем** приём файлов в боте — оплата только на точке, клиент узнаёт об offline после оплаты.

## Осталось (Sprint 1 — WebSocket)

- [ ] **4.1c** `Point.agentStatus` — `ready | printing | error | offline`
- [ ] **4.2** Агент шлёт heartbeat каждые `HEARTBEAT_INTERVAL_SEC` (15) по WS
- [ ] **4.3** Hub обновляет `Point.lastSeenAt`, `agentStatus`
- [ ] **4.5b** Бот: отказ в новом заказе до оплаты, если точка offline (`MSG_POINT_OFFLINE`)

## Env

```env
# web/.env
POINT_OFFLINE_THRESHOLD_SEC=20   # порог offline; при POLL_INTERVAL_SEC=5 держать ≥15
```

## Критерии приёмки (полная версия Sprint 1)

- [ ] Остановить агент → через 30 сек новый файл в боте получает отказ
- [x] Остановить агент → после оплаты клиент видит предупреждение в боте
- [x] Запустить агент → индикатор в админке 🟢 в течение порога
- [ ] Во время печати `agentStatus = printing`, heartbeat не сбрасывает offline

## Заметки

- Redis (WEB-05) — Sprint 3; для 1 точки достаточно Postgres
- `isActive=false` на Point — ручное отключение партнёром (позже AGT-07)
- Polling MVP: `lastSeenAt` обновляется и во время печати (claim/file/complete), не только на idle poll
