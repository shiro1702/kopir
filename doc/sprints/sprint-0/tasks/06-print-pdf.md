# 06 — Печать PDF на принтере

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | AGT-02 |
| **Зависимости** | 05 |
| **Оценка** | 2–4 часа (зависит от ОС) |

## Цель

Функция `print_pdf(path)` в агенте: тихая печать без открытия UI.

## Windows (целевая ОС копицентра)

### Вариант A — SumatraPDF (рекомендуется)

- [ ] Скачать [SumatraPDF](https://www.sumatrapdfreader.org/) portable
- [ ] Положить `SumatraPDF.exe` в `desktop/bin/` или указать путь в `.env`
- [ ] `PRINTER_NAME` в `.env` (пусто = принтер по умолчанию)

```python
# desktop/agent/printer.py
subprocess.run([
    sumatra_path, "-print-to", printer_name or "default",
    "-silent", pdf_path
], check=True, timeout=120)
```

### Вариант B — win32print + pywin32

Запасной вариант если Sumatra недоступен. Сложнее с PDF — предпочтительнее Sumatra.

## macOS (разработка на Mac)

```python
subprocess.run(["lp", "-d", printer_name, pdf_path], check=True)
```

Узнать имя: `lpstat -p -d`

## Linux (будущие боксы)

```python
subprocess.run(["lp", "-d", printer_name, pdf_path], check=True)
```

## Подзадачи

- [ ] **6.1** `desktop/agent/printer.py` — абстракция по `sys.platform`
- [ ] **6.2** Env: `PRINTER_NAME`, `SUMATRA_PATH` (Windows)
- [ ] **6.3** Timeout 120 сек на задание печати
- [ ] **6.4** Проверка существования файла перед печатью
- [ ] **6.5** Удаление temp-файла после успеха/ошибки
- [ ] **6.6** Скрипт `desktop/scripts/test_print.py` — печать локального test.pdf без API

## Критерии приёмки

- [ ] `test_print.py` печатает 1-строчный PDF на принтер по умолчанию
- [ ] Не открывается окно просмотра PDF
- [ ] При неверном пути — понятная ошибка в логе
- [ ] Задокументировать в `desktop/README.md`: имя принтера, ОС, время печати 1 стр.

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| Принтер offline | `lpstat -p` / Панель устройств Windows |
| Sumatra не найден | Проверить `SUMATRA_PATH` |
| Пустая печать | PDF corrupt — проверить download |
| Долго ждёт | Увеличить timeout, проверить очередь ОС |

## Метрики для ретро

Записать в `doc/sprints/sprint-0/notes.md`:
- ОС: ___
- Принтер: ___
- Среднее время 1 стр.: ___ сек
- Среднее время 10 стр.: ___ сек
