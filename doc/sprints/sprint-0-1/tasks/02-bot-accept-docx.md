# 02 — Бот: приём DOC/DOCX

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | FILE-11 |
| **Зависимости** | 01 |
| **Оценка** | 2–3 часа |

## Цель

Принимать `.doc` и `.docx` в Telegram и MAX на общем ядре `bot/core`.

## Подзадачи

- [ ] **2.1** Расширить `IncomingPdf` → `IncomingDocument` (или generic) с mime + extension check

- [ ] **2.2** Разрешить mime:
  - `application/pdf`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `application/msword`

- [ ] **2.3** При docx: создать order `status: CALCULATING`, загрузить в Blob (как PDF)

- [ ] **2.4** При pdf: оставить flow Sprint 0 (`AWAITING_PAYMENT`, pageCount=1 или pdf-parse)

- [ ] **2.5** Сообщение клиенту: `MSG_CALCULATING` — «Считаем страницы…»

- [ ] **2.6** Обновить `MSG_PDF_ONLY` → `MSG_UNSUPPORTED_FILE` с перечислением форматов

## Критерии приёмки

- [ ] docx в TG → order `CALCULATING`, файл в Blob
- [ ] pdf → как раньше
- [ ] .jpg → отказ с понятным текстом

## Заметки

- Client upload / Telegram file download — без изменений
- См. [docx-conversion.md](../../../product/docx-conversion.md)
