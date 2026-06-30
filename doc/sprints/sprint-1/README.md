# Sprint 1 — «Бета в копицентре (polling)»

| | |
|---|---|
| **Период** | 26 июня – ~10 июля 2026 |
| **Статус** | 🔵 закрывается — основное сделано, дожимаем polish + метрики |
| **Цель** | Реальные пользователи на 1 точке: QR → бот → ручная оплата → печать через polling |
| **Этап roadmap** | [Этап 2a — Бета](../../roadmap/ROADMAP.md#этап-2a--бета-в-1-копицентре-sprint-1) |

## Решение 28.06.2026: без WebSocket

Polling (5–30 сек) + `lastSeenAt` достаточно для одной точки.  
WebSocket, VPS hub, Redis → [Backlog](../SPRINTS.md#backlog-без-спринта).

## Definition of Done

- [x] Агент установлен на ПК копицентра
- [x] QR на стойке → бот с привязкой к точке (`/start point_<slug>`)
- [x] Оплата: перевод СБП или на месте + подтверждение staff
- [ ] После печати клиент получает «Готово!» (TG + MAX)
- [ ] Блокировка новых заказов на offline-точку (polling heartbeat)
- [ ] **30+ заказов**, **< 5%** ошибок, feedback в [notes.md](./notes.md)

## Архитектура (актуальная)

```
[ QR на стойке ] ──► /start point_bgu_1
         │
         ▼
[ Telegram / MAX ] ──файл──► [ Nuxt REST на Vercel ]
         │                        │
         │                   Neon + Blob
         │                        │
         │◄── staff confirm ──────┤
         │                        │
         └────────────────────────┼── poll 5–30s ──► [ kopir-agent ]
                                  │                      │
                                  │                 print PDF/DOCX
                                  │                      │
                                  │                 [ Принтер ]
```

**Vercel** — боты, REST, Blob, `/admin`.  
**Без VPS** в этом спринте.

## Задачи

| # | Задача | Статус | Файл |
|---|--------|--------|------|
| 01 | Установка агента в копицентре | ✅ | [tasks/01-agent-exe-deploy.md](./tasks/01-agent-exe-deploy.md) |
| 07 | QR deep link + приветствие точки | ✅ | [tasks/07-qr-deeplink.md](./tasks/07-qr-deeplink.md) |
| 08 | PDF-плакат с QR для стойки | ✅ | [tasks/08-qr-poster.md](./tasks/08-qr-poster.md) |
| 13 | Выбор способа оплаты (перевод / на месте) | ✅ | [tasks/13-payment-method-choice.md](./tasks/13-payment-method-choice.md) |
| 12 | Ручная печать при сбое агента | ✅ | [tasks/12-manual-print-fallback.md](./tasks/12-manual-print-fallback.md) |
| 14 | Удаление файла из пачки | ✅ | [tasks/14-batch-remove-file.md](./tasks/14-batch-remove-file.md) |
| 15 | Статусные сообщения (edit + typing) | ✅ | [tasks/15-batch-status-messages.md](./tasks/15-batch-status-messages.md) |
| 04 | Heartbeat polling + блокировка offline | 🔵 | [tasks/04-heartbeat-offline.md](./tasks/04-heartbeat-offline.md) |
| 09 | Уведомление «Готово!» | ⬜ | [tasks/09-ready-notification.md](./tasks/09-ready-notification.md) |
| 10 | Бета-тест + метрики | ⬜ | [tasks/10-beta-e2e.md](./tasks/10-beta-e2e.md) |
| 05 | Разделительный лист (опционально) | ⬜ | [tasks/05-separator-page.md](./tasks/05-separator-page.md) |
| 02 | WebSocket hub на VPS | ❌ cancelled | [tasks/02-websocket-server.md](./tasks/02-websocket-server.md) |
| 03 | Агент: WebSocket | ❌ cancelled | [tasks/03-websocket-agent.md](./tasks/03-websocket-agent.md) |
| 06 | Демо-оплата | ❌ cancelled | [tasks/06-demo-payment.md](./tasks/06-demo-payment.md) |

## Порядок (остаток спринта)

```
09 ──► 04 (MON-02) ──► 10
05 — опционально, параллельно
```

## Окружение

### `web/.env`

```env
POINT_OFFLINE_THRESHOLD_SEC=30
```

### `desktop/.env` (копицентр)

```env
SERVER_URL="https://kopir-xxx.vercel.app"
POINT_ID="point_bgu_1"
POLL_INTERVAL_SEC=5
USE_SEPARATOR_PAGE=false
```

## После спринта

→ [Sprint 2 — Подготовка к коммерции](../sprint-2/README.md) (админка точек, `/bind`, скелет Т-Банка)
