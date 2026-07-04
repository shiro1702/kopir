# 06 — «Ссылка точки»: QR и deep links в админке

| | |
|---|---|
| **Статус** | ⬜ |
| **Приоритет** | P1 (первая неделя Sprint 4) |
| **Feature** | UX-05 admin, ONB-05 partial, AGT-11 partial |
| **Спека** | [bot-point-selection.md](../../../product/bot-point-selection.md) · [BOT_MESSENGERS.md](../../../project/BOT_MESSENGERS.md) § Deep link |
| **Зависимости** | Sprint 2: `/admin/points`, `TELEGRAM_BOT_USERNAME` |
| **Оценка** | 1–2 дня |

## Проблема

Кнопка **«Ссылка клиенту»** в [`/admin/points`](https://kopir-seven.vercel.app/admin/points) только копирует одну TG-ссылку в буфер. Нет:

- панели со всеми ссылками (как у «Сотрудники» / «Программа печати»);
- QR-кодов для печати на стойке;
- MAX deep link для клиентов;
- отдельного payload `/start`;
- скачивания PDF-плаката (задачи Sprint 1 [07](../../sprint-1/tasks/07-qr-deeplink.md) / [08](../../sprint-1/tasks/08-qr-poster.md) — не закрыты в UI).

95% клиентов приходят через QR на точке — без этого нельзя масштабировать 2–3+ точки.

## Цель

Заменить **«Ссылка клиенту»** на **«Ссылка точки»** → раскрывающаяся панель с QR и ссылками для копирования.

## Scope

### UI (`web/pages/admin/points.vue`)

- Кнопка **«Ссылка точки»** → панель `clientLinks` (паттерн как `tokenResult` для staff/agent).
- Шапка: название точки, slug, цена, 🟢/🔴 агент.

**Блок Telegram:**

| Элемент | Содержание |
|---------|------------|
| Deep link | `https://t.me/{username}?start={slug}` |
| Payload | `{slug}` (напр. `point_bgu_1`) |
| QR | PNG ~300×300, on-the-fly |
| Кнопки | «Открыть в Telegram», «Скопировать ссылку», «Скопировать payload» |

**Блок MAX** (если `maxConfigured`):

| Элемент | Содержание |
|---------|------------|
| Deep link | из env `MAX_BOT_LINK` + payload (см. [max/handler.ts](../../../../web/server/utils/max/handler.ts) `bot_started.payload`) |
| QR | PNG для MAX-ссылки |
| Fallback | «Откройте бота в MAX → `/start {slug}`» |

**Блок «Универсально»** (заглушка до WEB-09):

- `{siteUrl}/go?point={slug}` — текст «скоро» или disabled.

### Backend

- [ ] **6.1** `web/server/utils/point-links.ts` — `buildPointClientLinks(slug)`:
  - `telegramDeepLink`, `telegramPayload`, `maxDeepLink`, `maxPayload`, `goLink`
- [ ] **6.2** `GET /api/admin/points/[id]/links` — JSON ссылок (reuse admin auth)
- [ ] **6.3** `GET /api/admin/points/[id]/qr?platform=telegram|max` — PNG (`qrcode` npm)
- [ ] **6.4** Env: `MAX_BOT_LINK` (или `MAX_BOT_USERNAME`) в `.env.example`, `admin/config.get.ts`

### Фаза 2 (P2, тот же спринт или хвост)

- [ ] **6.5** `GET /api/admin/points/[id]/poster.pdf` — A4 плакат с QR TG (+ MAX мелко), см. [08-qr-poster.md](../../sprint-1/tasks/08-qr-poster.md)
- [ ] **6.6** Кнопка «Скачать плакат» в панели «Ссылка точки»
- [ ] **6.7** Тот же блок «QR и ссылки» в **Partner ЛК** (задача 03) — reuse `point-links.ts`

## Не в scope

- Универсальный редиректор `/go?point=` (WEB-09) → Sprint 5
- Выбор точки в боте без QR (UX-06) → [Sprint 5 / 02](../../sprint-5/tasks/02-point-selection-bot.md)
- VK deep link → Sprint 5

## DoD

- [ ] Админ открывает «Ссылка точки» → видит TG + MAX ссылки и QR
- [ ] QR TG сканируется с 30–50 см → бот открывается с правильным `start={slug}`
- [ ] Заказ после скана создаётся на этой точке (`Order.pointId`)
- [ ] Без `TELEGRAM_BOT_USERNAME` — предупреждение (как у staff bind)
- [ ] Partner ЛК: партнёр видит QR своей точки (после 6.7)

## Доки после merge

- [ ] [bot-point-selection.md](../../../product/bot-point-selection.md) — QR admin ✅
- [ ] [SPRINTS.md](../../SPRINTS.md), [sprint-1/tasks/07](../../sprint-1/tasks/07-qr-deeplink.md), [08](../../sprint-1/tasks/08-qr-poster.md)
- [ ] [FEATURES.md](../../../project/FEATURES.md) — ONB-05 partial
