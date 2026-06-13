# 05 — Агент: печать DOCX через Word

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | AGT-15 |
| **Зависимости** | 04 |
| **Оценка** | 2–3 часа |

## Цель

После `PAID` печатать `.doc`/`.docx` через Word; PDF — как в Sprint 0 (SumatraPDF / lp).

## Подзадачи

- [ ] **5.1** `word.py`: `print_document(path) -> None`
- [ ] **5.2** `printer.py`: роутинг по расширению/mime из order metadata
- [ ] **5.3** `doc.PrintOut()` на принтер по умолчанию
- [ ] **5.4** Ждать завершения очереди печати (опционально `Background=False`)
- [ ] **5.5** Ошибки → `complete(FAILED, ...)`

## Критерии приёмки

- [ ] docx после PAID печатается на default printer
- [ ] pdf по-прежнему через SumatraPDF
- [ ] Один docx не печатается дважды

## Заметки

- Не конвертировать в PDF на этом этапе
- Позже VPS заменит docx-path на PDF-only print
