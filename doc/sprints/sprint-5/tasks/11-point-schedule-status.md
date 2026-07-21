# 11 — График работы и статус точки

| | |
|---|---|
| **Спринт** | 5 |
| **Статус** | ✅ |
| **Приоритет** | P1 |
| **Feature** | WEB-10, MON-02 расширение, UX-06 |
| **Спека** | [point-picker-ux.md](../../../product/point-picker-ux.md) § Статусы · [point-availability.md](../../../product/point-availability.md) |
| **Зависимости** | [10-point-picker-site-mvp.md](./10-point-picker-site-mvp.md) · [02-point-selection-bot.md](./02-point-selection-bot.md) |
| **Оценка** | 3–4 дня |

## Цель

MVP **этап 2**: понятный статус «открыто / закрыто / скоро закрывается», приём онлайн-заказов, проверка перед оплатой. Цветные маркеры на карте.

## Scope

### Prisma / модель

- [ ] **11.1** `Point.openingHours` — JSON (дни недели → интервалы) или текст для MVP
- [ ] **11.2** `Point.timezone` — default `Asia/Irkutsk` (Улан-Удэ) или из `City`
- [ ] **11.3** `Point.acceptsOnlineOrders` — boolean, default `true`
- [ ] **11.4** `Point.pickupInstructions` — text, default «Назовите оператору номер заказа»
- [ ] **11.5** `Point.estimatedReadyMinutes` — string, напр. `"1-3"`

### Server utils

- [ ] **11.6** `server/utils/point-schedule.ts`:
  - `getPointScheduleStatus(point, now)` → `{ isOpenNow, statusText, closesAt?, opensAt? }`
  - «Скоро закрывается» если до закрытия < 30 мин
- [ ] **11.7** `GET /api/points` и `/api/points/[slug]` — добавить `statusText`, `isOpenNow`, `acceptsOnlineOrders`, `closingSoon`
- [ ] **11.8** `canAcceptOrder(point)` — `isActive && acceptsOnlineOrders && agentOnline && isOpenNow`

### UI (сайт + Mini App)

- [ ] **11.9** Маркеры: зелёный / серый / жёлтый / красный (offline) — [point-picker-ux.md](../../../product/point-picker-ux.md)
- [ ] **11.10** Закрытая точка: без кнопки «Выбрать», текст «Откроется завтра в …»
- [ ] **11.11** «Скоро закрывается» — предупреждение в карточке перед выбором
- [ ] **11.12** Статус приёма заказов отдельной строкой в модалке

### Бот

- [ ] **11.13** Список точек: показывать `statusText` рядом с названием
- [ ] **11.14** Выбор закрытой точки — отказ + «Выберите другую»
- [ ] **11.15** Перед `finalizeBatch` / Init оплаты — `canAcceptOrder`; при fail — сообщение из спеки

### Admin

- [ ] **11.16** `/admin/points`: поля графика (упрощённо: будни/выходные или JSON), `acceptsOnlineOrders`, `pickupInstructions`

## Не в scope

- Динамическая загрузка 🟢🟡🔴 (WEB-11) → backlog
- Отложенный заказ на закрытую точку → backlog
- Автопереключение на соседнюю → [02](./02-point-selection-bot.md) фаза C

## DoD

- [ ] API отдаёт вычисленный `statusText` для каждой точки
- [ ] На карте закрытые точки серые, нельзя выбрать
- [ ] Бот блокирует оплату на offline/закрытую точку
- [ ] Предупреждение «скоро закрывается» при < 30 мин
