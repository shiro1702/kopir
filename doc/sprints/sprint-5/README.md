# Sprint 5 — «К 1 сентября»

| | |
|---|---|
| **Период** | ~20 июля – 31 августа 2026 |
| **Статус** | ⬜ запланирован |
| **Цель** | 5+ точек, выбор точки в боте, web ЛК, выплаты, стабильность |
| **Этап roadmap** | [Этап 4 — Масштабирование](../../roadmap/ROADMAP.md#этап-4--масштабирование-sprint-56) |
| **Предусловие** | Sprint 4 ✅ Partner LK, баланс, QR в админке |

## Приоритеты

```
P0: выбор точки в боте (UX-06, last point, список) — 5+ точек
P0: web ЛК v1, регистрация партнёра на сайте
P0: реестр выплат PAY-07 фаза 2
P1: блок выбора точки на сайте (карта + список + модалка) — брейншторм 21.07
P1: статус точки (график), геолокация UX-07, маршрут, фото входа
P1: SEO-страницы точек, лендинг `/print`, SEO-фундамент
P1: Windows Service, алерты, VK-бот
P2: автопереключение offline
```

## Задачи

| # | Задача | Статус | Feature | Файл |
|---|--------|--------|---------|------|
| 01 | Реестр выплат + ручной СБП | ⬜ | PAY-07 | [tasks/01-partner-payouts.md](./tasks/01-partner-payouts.md) |
| 02 | Выбор точки в боте (без QR) | ⬜ | UX-06, UX-05b | [tasks/02-point-selection-bot.md](./tasks/02-point-selection-bot.md) |
| 03 | Карта точек + Mini App | ✅ | WEB-10, WEB-07 | [tasks/03-point-map-miniapp.md](./tasks/03-point-map-miniapp.md) |
| 10 | Блок выбора точки на сайте (MVP этап 1) | ✅ | WEB-10 | [tasks/10-point-picker-site-mvp.md](./tasks/10-point-picker-site-mvp.md) |
| 11 | График работы и статус точки | ✅ | WEB-10, MON-02 | [tasks/11-point-schedule-status.md](./tasks/11-point-schedule-status.md) |
| 12 | Геолокация, маршрут, фото входа | ✅ | UX-07 | [tasks/12-point-geolocation-routes.md](./tasks/12-point-geolocation-routes.md) |
| 13 | Hotfix: гонка при загрузке 5 файлов скопом | ⬜ | FILE-01, UX-15 | [tasks/13-batch-upload-race-hotfix.md](./tasks/13-batch-upload-race-hotfix.md) |
| 06 | SEO-страницы точек (подготовка к web-печати) | ⬜ | WEB-06 partial | [tasks/06-print-point-pages.md](./tasks/06-print-point-pages.md) |
| 07 | Количество копий в боте | ✅ | UX-04 | [tasks/07-print-copies.md](./tasks/07-print-copies.md) |
| 08 | Лендинг `/print` (B2C) | ⬜ | WEB-06, MKT | [tasks/08-client-landing-print.md](./tasks/08-client-landing-print.md) |
| 09 | SEO-фундамент (sitemap, метрика) | ⬜ | WEB-06, MKT | [tasks/09-seo-foundation.md](./tasks/09-seo-foundation.md) |
| — | Прогрессивная комиссия от оборота | ⬜ | PAY-06b | → [Sprint 6 / 01](../sprint-6/tasks/01-tiered-commission.md) |
| 04 | Web ЛК партнёра v1 | ⬜ | WEB-13 | _(спека TBD)_ |
| 05 | Регистрация партнёра на сайте | ⬜ | ONB-01, ONB-02 | _(спека TBD)_ |
| — | Геолокация «ближайшая точка» | ⬜ | UX-07 | [12](./tasks/12-point-geolocation-routes.md), [02](./tasks/02-point-selection-bot.md) фаза C |
| — | VK Bot | ⬜ | WEB-16 | — |
| — | Windows Service, алерты | ⬜ | AGT-06, MON-03–06 | — |

> **Hotfix Sprint 5:** при пересылке 3–5 документов одним действием бот может словить race condition в batch-flow: дубли `batchIndex`, неверный счётчик `Файлов: N из 5`, пробой лимита и скачущую сумму. Исправление вынесено в [задачу 13](./tasks/13-batch-upload-race-hotfix.md).

> **Выбор точки:** QR — [Sprint 4 / 06](../sprint-4/tasks/06-point-client-links.md). Бот — задача 02. Карта/список на сайте — задачи **10–12** ([point-picker-ux.md](../../product/point-picker-ux.md), брейншторм [21.07](../../brainstorm/21.07.2026-INDEX.md)). Mini App карта — задача 03 (reuse `components/point-picker/`).

## Definition of Done

- [ ] 5+ активных точек с QR на стойках
- [ ] Клиент без QR может выбрать точку (список / код) и оплатить
- [ ] Web ЛК: партнёр видит заказы и баланс
- [ ] Реестр выплат экспортируется, баланс списывается после «Выплачено»
- [ ] 0 критических багов в онлайн-оплате

## После спринта

→ [Sprint 6 — Рост](../SPRINTS.md#sprint-6--рост-сентябрь-2026): Mini App печати, web `/print` без логина, Mass Payments, принт-бокс
