# Sprint 4 — «ЛК партнёра в боте»

| | |
|---|---|
| **Период** | 5 – 19 июля 2026 (~2 недели) |
| **Статус** | 🔵 АКТИВНЫЙ |
| **Цель** | Партнёр управляет точкой через Telegram/MAX: статус, настройки, баланс. **Без web-регистрации** — web ЛК позже |
| **Этап roadmap** | [Этап 3 — Онбординг](../../roadmap/ROADMAP.md#этап-3--онбординг-без-созвона-sprint-4) |
| **Предусловие** | Sprint 3 ✅ prod Т-Банк, webhook |

## Решение 05.07.2026: бот, не сайт

- **Главный канал ЛК** — partner-бот (или режим в существующем боте): `/partner`, deep link, меню
- **Web-регистрация (ONB-01 web)** и **web-кабинет (WEB-13 web)** → Sprint 5+
- **Лендинг `/partners`** — отдельная задача P1 (маркетинг → бот)

Спека UX ЛК: [website-structure.md](../../product/website-structure.md) (экраны → переносим в бот поэтапно).

## Приоритеты

```
P0: partner bind → меню ЛК → статус точки/агента → настройки точки
P0: начисление комиссии при онлайн-оплате + баланс в боте (PAY-06)
P1: «Ссылка точки» — QR + deep links TG/MAX в админке (первая неделя)
P1: лендинг /partners (B2B)
P1: UX-10 «Готово!», MON-02 offline
P0 ⚠️: миграция MAX API → platform-api2.max.ru (дедлайн 19.07)
P2: PDF-плакат A4, QR в Partner ЛК; ~~оферта на сайте (ONB-06)~~ ✅
```

## Задачи

| # | Задача | Статус | Feature | Файл |
|---|--------|--------|---------|------|
| 01 | Partner bind + модель `Partner` | ⬜ | ONB-01 bot | [tasks/01-partner-bot-lk.md](./tasks/01-partner-bot-lk.md) |
| 02 | Меню ЛК: статус, заказы, агент online | ⬜ | WEB-13 bot | [tasks/01-partner-bot-lk.md](./tasks/01-partner-bot-lk.md) |
| 03 | Настройки точки в боте (цена, способы оплаты) | ⬜ | WEB-12 | [tasks/01-partner-bot-lk.md](./tasks/01-partner-bot-lk.md) |
| 04 | Начисление комиссии + баланс партнёра | ✅ | PAY-06 | [tasks/02-balance-accrual.md](./tasks/02-balance-accrual.md) |
| 05 | Лендинг `/partners` → CTA в бот | ⬜ | MKT | [tasks/03-partner-landing.md](./tasks/03-partner-landing.md) |
| 06 | «Ссылка точки»: QR + deep links в админке | ⬜ | UX-05, ONB-05 | [tasks/06-point-client-links.md](./tasks/06-point-client-links.md) |
| 07 | «Готово!» + блок offline-точки | ⬜ | UX-10, MON-02 | [tasks/07-ready-offline-guard.md](./tasks/07-ready-offline-guard.md) |
| 08 | **MAX API → platform-api2 + TLS Минцифры** | ✅ | WEB-15 | [tasks/08-max-api-migration.md](./tasks/08-max-api-migration.md) |
| 09 | Публичная оферта `/offer` | ✅ | ONB-06 | [tasks/09-public-offer.md](./tasks/09-public-offer.md) |

> **⚠️ Задача 08 — дедлайн 19.07.2026** (уведомление MAX). Сертификат в `web/certs/` уже есть для T-Bank; нужно переключить URL и подключить тот же fetch в MAX-клиент.

> **PAY-07 (выплаты):** фаза 1 (баланс) — задача 04; фаза 2 (реестр, переводы) → [Sprint 5](../SPRINTS.md#sprint-5--к-1-сентября). См. [partner-payouts.md](../../business/partner-payouts.md).

## Definition of Done

- [ ] Партнёр привязан к точке через бот (без Prisma Studio)
- [ ] В боте: 🟢/🔴 агент, заказы за день/неделю, изменение цены
- [ ] После онлайн-оплаты — начисление на баланс партнёра (видно в боте)
- [ ] Лендинг `/partners` опубликован с CTA «Стать партнёром» → бот
- [ ] В админке: «Ссылка точки» с QR TG/MAX для каждой точки
- [x] MAX-бот на `platform-api2.max.ru` до 19.07 (задача 08)

## После спринта

→ [Sprint 5](../sprint-5/README.md): выбор точки в боте, web ЛК, реестр выплат (PAY-07), 5+ точек
