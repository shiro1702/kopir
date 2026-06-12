# 04 — API: заказы и файлы

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | WEB-03 |
| **Зависимости** | 01, 02 |
| **Оценка** | 2–3 часа |

## Цель

REST API для агента печати и внутренней логики: очередь оплаченных заказов, скачивание файла, обновление статуса.

## Аутентификация агента

Заголовок на всех agent-роутах:
```
Authorization: Bearer <AGENT_API_KEY>
```

## Эндпоинты

### `GET /api/agent/queue`

Возвращает заказы для точки агента в статусе `PAID`, FIFO.

**Query:** `pointId=point_dev_1`

**Response:**
```json
{
  "orders": [
    {
      "id": "clx...",
      "fileName": "report.pdf",
      "downloadUrl": "/api/agent/orders/clx.../file",
      "pageCount": 3,
      "createdAt": "2026-06-11T10:00:00Z"
    }
  ]
}
```

### `GET /api/agent/orders/:id/file`

Отдаёт PDF binary. Только для авторизованного агента. Order должен быть `PAID` или `PRINTING`.

### `POST /api/agent/orders/:id/claim`

Агент забирает заказ: `PAID` → `PRINTING`. Идемпотентно если уже `PRINTING` этим агентом.

### `POST /api/agent/orders/:id/complete`

Body: `{ "status": "PRINTED" | "FAILED", "errorMessage"?: string }`

`PRINTING` → `PRINTED` | `FAILED`, ставит `printedAt`.

## Подзадачи

- [ ] **4.1** `server/middleware/agent-auth.ts` — проверка Bearer token
- [ ] **4.2** Реализовать `GET /api/agent/queue`
- [ ] **4.3** Реализовать скачивание файла — стрим из Vercel Blob по `Order.filePath` (`get` / `fetch` blob URL)
- [ ] **4.4** Реализовать claim + complete
- [ ] **4.5** Логирование ошибок (console + опционально файл)
- [ ] **4.6** Валидация: нельзя complete заказ не в `PRINTING`

## Критерии приёмки

- [ ] Без токена — 401
- [ ] В очереди только `PAID` заказы нужной точки
- [ ] После `complete` статус `PRINTED`, повторный poll не возвращает заказ
- [ ] Файл скачивается и совпадает с оригиналом (hash или размер)

## Тест curl

```bash
# Создать PAID заказ вручную в Studio, затем:
curl -H "Authorization: Bearer $AGENT_API_KEY" \
  "http://localhost:3000/api/agent/queue?pointId=point_dev_1"

curl -H "Authorization: Bearer $AGENT_API_KEY" \
  -o out.pdf \
  "http://localhost:3000/api/agent/orders/<id>/file"
```

## Заметки

- WebSocket — Sprint 1
- Rate limit не нужен в пилоте
- `downloadUrl` может быть относительным — агент склеивает с `SERVER_URL`
- Агент не ходит в Blob напрямую — только через `GET /api/agent/orders/:id/file` (auth + проверка статуса)
- После `PRINTED` / `FAILED` — удалить blob (`FILE-07`, можно заглушкой в Sprint 0)
