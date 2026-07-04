# 02 — Выбор точки печати в боте (гибридный флоу)

| | |
|---|---|
| **Спринт** | 5 |
| **Статус** | ⬜ |
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

- [ ] **2.1** `User.lastPointId` — последняя точка печати
- [ ] **2.2** `User.preferredPointSlug` — persist вместо in-memory Map (Sprint 1 / 07.4)
- [ ] **2.3** `Point.displayCode` (опц., напр. `102`) для UX-06
- [ ] **2.4** `City` + `Point.cityId`, `address`, `lat`, `lng` (минимум для списка по городу)

### Batch / core

- [ ] **2.5** `OrderBatch.pointId` nullable в `COLLECTING`; при выборе точки — bind + `recalculateBatchTotals`
- [ ] **2.6** `finalizeBatch` запрещён без точки
- [ ] **2.7** Автовыбор `lastPointId` при загрузке файла (если точка `active`)
- [ ] **2.8** Карточка заказа: «⚠️ Выберите точку» / «📍 Точка: …» + кнопка «Изменить точку»

### Bot UX

- [ ] **2.9** Inline «📋 Выбрать из списка» — плоский список активных точек города
- [ ] **2.10** Текстовый код: `102` или `/start 102` → UX-06
- [ ] **2.11** Callbacks: `point_select:{slug}`, `point_change`, `point_list_page:{n}`
- [ ] **2.12** Смена точки в `COLLECTING` → пересчёт цены; после finalize — нельзя
- [ ] **2.13** MAX-паритет (inline callbacks)

### API

- [ ] **2.14** `GET /api/points?city=&active=true` — публичный список для бота

## Scope — фаза B (P1, задача 03)

- Карта / Mini App WEB-10 — см. [03-point-map-miniapp.md](./03-point-map-miniapp.md)

## Scope — фаза C (P2)

- [ ] **2.15** Геолокация «📍 Найти ближайшую» — UX-07
- [ ] **2.16** Автопереключение при offline last point — [point-availability.md](../../../product/point-availability.md) сценарий A
- [ ] **2.17** QR на сломанную точку → предложение соседней — сценарий B

## Не в scope

- QR и deep links в админке → Sprint 4 / 06
- Иерархия Город → ВУЗ → Корпус → backlog
- NFC (UX-08)

## DoD

- [ ] Новый пользователь: файл → «Выберите точку» → список → цена → оплата
- [ ] Повторный: файл → last point автоматически, кнопка «Изменить точку»
- [ ] Смена точки пересчитывает сумму batch
- [ ] Preference переживает redeploy Vercel
- [ ] E2E TG + MAX

## Доки после merge

- [ ] [bot-user-flow.md](../../../product/bot-user-flow.md), [diagram](../../../product/bot-user-flow-diagram.html), [status](../../../product/bot-user-flow-status.md)
- [ ] [bot-point-selection.md](../../../product/bot-point-selection.md) — роадмап ✅
- [ ] [FEATURES.md](../../../project/FEATURES.md) — UX-06, UX-05b
