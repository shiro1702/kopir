# Sprint 0.1 — заметки

## Тестовое окружение

- ОС: Windows 10/11 (E2E требует MS Word)
- MS Word версия: _(заполнить при тесте)_
- Принтер: _(заполнить при тесте)_

## Реализация (код)

| Компонент | Статус |
|-----------|--------|
| Prisma: CALCULATING, mimeType | ✅ |
| Bot: doc/docx → CALCULATING | ✅ |
| API: queue kind=calculate, POST calculation | ✅ |
| Agent: Word count + print | ✅ |
| Bot: quote / failed / print complete | ✅ |

## E2E — инструкция (Windows)

**Предусловия:**
- `web/.env`: `PRICE_PER_PAGE_KOPEKS=1000`, `CALCULATION_TIMEOUT_SEC=120`
- `desktop/.env`: `USE_WORD=true`, `SERVER_URL`, `AGENT_API_KEY`, `POINT_ID`
- MS Word установлен, агент запущен: `python -m agent.main`

**Сценарий:**

1. Отправить `test.docx` (известное число страниц, напр. 3) в бота
2. Бот: «Считаем страницы…»
3. ≤ 20 сек: «3 страницы, 30 ₽» (при 10 ₽/стр)
4. Админка → «Оплачено»
5. Агент печатает, статус `PRINTED`
6. Бот: «Готово! Заберите документ.»

**Регрессия PDF:** отправить PDF → сразу «ожидает оплаты» без CALCULATING.

**Без Word:** `USE_WORD=false` или удалить Word → `CALCULATION_FAILED` + сообщение клиенту.

## Результаты E2E

| Дата | Файл | Страниц | Calc time | Print time | OK |
|------|------|---------|-----------|------------|-----|
| | | | | | |

_Заполнить после прогона на Windows ПК._
