# 15 — Статусные сообщения бота (edit + typing)

| | |
|---|---|
| **Статус** | ✅ done |
| **Feature** | UX-15 |
| **Зависимости** | Задача 14 |
| **Оценка** | ~4.5 часа |
| **Спека** | [batch-edit-flow.md](../../../product/batch-edit-flow.md) |

## Договорённости

| Решение | Статус |
|---------|--------|
| Один файл = одно сообщение, стадии через `editMessage` | **Делаем сейчас** |
| Toast на callback до тяжёлой логики | **Делаем сейчас** |
| Typing/upload_document до первого ответа (TG) | **Делаем сейчас** |
| `clientMessageId` + `clientMessageChatId` на `Order` | **Делаем сейчас** |
| Периодические «ещё работаем» каждые N сек | **Не делаем** |
| MAX без edit API — fallback на новые сообщения | **Только если API недоступен** |

## Цель

Клиент видит «Принимаю…» / «Считаем…» без тишины 3–15 сек; DOCX не плодит второе «Файл готов».

## Подзадачи

- [x] **15.1** Prisma: `clientMessageId`, `clientMessageChatId`
- [x] **15.2** `MessengerAdapter`: `sendStatus`, `editStatus`, `sendTyping`
- [x] **15.3** `handleDocument`: принимаю → edit ready/calculating
- [x] **15.4** `notifyQuoteReady` / failed: edit вместо нового сообщения
- [x] **15.5** Finalize: typing + toast «Собираем пачку…»

## Критерии приёмки

- [x] Ответ на файл < 1 с («Принимаю…» или typing)
- [x] Один статусный пост на файл (edit, не дубли)
- [x] DOCX: edit после подсчёта, без второго «Файл готов»
- [x] Confirm удаления — edit, не новый пост
- [x] Ошибка upload — edit статусного сообщения
