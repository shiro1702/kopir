# 05 — Desktop: polling-агент

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | INF-01, AGT-01 |
| **Зависимости** | 04 |
| **Оценка** | 2–3 часа |

## Цель

Консольный Python-скрипт: каждые 5 сек опрашивает API, забирает оплаченные заказы, скачивает PDF, передаёт на печать (задача 06).

## Подзадачи

- [ ] **5.1** `desktop/requirements.txt`:
  ```
  requests>=2.31.0
  python-dotenv>=1.0.0
  ```
- [ ] **5.2** `desktop/.env.example` — SERVER_URL, AGENT_API_KEY, POINT_ID, POLL_INTERVAL_SEC
- [ ] **5.3** `desktop/agent/config.py` — загрузка env, валидация
- [ ] **5.4** `desktop/agent/api_client.py`:
  - `get_queue()` → list orders
  - `claim(order_id)`
  - `download_file(order_id, dest_path)`
  - `complete(order_id, status, error?)`
- [ ] **5.5** `desktop/agent/main.py` — основной цикл:
  ```python
  while True:
      orders = client.get_queue()
      for order in orders:
          client.claim(order["id"])
          path = download_to_temp(order)
          print_pdf(path)  # задача 06
          client.complete(order["id"], "PRINTED")
      sleep(POLL_INTERVAL_SEC)
  ```
- [ ] **5.6** Обработка ошибок: при сбое печати → `complete(FAILED, message)`
- [ ] **5.7** Логи в stdout с timestamp: `[2026-06-11 10:00:01] Claimed order clx...`
- [ ] **5.8** `desktop/README.md` — как запустить на Windows и macOS

## Структура файлов

```
desktop/
  agent/
    __init__.py
    config.py
    api_client.py
    printer.py      # задача 06
    main.py
  requirements.txt
  .env.example
  README.md
```

## Запуск

```bash
cd desktop
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # заполнить
python -m agent.main
```

## Критерии приёмки

- [ ] Агент стартует, каждые 5 сек пишет «poll» или «idle»
- [ ] При появлении PAID заказа — claim + download без ручного вмешательства
- [ ] При падении сети — retry, не крашится
- [ ] Один заказ не печатается дважды (claim защищает)

## Заметки

- GUI (PySide6) — Sprint 2
- Windows Service — Sprint 4
- На Mac для пилота используем `lp` вместо SumatraPDF
