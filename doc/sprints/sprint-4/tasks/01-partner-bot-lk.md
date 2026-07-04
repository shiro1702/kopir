# 01 — Partner bot: bind + меню ЛК

| | |
|---|---|
| **Статус** | ⬜ |
| **Feature** | ONB-01 (bot), WEB-13 (bot), ONB-09 pattern |
| **Спека** | [website-structure.md](../../../product/website-structure.md) § ЛК → табы 1–2 |

## Scope

### Prisma

- `Partner` (telegram/max user id, name, requisites JSON)
- `Point.partnerId` (nullable → required для prod-точек)
- `PartnerBindToken` (аналог `BindToken` для staff)

### Bot flow

1. Admin создаёт точку → «Partner» token в `/admin/points`
2. Партнёр: `/partner bind_xxx` или deep link → привязка к точке(ам)
3. Главное меню партнёра:
   - **Статус** — агент online/offline (`lastSeenAt`), принтер
   - **Заказы** — сегодня / неделя / месяц (стр., ₽)
   - **Настройки** — цена за стр., `paymentMethodsEnabled`, телефон СБП
   - **Баланс** — см. [02-balance-accrual.md](./02-balance-accrual.md)
   - **QR и ссылки** — reuse [06-point-client-links.md](./06-point-client-links.md) (P2)

### Не в scope

- Web-регистрация, Telegram Login на сайте
- Mini App upload
- Автоопределение принтера (ONB-04) → Sprint 5
- Админ-панель «Ссылка точки» (задача 06) — отдельная задача; в ЛК партнёра только read-only блок после 06

## DoD

- [ ] Партнёр видит только свои точки
- [ ] Изменение цены в боте → следующий заказ по новой цене
- [ ] MAX-паритет (callbacks / команды)
