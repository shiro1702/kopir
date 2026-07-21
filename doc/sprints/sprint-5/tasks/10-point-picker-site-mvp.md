# 10 — Блок выбора точки на сайте (MVP этап 1)

| | |
|---|---|
| **Спринт** | 5 |
| **Статус** | ⬜ |
| **Приоритет** | P1 |
| **Feature** | WEB-10, WEB-06 partial |
| **Спека** | [point-picker-ux.md](../../../product/point-picker-ux.md) · [21.07.2026-INDEX.md](../../../brainstorm/21.07.2026-INDEX.md) |
| **Зависимости** | [02-point-selection-bot.md](./02-point-selection-bot.md) (`GET /api/points`, `address`, `lat`/`lng`) · [06-point-client-links.md](../../sprint-4/tasks/06-point-client-links.md) (deep links) |
| **Оценка** | 4–5 дней |

## Цель

MVP **этап 1** из брейншторма 21.07: на сайте — полноценный выбор точки (карта + список + карточка), кнопка «Выбрать» ведёт в бота с `point_{slug}`.

Заменяет статический блок `#points` на главной ([Sprint 4 / 10](../../sprint-4/tasks/10-homepage-landing.md)).

## Scope

### Shared components

```
web/
├── components/point-picker/
│   ├── PointMap.vue           # Leaflet + OSM
│   ├── PointList.vue          # sidebar / stacked list
│   ├── PointBalloon.vue       # короткая карточка на маркере
│   ├── PointDetailSheet.vue   # модалка desktop / bottom sheet mobile
│   └── PointPickerLayout.vue  # list + map grid
├── composables/usePointPicker.ts
└── composables/usePointMap.ts   # Leaflet init, markers
```

- [ ] **10.1** `usePointPicker` — fetch `GET /api/points?city=&active=true`, selected slug, sync list ↔ map
- [ ] **10.2** `PointMap` — Leaflet, OSM tiles, маркеры активных точек с координатами
- [ ] **10.3** `PointList` — карточки: название, адрес, цена; клик → центр карты + highlight
- [ ] **10.4** `PointBalloon` — короткий popup на маркере: [Выбрать] [Подробнее]
- [ ] **10.5** `PointDetailSheet` — полная карточка (без фото на этом этапе)
- [ ] **10.6** Mobile: bottom sheet вместо centered modal (`PointDetailSheet`)

### Страницы

- [ ] **10.7** `/print/[city]` — `PointPickerLayout` (reuse из задачи 06)
- [ ] **10.8** Секция `#points` на главной `/` — embed или ссылка «Все точки на карте» → `/print/{city}`
- [ ] **10.9** Desktop: `[список | карта]`; mobile: карта + bottom sheet

### CTA «Выбрать точку»

- [ ] **10.10** `useClientBotLinks().telegramPointUrl(slug)` → `?start=point_{slug}`
- [ ] **10.11** MAX-аналог если настроен
- [ ] **10.12** Клик «Выбрать» в списке / модалке / балуне → тот же deep link

### API (расширение)

- [ ] **10.13** `GET /api/points` — поля для UI: `name`, `slug`, `address`, `lat`, `lng`, `pricePerPageKopeks`, `agentOnline`
- [ ] **10.14** Точки без `lat`/`lng` — только в списке, без маркера

## Не в scope (→ другие задачи)

- Геолокация, расстояние → [12-point-geolocation-routes.md](./12-point-geolocation-routes.md)
- Статус «открыто/закрыто» по графику → [11-point-schedule-status.md](./11-point-schedule-status.md)
- Цветные маркеры по статусу → задача 11
- Mini App → [03-point-map-miniapp.md](./03-point-map-miniapp.md)
- Фильтры, поиск, кластеры → [Sprint 6 / 05](../../sprint-6/tasks/05-point-picker-scale.md)
- SEO-страница точки → [06-print-point-pages.md](./06-print-point-pages.md)

## DoD

- [ ] `/print/{city}`: карта OSM + список, mobile-first
- [ ] Tap маркер → балун; «Подробнее» → bottom sheet / modal
- [ ] «Выбрать» → Telegram с preselect точки
- [ ] Компоненты переиспользуются в Mini App (задача 03)
- [ ] Skeleton при загрузке точек

## Чеклист приёмки

- [ ] iPhone Safari: bottom sheet не обрезается, tap targets ≥ 44px
- [ ] Desktop: список скроллится независимо от карты
- [ ] Точка без координат видна в списке, но не на карте
- [ ] Deep link открывает бота с правильной точкой
