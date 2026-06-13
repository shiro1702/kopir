# Печать DOC/DOCX

> Источник: [brainstorm/12.06.2026.md](../brainstorm/12.06.2026.md)  
> **Sprint 0:** только PDF.  
> **Sprint 0.1:** локальный подсчёт страниц через MS Word + оплата в боте.  
> **Позже (Sprint 2+):** свой VPS + LibreOffice / Gotenberg → PDF в Blob.

## Зачем считать на ПК копицентра

Один и тот же `.docx` может дать **разное число страниц** на сервере и на принтере партнёра (поля, драйвер, шрифты). Клиент должен платить за то, что **реально выйдет из принтера** в этой точке.

**Решение для копицентров (Windows + MS Word):** агент на ПК партнёра открывает Word в фоне, считает страницы под **его** принтер по умолчанию, отправляет цифру на сервер → бот показывает цену → после оплаты печатает тот же файл.

## Эволюция подходов

| Этап | Где считаем | Где печатаем | Когда |
|------|-------------|--------------|-------|
| **0** (сейчас) | — | PDF | Sprint 0 |
| **0.1** | MS Word на ПК агента | `.doc`/`.docx` через Word | Sprint 0.1 |
| **2+** | LibreOffice на **нашем VPS** | PDF из Blob | Боксы, Linux, масштаб |

Подробности Sprint 0.1: [sprints/sprint-0-1/](../sprints/sprint-0-1/README.md).

---

## Схема Sprint 0.1 — «двойное рукопожатие»

```
[ Клиент ]                    [ Vercel / Nitro ]              [ Python agent (Windows) ]
     │                               │                                  │
     │── 1. Отправил .docx ─────────►│                                  │
     │                               │── 2. Blob + order CALCULATING ──►│ poll
     │                               │                                  │ Word: page count
     │                               │◄── 3. POST pageCount, amount ─────│
     │◄── 4. «15 стр, 150 ₽» ────────│                                  │
     │    [Оплатить] (админ/ручное)  │                                  │
     │                               │── 5. status PAID ───────────────►│
     │                               │                                  │ Word: print
     │◄── 6. «Напечатано!» ──────────│◄── 7. complete PRINTED ──────────│
```

Задержка **5–15 сек** между загрузкой и кнопкой оплаты — норма. В боте: *«Считаем страницы…»*.

### Статусы заказа

```
CALCULATING → AWAITING_PAYMENT → PAID → PRINTING → PRINTED | FAILED
              ↑ (ошибка Word) → CALCULATION_FAILED
```

| Статус | Кто меняет | Смысл |
|--------|------------|-------|
| `CALCULATING` | Сервер при приёме docx | Ждём page count от агента |
| `AWAITING_PAYMENT` | Агент после подсчёта | Клиент видит цену |
| `CALCULATION_FAILED` | Агент / таймаут | Word не открыл файл |
| `PAID` | Админ / webhook | Можно печатать |

---

## Требования к ПК копицентра (Sprint 0.1)

- Windows 10/11
- **Microsoft Word** (лицензия партнёра — в 99% копицентров уже есть)
- Python-агент с `pywin32`
- Принтер по умолчанию = тот, на который печатаем

### Подсчёт страниц (pywin32)

```python
import win32com.client

def count_word_pages(path: str) -> int:
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    word.DisplayAlerts = 0
    try:
        doc = word.Documents.Open(path, ReadOnly=True)
        pages = doc.ComputeStatistics(2)  # wdStatisticPages
        doc.Close(False)
        return int(pages)
    finally:
        word.Quit()
```

Печать — тот же Word, `doc.PrintOut()` или через существующий pipeline.

### Риски и митигация

| Риск | Митигация |
|------|-----------|
| Popup «Обновите Office» | `DisplayAlerts = 0`, тест на ПК партнёра |
| Макросы в doc | Word без EnableMacros; позже — только PDF с VPS |
| 10 файлов одновременно | Очередь: один Word-процесс, FIFO |
| Word не установлен | `CALCULATION_FAILED` + сообщение в бот |

---

## Цена в Sprint 0.1

Пока без Mini App и тарифной сетки:

```
amountKopeks = pageCount × pricePerPageKopeks
```

`pricePerPageKopeks` — env на сервере или поле `Point` (например 1000 = 10 ₽/стр). Один тариф ЧБ, без дуплекса.

---

## Поля в БД

| Поле | Sprint 0 | Sprint 0.1 | Позже (VPS) |
|------|----------|------------|-------------|
| `fileName` | pdf | doc/docx/pdf | любой |
| `filePath` | Blob URL | Blob URL исходника | Blob PDF |
| `mimeType` | — | `application/vnd...` | |
| `pageCount` | 1 (default) | от агента | от Gotenberg |
| `amountKopeks` | 0 | рассчитано | калькулятор |

Опционально позже:

| Поле | Назначение |
|------|------------|
| `printableFilePath` | PDF после конвертации на VPS |
| `originalFilePath` | исходник от пользователя |

На этапе 0.1 для docx: `filePath` = исходник, печатаем его же через Word.

---

## API агента (расширение)

### `GET /api/agent/queue?pointId=...`

Два типа задач в одном poll (или два query-параметра `kind=calculate|print`):

**calculate** — заказы `CALCULATING`  
**print** — заказы `PAID` (как сейчас)

### `POST /api/agent/orders/:id/calculation`

```json
{
  "pageCount": 15,
  "status": "OK"
}
```

или при ошибке:

```json
{
  "status": "FAILED",
  "errorMessage": "Word not installed"
}
```

Сервер: `CALCULATING` → `AWAITING_PAYMENT`, выставляет `pageCount`, `amountKopeks`, шлёт клиенту сообщение с ценой.

---

## Бот: сообщения клиенту

1. Файл принят → *«Считаем страницы на принтере…»*
2. Готово → *«📄 report.docx — **15 страниц**, **150 ₽**. Ожидаем оплату.»*
3. После «Оплачено» в админке → *«Оплата получена, печатаем…»*
4. `PRINTED` → *«Готово! Заберите документ.»*

PDF по-прежнему: сразу `AWAITING_PAYMENT` с `pageCount` из pdf-parse (или default 1 до FILE-01).

---

## Будущее: свой сервер + LibreOffice

Когда появятся боксы (Linux, без Word) или 20+ точек:

```
Клиент → docx → Vercel → POST наш VPS (Gotenberg/LibreOffice headless)
                      ← PDF + pageCount
         → Blob (printable PDF)
         → Агент печатает только PDF (CUPS / SumatraPDF)
```

| | Локальный Word (0.1) | VPS LibreOffice (2+) |
|---|---------------------|----------------------|
| Точность для точки | 100% (тот же принтер) | ~99% (нужен preview) |
| CapEx | 0 | ~700 ₽/мес VPS |
| Боксы / Linux | ❌ | ✅ |
| Безопасность | Риск макросов на ПК | Изоляция в Docker |

**FILE-02** в [FEATURES.md](../project/FEATURES.md) — облачная конвертация; не дублируем в 0.1.

---

## Почему файл через Blob, а не из Telegram в Python

1. **Токен бота** не должен быть на чужом ПК  
2. **Ссылки Telegram** живут ~1 час  
3. **Единый pipeline** — позже подменим содержимое Blob на PDF без смены API агента  
4. **Блокировки** — в вузах режут `*.telegram.org`, Vercel — нет  

---

## Связанные документы

- [sprints/sprint-0-1/README.md](../sprints/sprint-0-1/README.md) — задачи реализации
- [product/color-printing.md](./color-printing.md) — после MVP
- [business/scaling.md](../business/scaling.md) — переход на облачную конвертацию
