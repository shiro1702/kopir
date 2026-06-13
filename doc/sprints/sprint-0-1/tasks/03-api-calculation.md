# 03 — API: очередь подсчёта и calculation

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | WEB-03, FILE-10 |
| **Зависимости** | 01, 02 |
| **Оценка** | 2–3 часа |

## Цель

Агент забирает заказы на подсчёт и отдаёт результат на сервер.

## Эндпоинты

### `GET /api/agent/queue?pointId=...&kind=calculate`

Заказы `CALCULATING`, FIFO.

```json
{
  "orders": [{
    "id": "clx...",
    "fileName": "diploma.docx",
    "mimeType": "application/vnd...",
    "downloadUrl": "/api/agent/orders/clx.../file"
  }]
}
```

### `GET /api/agent/queue?pointId=...&kind=print`

Как Sprint 0 — только `PAID`.

### `GET /api/agent/orders/:id/file`

Разрешить скачивание для статусов: `CALCULATING`, `PAID`, `PRINTING`.

### `POST /api/agent/orders/:id/calculation`

Body:
```json
{ "pageCount": 15, "status": "OK" }
```
или
```json
{ "status": "FAILED", "errorMessage": "..." }
```

**При OK:**
- `CALCULATING` → `AWAITING_PAYMENT`
- `pageCount`, `amountKopeks = pageCount * PRICE_PER_PAGE_KOPEKS`
- `calculatedAt = now()`
- Вызвать notify клиенту (задача 06)

**При FAILED:**
- → `CALCULATION_FAILED`
- notify клиенту об ошибке

## Подзадачи

- [ ] **3.1** Query param `kind` на queue (default `print` для backward compat)
- [ ] **3.2** Route `calculation.post.ts`
- [ ] **3.3** Env `PRICE_PER_PAGE_KOPEKS`
- [ ] **3.4** Idempotency: повторный OK на `AWAITING_PAYMENT` — 409 или ignore

## Критерии приёмки

- [ ] Агент видит CALCULATING в `kind=calculate`
- [ ] После calculation заказ в AWAITING_PAYMENT с верным amount
- [ ] print queue не показывает CALCULATING
