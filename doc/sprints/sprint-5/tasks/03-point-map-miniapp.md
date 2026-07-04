# 03 — Карта точек + выбор в Mini App

| | |
|---|---|
| **Спринт** | 5 |
| **Статус** | ⬜ |
| **Приоритет** | P1 |
| **Feature** | WEB-10, WEB-07 partial |
| **Спека** | [bot-point-selection.md](../../../product/bot-point-selection.md) · [website-structure.md](../../../product/website-structure.md) |
| **Зависимости** | [02-point-selection-bot.md](./02-point-selection-bot.md) фаза A (`City`, координаты) |
| **Оценка** | 3–5 дней |

## Цель

Третий способ выбора точки после QR и inline-списка: кнопка «🗺 Выбрать на карте» → Mini App с пинами.

## Scope

- [ ] **3.1** Страница `/map` или Mini App route — Leaflet, статичные пины активных точек
- [ ] **3.2** Центр карты по городу пользователя (`User` / default Улан-Удэ)
- [ ] **3.3** Tap на пин → «Печатать здесь» → callback в бот (`point_selected:{slug}`)
- [ ] **3.4** Bot: обработка WebApp `sendData` → обновить batch + карточка заказа
- [ ] **3.5** Кнопка в меню «Изменить точку» (после фазы A задачи 02)

## Не в scope

- Динамическая нагрузка 🟢🟡🔴 (WEB-11) → Sprint 6+
- Upload файлов в Mini App → backlog
- PWA omni-site (WEB-06)

## DoD

- [ ] Из бота открывается карта, выбор точки возвращает slug в batch
- [ ] Mobile-first, работает в Telegram WebApp
