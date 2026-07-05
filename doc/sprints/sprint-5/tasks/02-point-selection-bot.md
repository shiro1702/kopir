# 02 — Выбор точки печати в боте (гибридный флоу)

| | |
|---|---|
| **Спринт** | 5 |
| **Статус** | 🟡 P0 бот |
| **Приоритет** | P0 |
| **Feature** | UX-06, UX-05b (новый), MON-02 расширение |
| **Спека** | [bot-point-selection.md](../../../product/bot-point-selection.md) · [multi-city-and-deeplinks.md](../../../product/multi-city-and-deeplinks.md) |
| **Зависимости** | Sprint 4: QR в админке ([06](../../sprint-4/tasks/06-point-client-links.md)), MON-02 базовый ([07](../../sprint-4/tasks/07-ready-offline-guard.md)) |
| **Оценка** | 4–6 дней |

## Проблема

Сейчас точка резолвится так:

```typescript
const pointSlug = getPointPreference(...) ?? DEFAULT_POINT_SLUG  // → point_dev_1
```

- Preference в памяти (`preferences.ts`) — теряется при рестарте Vercel
- Нет сценария «файлы из дома → выбор точки → оплата»
- При 5+ точках пользователь без QR попадает не туда

QR на стойке закрывает ~95% ([multi-city-and-deeplinks.md](../../../product/multi-city-and-deeplinks.md)); эта задача — оставшиеся 5% + смена точки в пачке.

## Цель

Два сценария из спеки:

| Сценарий | Порядок |
|----------|---------|
| У принтера (QR) | Точка → файлы → оплата ✅ |
| Из дома / без QR | Файлы → точка → оплата ⬜ |

## Scope — фаза A (P0)

### Prisma

- [x] **2.1** `User.lastPointId` — последняя точка печати
- [x] **2.2** `User.preferredPointSlug` — persist вместо in-memory Map (Sprint 1 / 07.4)
- [x] **2.3** `Point.displayCode` (опц., напр. `102`) для UX-06
- [ ] **2.4** `City` + `Point.cityId`; геоданные точки (см. Admin):
  - `address` — строка для UI (из DaData, напр. `ул. Смолина, 24а`)
  - `lat`, `lng` — WGS-84 (`Float`), **обязательны вместе с адресом**; источник — DaData при выборе подсказки
  - индекс по `(cityId, isActive)` для списка; координаты — для расстояния до клиента и сортировки «ближайшие»

### Admin (`/admin/points`)

Поле адреса нужно для списка точек в боте, QR-плаката, карты (задача 03) и расчёта расстояния (UX-07). Сейчас в форме точки есть только `name`, `slug`, цена и оплата — **адреса и координат нет**.

- [ ] **2.4a**–**f** DaData адрес в админке — backlog
- [x] **displayCode** в `/admin/points` (минимальная админка для кодов)

### Гео и расстояние

Координаты точки — единый источник для карты, «ближайшей точки» и сценария offline (соседняя точка).

- [ ] **2.4g** `server/utils/geo.ts` — haversine (км) между двумя `{ lat, lng }`
- [ ] **2.4h** `GET /api/points` отдаёт `lat`, `lng` (только для активных точек с координатами)
- [ ] **2.4i** Точки без координат — в списке бота и на карте, но **исключаются** из сортировки по расстоянию (UX-07)

### Batch / core

- [x] **2.5** `OrderBatch.pointId` nullable в `COLLECTING`; при выборе точки — bind + `recalculateBatchTotals`
- [x] **2.6** `finalizeBatch` запрещён без точки
- [x] **2.7** Автовыбор `lastPointId` при загрузке файла (если точка `active`)
- [x] **2.8** Карточка заказа: «⚠️ Выберите точку» / «📍 Точка: …» + кнопка «Изменить точку»

### Bot UX

- [x] **2.9** Inline «📋 Выбрать из списка» — плоский список активных точек города
- [x] **2.10** Текстовый код: `102` или `/start 102` → UX-06
- [x] **2.11** Callbacks: `point_select:{slug}`, `point_change`, `point_list_page:{n}`
- [x] **2.12** Смена точки в `COLLECTING` → пересчёт цены; после finalize — нельзя
- [x] **2.13** MAX-паритет (inline callbacks)

### API

- [x] **2.14** `GET /api/points?city=&active=true` — публичный список для бота

## Scope — фаза B (P1, задача 03)

- Карта / Mini App WEB-10 — см. [03-point-map-miniapp.md](./03-point-map-miniapp.md)

## Scope — фаза C (P2)

- [ ] **2.15** Геолокация «📍 Найти ближайшую» — UX-07: координаты клиента из Telegram `request_location` → сортировка точек по `haversine` (данные из **2.4g**)
- [ ] **2.16** Автопереключение при offline last point — [point-availability.md](../../../product/point-availability.md) сценарий A: предложить ближайшую активную точку с координатами
- [ ] **2.17** QR на сломанную точку → предложение соседней — сценарий B: та же сортировка по расстоянию

## Не в scope

- QR и deep links в админке → Sprint 4 / 06
- Иерархия Город → ВУЗ → Корпус → backlog
- NFC (UX-08)
- Ручной ввод координат на карте в админке (только DaData-подсказка)

## DoD

- [x] В админке можно задать `displayCode` точки
- [ ] В админке адрес через DaData (отложено)
- [x] Новый пользователь: файл → «Выберите точку» → список → цена → оплата (код)
- [x] Повторный: файл → last point автоматически, кнопка «Изменить точку»
- [x] Смена точки пересчитывает сумму batch
- [x] Preference переживает redeploy Vercel
- [ ] E2E TG + MAX

## Доки после merge

- [ ] [bot-user-flow.md](../../../product/bot-user-flow.md), [diagram](../../../product/bot-user-flow-diagram.html), [status](../../../product/bot-user-flow-status.md)
- [ ] [bot-point-selection.md](../../../product/bot-point-selection.md) — роадмап ✅
- [ ] [FEATURES.md](../../../project/FEATURES.md) — UX-06, UX-05b
