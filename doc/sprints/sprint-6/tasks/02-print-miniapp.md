# 02 — Mini App для печати файлов (TG + MAX)

| | |
|---|---|
| **Спринт** | 6 |
| **Статус** | ⬜ |
| **Приоритет** | P0 |
| **Feature** | WEB-07, FILE-04 partial, UX-01–04 |
| **Спека** | [batch-edit-flow.md](../../../product/batch-edit-flow.md) · [payment-flow.md](../../../product/payment-flow.md) · [bot-user-flow.md](../../../product/bot-user-flow.md) |
| **Зависимости** | Sprint 5: [02-point-selection-bot.md](../../sprint-5/tasks/02-point-selection-bot.md), [03-point-map-miniapp.md](../../sprint-5/tasks/03-point-map-miniapp.md) (карта / выбор точки) |
| **Оценка** | 5–8 дней |

## Проблема

Сейчас клиент печатает **только через бота** (чат + inline-кнопки). В Sprint 5 Mini App закрывает **выбор точки на карте** (WEB-07 partial), но не загрузку файлов.

Для пользователей, привыкших к «приложению внутри мессенджера», чат с десятком сообщений на пачку — трение. Mini App даёт корзину, превью и оплату в одном экране.

## Цель

Полноценный **SPA внутри Telegram и MAX**: загрузка → пачка → параметры → точка → оплата → статус. Тот же `OrderBatch` API, что у бота; бот остаётся fallback.

## Scope

### Общее (shared composables / `components/print/`)

- [ ] **2.1** Nuxt layout `miniapp` — mobile-first, без лишнего chrome; определение платформы (`telegram` / `max`)
- [ ] **2.2** Авторизация: `initData` (TG WebApp SDK) / MAX-аналог → `POST /api/auth/miniapp` → сессия `User` (тот же `telegramId` / `maxUserId`)
- [ ] **2.3** Composable `usePrintBatch` — create batch, upload, list orders, remove file (API из [batch-edit-flow](../../../product/batch-edit-flow.md))
- [ ] **2.4** Composable `usePointSelection` — last point, список, код; reuse логики Sprint 5

### Telegram Mini App

- [ ] **2.5** Route `/miniapp` (или `/tg`) — entry из кнопки бота «📱 Открыть приложение»
- [ ] **2.6** MainButton / BackButton WebApp SDK — «Оплатить», «Назад к файлам»
- [ ] **2.7** `web_app` кнопка в меню бота + deep link `?startapp=print`

### MAX Mini App

- [ ] **2.8** Адаптер MAX WebApp (если API отличается от TG) — тот же UI, другой auth header
- [ ] **2.9** Entry из MAX-бота

### UX экраны

- [ ] **2.10** **Файлы:** drag-and-drop / picker, PDF + docx (как в боте), лимит пачки, прогресс upload
- [ ] **2.11** **Пачка:** список файлов, удаление, статус `CALCULATING` / ошибка
- [ ] **2.12** **Параметры:** ч/б, дуплекс, копии, калькулятор цены (UX-01–04)
- [ ] **2.13** **Точка:** last point + «Изменить» → список / карта (reuse Sprint 5 map route)
- [ ] **2.14** **Оплата:** тот же `PaymentProvider` API ([payment-flow фаза 3.4](../../../product/payment-flow.md)); СБП QR + «Проверить оплату»
- [ ] **2.15** **Статус:** PAID → PRINTING → «Готово!»; кнопка «Проблема с печатью» (UX-11) — ссылка в support

### Превью (P1)

- [ ] **2.16** PDF preview первых страниц (FILE-04, pdfjs-dist) — опционально в этом спринте

## Не в scope

- VK Mini App → после WEB-16 (Sprint 5 backlog)
- PWA / сайт без мессенджера → [03-web-print-auth.md](./03-web-print-auth.md)
- DOCX preview, диапазон страниц (FILE-05) → backlog
- Реклама при ожидании (MKT-02)

## DoD

- [ ] Из TG-бота открывается Mini App, `User` создаётся/находится по `initData`
- [ ] Загрузка 3 PDF → пачка → оплата TBANK → печать на агенте (E2E)
- [ ] Смена точки в Mini App до оплаты
- [ ] MAX: тот же флоу (или явный «blocked by MAX SDK» в README спринта)
- [ ] Бот: кнопка «Открыть приложение» + fallback «продолжить в чате»

## Связанные задачи

- Sprint 5: [03-point-map-miniapp.md](../../sprint-5/tasks/03-point-map-miniapp.md) — карта точки
- Sprint 6: [03-web-print-auth.md](./03-web-print-auth.md) — общий UI на сайте
