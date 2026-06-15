# 02 — WebSocket hub на VPS

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | WEB-04 |
| **Зависимости** | 01 (AGENT_API_KEY, POINT_ID известны) |
| **Оценка** | 6–8 часов |

## Цель

Отдельный процесс на VPS принимает WebSocket от агентов, пушит print jobs, принимает heartbeat.

## Подзадачи

- [ ] **2.1** Выбрать стек: `ws` + Node (в `web/server/ws-hub/`) или Python `websockets` — один репозиторий, деплой через systemd
- [ ] **2.2** Auth: первое сообщение `{ type: "auth", pointId, token }` — Bearer = `AGENT_API_KEY`
- [ ] **2.3** Протокол сообщений (JSON):

  ```typescript
  // server → agent
  { type: "print_job", orderId, fileUrl, fileName, mimeType }
  { type: "calculate_job", orderId, fileUrl, fileName }  // docx queue

  // agent → server
  { type: "heartbeat", status: "online"|"printing"|"error", printerName? }
  { type: "job_complete", orderId, status: "PRINTED"|"FAILED", errorMessage? }
  { type: "calculation_result", orderId, pageCount, errorMessage? }
  ```

- [ ] **2.4** Hub опрашивает Neon / вызывает internal REST при новом `PAID` или `CALCULATING` (или подписка через cron 2s на MVP)
- [ ] **2.5** TLS: nginx reverse proxy + Let's Encrypt → `wss://ws.<domain>`
- [ ] **2.6** Health: `GET /health` на том же VPS
- [ ] **2.7** Документировать в `doc/dev/ENV_SETUP.md`: переменные VPS, firewall (443)

## Критерии приёмки

- [ ] Агент подключается, auth успешен, reconnect после обрыва
- [ ] При `PAID` заказ уходит агенту ≤ 2 сек (без polling)
- [ ] Два агента с разными `pointId` не получают чужие jobs
- [ ] Hub переживает restart — агент переподключается

## Заметки

- Vercel остаётся для ботов; hub только для agent ↔ server realtime
- Redis не нужен в Sprint 1 — статус точки в Postgres (`Point.lastSeenAt`)
