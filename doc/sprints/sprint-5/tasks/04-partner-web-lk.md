# 04 — Web ЛК партнёра v1

| | |
|---|---|
| **Спринт** | 5 |
| **Статус** | ✅ |
| **Приоритет** | P0 |
| **Feature** | WEB-13 (web) |
| **Спека** | [website-structure.md](../../../product/website-structure.md) § ЛК |

## Цель

Партнёр входит на сайт через Telegram Login и видит те же данные, что в боте: точки, заказы, баланс, настройки, реквизиты.

## Scope

- Auth: Telegram Login Widget + httpOnly session cookie (`kopir_partner_session`)
- Страницы: `/partner`, `/partner/points`, `/partner/points/[id]`, `/partner/finance`
- API: `GET /api/partner/me`, `GET|PATCH /api/partner/points/:id`, `PATCH /api/partner/requisites`
- QR/links endpoints партнёра переведены на session auth (вместо незащищённых заголовков)

## Не в scope

- Mass Payments / кнопка «Вывести» → Sprint 6
- Создание точки self-service (точку привязывает admin / bot bind)
- MAX Login (только Telegram Login)

## DoD

- [x] Вход существующим `Partner.telegramId` → кабинет
- [x] Дашборд: сегодня, баланс, список точек + online
- [x] Настройки цены / телефонов / онлайн-методов оплаты
- [x] Реквизиты + история баланса
- [x] Без сессии → редирект на `/partner/login`
