# 04 — Heartbeat + блокировка offline-точки

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | AGT-08, MON-01, MON-02 |
| **Зависимости** | 03 |
| **Оценка** | 3–4 часа |

## Цель

Сервер знает, жива ли точка; новые заказы отклоняются, если агент offline > 30 сек.

## Подзадачи

- [ ] **4.1** Prisma `Point`:
  ```prisma
  lastSeenAt  DateTime?
  agentStatus String?   // ready | printing | error | offline
  ```
- [ ] **4.2** Агент шлёт heartbeat каждые `HEARTBEAT_INTERVAL_SEC` (15) по WS
- [ ] **4.3** Hub обновляет `Point.lastSeenAt`, `agentStatus`
- [ ] **4.4** Cron или on-request: если `now - lastSeenAt > 30 сек` → `agentStatus = offline`
- [ ] **4.5** `bot/core.ts` → перед `order.create` проверить точку:
  - offline → `MSG_POINT_OFFLINE` («Печать временно недоступна, попробуйте позже»)
- [ ] **4.6** Админка: индикатор 🟢/🔴 рядом с точкой (optional, nice to have)

## Критерии приёмки

- [ ] Остановить агент → через 30 сек новый файл в боте получает отказ
- [ ] Запустить агент → через ≤ 20 сек заказы снова принимаются
- [ ] Во время печати `agentStatus = printing`, heartbeat не сбрасывает offline

## Заметки

- Redis (WEB-05) — Sprint 3; для 1 точки достаточно Postgres
- `isActive=false` на Point — ручное отключение партнёром (позже AGT-07)
