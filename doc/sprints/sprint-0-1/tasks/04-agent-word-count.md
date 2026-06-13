# 04 — Агент: подсчёт страниц в Word

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | AGT-14 |
| **Зависимости** | 03 |
| **Оценка** | 3–4 часа |

## Цель

На Windows: скачать docx, открыть MS Word скрыто, вернуть page count на сервер.

## Подзадачи

- [ ] **4.1** `desktop/agent/word.py` — `count_pages(path) -> int`
- [ ] **4.2** `pywin32` в requirements (Windows only marker)
- [ ] **4.3** `config.py`: `USE_WORD`, skip на macOS/Linux с warning
- [ ] **4.4** В main loop: poll `kind=calculate` перед `kind=print`
- [ ] **4.5** После download → count → `POST calculation`
- [ ] **4.6** Один экземпляр Word за раз (lock / queue)
- [ ] **4.7** Timeout на Open (60 sec) → FAILED

## Код (ориентир)

```python
word = win32com.client.Dispatch("Word.Application")
word.Visible = False
word.DisplayAlerts = 0
doc = word.Documents.Open(path, ReadOnly=True)
pages = doc.ComputeStatistics(2)  # wdStatisticPages
```

## Критерии приёмки

- [ ] 10-стр docx → server получает pageCount=10
- [ ] Битый файл → FAILED с message
- [ ] На Mac агент не падает (пропускает calculate или логирует)

## Заметки

- Тест на реальном ПК с Word и принтером по умолчанию
- См. [docx-conversion.md](../../../product/docx-conversion.md)
