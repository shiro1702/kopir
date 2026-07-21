# 03 — Карта точек + выбор в Mini App

| | |
|---|---|
| **Спринт** | 5 |
| **Статус** | ✅ |
| **Приоритет** | P1 |
| **Feature** | WEB-10, WEB-07 partial |
| **Спека** | [point-picker-ux.md](../../../product/point-picker-ux.md) · [bot-point-selection.md](../../../product/bot-point-selection.md) |
| **Зависимости** | [10-point-picker-site-mvp.md](./10-point-picker-site-mvp.md) (shared `components/point-picker/`) · [02-point-selection-bot.md](./02-point-selection-bot.md) фаза A |
| **Оценка** | 2–3 дня (после задачи 10) |

## Цель

Третий способ выбора точки после QR и inline-списка: кнопка «🗺 Выбрать на карте» → Mini App с **тем же UI**, что на сайте (список + карта + bottom sheet).

## Scope

- [ ] **3.1** Route `/miniapp/points` (или `/map`) — reuse `PointPickerLayout`, `PointMap`, `PointDetailSheet`
- [ ] **3.2** Telegram WebApp: fullscreen, BackButton, `MainButton` «Выбрать эту точку»
- [ ] **3.3** Tap на пин → bottom sheet (не desktop modal)
- [ ] **3.4** «Печатать здесь» → `Telegram.WebApp.sendData({ type: 'point_selected', slug })`
- [ ] **3.5** Bot: обработка WebApp `sendData` → bind batch + карточка заказа
- [ ] **3.6** Кнопка в меню «Изменить точку» → открывает Mini App (после фазы A задачи 02)
- [ ] **3.7** Список точек без карты как fallback (если Leaflet не загрузился)
- [ ] **3.8** Last point блок вверху экрана — reuse логики [12](./12-point-geolocation-routes.md) когда готова

## Не в scope

- Upload файлов в Mini App → [Sprint 6 / 02](../../sprint-6/tasks/02-print-miniapp.md)
- Геолокация, цветные маркеры → [11](./11-point-schedule-status.md), [12](./12-point-geolocation-routes.md)
- Отдельная страница `/map` на сайте → покрывается [10](./10-point-picker-site-mvp.md) `/print/[city]`
- SEO-страницы точек → [06](./06-print-point-pages.md)

## DoD

- [ ] Из бота открывается Mini App, выбор точки возвращает slug в batch
- [ ] UI совпадает с сайтом (shared components)
- [ ] Mobile-first, bottom sheet на iOS/Android Telegram
