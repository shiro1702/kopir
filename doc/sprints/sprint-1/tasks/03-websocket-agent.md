# 03 — Агент: WebSocket вместо polling

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | AGT-03 |
| **Зависимости** | 02 |
| **Оценка** | 4–6 часов |

## Цель

Desktop-агент держит постоянное WS-соединение; polling — резерв при disconnect > 60 сек.

## Подзадачи

- [ ] **3.1** `desktop/agent/ws_client.py` — connect, auth, reconnect с exponential backoff
- [ ] **3.2** Обработка `print_job`: download → print (существующий pipeline) → `complete` по WS
- [ ] **3.3** `main.py`: asyncio loop или thread WS + существующий print thread-safe
- [ ] **3.4** Env: `WS_URL`, `USE_WEBSOCKET=true` (default true если WS_URL задан)
- [ ] **3.5** Fallback: если WS недоступен 60 сек — вернуться к `get_queue()` poll раз в `POLL_INTERVAL_SEC`
- [ ] **3.6** Логи: `[ws] connected`, `[ws] job received clx...`, `[ws] reconnect attempt N`

## Критерии приёмки

- [ ] При живом WS — zero HTTP poll (кроме download file / calculation queue)
- [ ] Обрыв Wi-Fi 30 сек → reconnect → следующий заказ печатается
- [ ] Calculation queue (docx) по-прежнему через REST poll или отдельный WS message type `calculate_job`

## Заметки

- DOCX calculation можно оставить на REST poll в Sprint 1 — меньше риска
- Не дублировать print: mutex на один активный job
