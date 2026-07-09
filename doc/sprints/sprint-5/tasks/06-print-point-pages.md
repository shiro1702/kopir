# 06 — SEO-страницы точек печати (подготовка к /print)

| | |
|---|---|
| **Спринт** | 5 |
| **Статус** | ⬜ |
| **Приоритет** | P1 |
| **Feature** | WEB-06 partial, WEB-10, UX-05 |
| **Спека** | [website-structure.md](../../../product/website-structure.md) · [multi-city-and-deeplinks.md](../../../product/multi-city-and-deeplinks.md) |
| **Зависимости** | [02-point-selection-bot.md](./02-point-selection-bot.md) фаза A (`address`, `lat`/`lng`); [03-point-map-miniapp.md](./03-point-map-miniapp.md) — общий `GET /api/points` |
| **Оценка** | 2–3 дня |

## Цель

Публичные страницы точек для SEO и плакатов **до** полноценного web-wizard в Sprint 6. Сейчас CTA ведёт в бот; URL-структура и контент готовы к замене кнопки на `/print?point=slug`.

## Scope

### Данные и API

- [ ] **6.1** `GET /api/points` — расширить: `address`, `lat`, `lng`, `agentOnline`, `pricePerPageKopeks` (только активные точки)
- [ ] **6.2** `GET /api/points/[slug]` — публичная карточка одной точки (404 если неактивна)

### Страницы (Nuxt)

- [ ] **6.3** `/print` — редирект на город по умолчанию (Улан-Удэ) или список городов (если `City` готов)
- [ ] **6.4** `/print/[city]` — карта + список точек города (reuse Leaflet из задачи 03)
- [ ] **6.5** `/print/[city]/[slug]` — SEO-страница точки:
  - название, адрес, цена Ч/Б
  - статус агента (🟢 в сети / 🔴 офлайн)
  - CTA «Печатать в Telegram» / «Печатать в MAX» (deep links из админки)
  - заглушка «Скоро: печать с сайта» или скрытая ссылка `/print?point=slug` (feature flag)

### Плакат / QR

- [ ] **6.6** В админке «Ссылка точки»: добавить URL сайта `https://kopir.ru/print/{city}/{slug}` рядом с TG/MAX

## Не в scope

- Guest session, upload, оплата на сайте → [Sprint 6 / 03](../../sprint-6/tasks/03-web-print-guest.md)
- Upload в Mini App → [Sprint 6 / 02](../../sprint-6/tasks/02-print-miniapp.md)
- Динамическая нагрузка 🟢🟡🔴 (WEB-11)

## DoD

- [ ] Страница точки индексируется, открывается с мобильного
- [ ] CTA в бот работает с preselect `point_slug`
- [ ] Офлайн-точка показывает предупреждение до перехода в бот
- [ ] URL-структура совпадает с [website-structure.md](../../../product/website-structure.md)

## После Sprint 6

Заменить CTA «Печатать в Telegram» на «Печатать здесь» → `/print?point=slug` (задача 03, пункт 3.7).
