# Sprint 6 — «Рост»

| | |
|---|---|
| **Период** | сентябрь 2026+ |
| **Статус** | ⬜ запланирован |
| **Цель** | Масштаб сети, автоматизация финансов, прогрессивная экономика |
| **Этап roadmap** | [Этап 4+ — Масштабирование](../../roadmap/ROADMAP.md) |
| **Предусловие** | Sprint 5 ✅ 5+ точек, реестр выплат PAY-07 |

## Приоритеты

```
P0: Mini App для печати файлов (TG + MAX) — WEB-07
P0: Сайт `/print` без логина (guest session) — WEB-06
P0: Mass Payments API (PAY-08)
P1: Масштаб выбора точки: фильтры, поиск, кластеры (брейншторм 21.07 этап 3)
P1: Админка контента точки: фото, услуги
P1: Прогрессивная комиссия от оборота точки
P1: Принт-бокс / Linux agent
P2: Реферальная программа, динамическое ценообразование
```

## Задачи

| # | Задача | Статус | Feature | Файл |
|---|--------|--------|---------|------|
| 01 | Комиссия от оборота точки (tiered) | ⬜ | PAY-06b | [tasks/01-tiered-commission.md](./tasks/01-tiered-commission.md) |
| 02 | Mini App: загрузка файлов и оплата (TG + MAX) | ⬜ | WEB-07, FILE-04 | [tasks/02-print-miniapp.md](./tasks/02-print-miniapp.md) |
| 03 | Сайт: печать без логина (guest session) | ⬜ | WEB-06 | [tasks/03-web-print-guest.md](./tasks/03-web-print-guest.md) |
| 05 | Масштаб выбора точки (фильтры, поиск, кластеры) | ⬜ | WEB-10, WEB-11 | [tasks/05-point-picker-scale.md](./tasks/05-point-picker-scale.md) |
| 06 | Админка: фото, услуги, контент точки | ⬜ | WEB-12 | [tasks/06-point-admin-content.md](./tasks/06-point-admin-content.md) |
| — | Mass Payments «Вывести» | ⬜ | PAY-08 | см. [SPRINTS.md](../SPRINTS.md) |
| — | Принт-бокс | ⬜ | BOX-01 | — |
| — | Реферальная программа | ⬜ | MKT-01 | — |

## Definition of Done

- [ ] Mini App: клиент загружает файлы и оплачивает без чата (TG; MAX — по готовности SDK)
- [ ] Сайт `/print`: guest session, загрузка с десктопа без логина + тот же wizard, что Mini App
- [ ] Автовыплаты или one-click withdraw (PAY-08)
- [ ] Комиссия пересчитывается по обороту без ручного SQL
- [ ] 10+ активных точек

## После спринта

→ Backlog: WebSocket hub, Redis, POS, динамическое ценообразование по загрузке
