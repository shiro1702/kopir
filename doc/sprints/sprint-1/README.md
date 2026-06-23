# Sprint 1 — «Бета в копицентре»

| | |
|---|---|
| **Период** | 26 июня – 9 июля 2026 (2 недели) |
| **Цель** | Реальные пользователи в 1 копицентре: QR → бот → демо-оплата → печать с разделителем, агент по WebSocket |
| **Этап roadmap** | [Этап 2 — MVP для первых точек](../../roadmap/ROADMAP.md#этап-2--mvp-для-первых-35-точек-улan-удэ) |
| **Feature IDs** | WEB-04, AGT-03, AGT-08, AGT-10, AGT-11, AGT-12, UX-05, UX-10, UX-12, ONB-05, MON-01, MON-02 |
| **Предусловие** | Sprint 0.1 закрыт: PDF + DOCX E2E на Windows |

## Definition of Done

- [ ] Агент установлен на ПК копицентра (`kopir-agent.exe` или venv + autostart)
- [ ] Заказы доставляются агенту по WebSocket (polling — только fallback при обрыве)
- [ ] Heartbeat: точка offline > 30 сек → бот отказывает в новом заказе с понятным текстом
- [ ] Разделительный лист включается/выключается через `USE_SEPARATOR_PAGE`
- [ ] Демо-оплата в боте: кнопка «Оплатить» → через 3 сек заказ в `PAID` без админки
- [ ] QR на стойке ведёт в бота с привязкой к точке (`/start point_<slug>`)
- [ ] После печати клиент получает «Готово! Заберите документ» (TG + MAX)
- [ ] **30+ заказов** за спринт, **< 5%** ошибок печати
- [ ] Feedback от сотрудников копицентра записан в [notes.md](./notes.md)

## Архитектура

```
[ QR на стойке ] ──► /start point_bgu_1
         │
         ▼
[ Telegram / MAX ] ──файл──► [ Nuxt REST на Vercel ]
         │                        │
         │                   Neon + Blob
         │                        │
         │◄── demo pay / notify ──┤
         │                        │
         └────────────────────────┼──► [ VPS: WebSocket hub ]
                                  │         ▲ heartbeat 15s
                                  │         │
                                  └── jobs ─┘
                               [ kopir-agent.exe ]
                                        │
                               separator + print
                                        │
                                   [ Принтер ]
```

**Vercel** — боты, REST, Blob, админка (как в Sprint 0–0.1).  
**VPS** (минимальный, ~500 ₽/мес) — стабильный WebSocket для агента; Vercel serverless не держит долгие WS-сессии.

**Вне скоупа Sprint 1:** Т-Банк webhook, Mini App, Redis (heartbeat в Postgres), GUI PySide6, карта точек, VK-бот, LibreOffice на сервере, `/bind` для staff-каналов.

**Оплата в пилоте:** ручной перевод + на месте ([payment-flow.md](../../product/payment-flow.md)); демо-кнопка (задача 06) — только для UX-тестов.

**Позже:** Redis heartbeat → Sprint 3; реальная оплата → Sprint 2; привязка сотрудников через `/bind` → [Sprint 2, задача 11](../sprint-2/tasks/11-staff-bind-token.md).

## Задачи

| # | Задача | Статус | Файл |
|---|--------|--------|------|
| 01 | PyInstaller + установка в копицентре | ⬜ | [tasks/01-agent-exe-deploy.md](./tasks/01-agent-exe-deploy.md) |
| 02 | WebSocket hub на VPS | ⬜ | [tasks/02-websocket-server.md](./tasks/02-websocket-server.md) |
| 03 | Агент: WebSocket вместо polling | ⬜ | [tasks/03-websocket-agent.md](./tasks/03-websocket-agent.md) |
| 04 | Heartbeat + блокировка offline-точки | ⬜ | [tasks/04-heartbeat-offline.md](./tasks/04-heartbeat-offline.md) |
| 05 | Разделительный лист (toggle) | ⬜ | [tasks/05-separator-page.md](./tasks/05-separator-page.md) |
| 06 | Демо-оплата в боте | ⬜ | [tasks/06-demo-payment.md](./tasks/06-demo-payment.md) |
| 13 | Выбор способа оплаты (перевод / на месте) | ✅ | [tasks/13-payment-method-choice.md](./tasks/13-payment-method-choice.md) |
| 07 | QR deep link + приветствие точки | ⬜ | [tasks/07-qr-deeplink.md](./tasks/07-qr-deeplink.md) |
| 08 | PDF-плакат с QR для стойки | ⬜ | [tasks/08-qr-poster.md](./tasks/08-qr-poster.md) |
| 09 | Уведомление «Готово!» (polish + E2E) | ⬜ | [tasks/09-ready-notification.md](./tasks/09-ready-notification.md) |
| 12 | Ручная печать при сбое агента | ✅ | [tasks/12-manual-print-fallback.md](./tasks/12-manual-print-fallback.md) |
| 14 | Удаление файла из пачки | ✅ | [tasks/14-batch-remove-file.md](./tasks/14-batch-remove-file.md) |
| 15 | Статусные сообщения (edit + typing) | ✅ | [tasks/15-batch-status-messages.md](./tasks/15-batch-status-messages.md) |
| 10 | Бета-тест + метрики + разделитель в лотке | ⬜ | [tasks/10-beta-e2e.md](./tasks/10-beta-e2e.md) |

## Порядок выполнения

```
01 ──► 02 ──► 03 ──► 04
              │
              └──► 05 ──► 10
07 ──► 08 ──► 10
06 ──► 09 ──► 10
```

Задачи **07–08** (QR) можно параллельно с **02–04** (инфра).

## Окружение

### `web/.env` (дополнительно)

```env
# Sprint 1
WS_HUB_URL="wss://ws.kopir.example.com"   # VPS WebSocket
DEMO_PAYMENT_ENABLED=true                 # false в prod после Sprint 2
DEMO_PAYMENT_DELAY_MS=3000
POINT_OFFLINE_THRESHOLD_SEC=30
```

### `desktop/.env` (копицентр)

```env
SERVER_URL="https://kopir-xxx.vercel.app"
WS_URL="wss://ws.kopir.example.com"
POINT_ID="point_bgu_1"
USE_SEPARATOR_PAGE=false
POLL_INTERVAL_SEC=30          # fallback only
HEARTBEAT_INTERVAL_SEC=15
```

### VPS (WebSocket hub)

```env
AGENT_API_KEY="..."           # тот же, что в web
DATABASE_URL="..."            # Neon (для heartbeat → Point)
PORT=8080
```

### Prisma (новые поля Point)

```prisma
lastSeenAt   DateTime?
agentStatus  String?   // online | offline | printing | error
```

## Ежедневный чеклист

| День | Фокус |
|------|-------|
| Д1–Д2 | 01, договорённость с копицентром, VPS заказан |
| Д3–Д4 | 02, 03 — WS end-to-end локально |
| Д5 | 04 — heartbeat + offline block |
| Д6 | 05 — разделительный лист |
| Д7 | 06 — демо-оплата |
| Д8 | 07, 08 — QR + плакат на стойке |
| Д9 | 09 — polish уведомлений |
| Д10 | 10 — открытая бета, первые 10 заказов |
| Д11–Д14 | 10 — дожать до 30 заказов, ретро |

## Метрики спринта

| Метрика | Цель |
|---------|------|
| Заказов всего | ≥ 30 |
| Успешных печатей | ≥ 95% |
| Время QR → первая печать (медиана) | < 2 мин |
| Конверсия «открыл бота» → «отправил файл» | зафиксировать в notes |
| Ошибок из-за offline-точки | 0 при работающем агенте |

## Ретро

Шаблон в [SPRINTS.md](../SPRINTS.md#ретро-шаблон). Заполнить 9 июля.

## После спринта

→ [Sprint 2 — Коммерческий MVP](../SPRINTS.md#sprint-2--коммерческий-mvp) (Т-Банк, Mini App, GUI)
