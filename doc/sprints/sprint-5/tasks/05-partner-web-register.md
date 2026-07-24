# 05 — Регистрация партнёра на сайте

| | |
|---|---|
| **Спринт** | 5 |
| **Статус** | ✅ |
| **Приоритет** | P0 |
| **Feature** | ONB-01 (web), ONB-02 partial |
| **Зависимости** | [09 оферта](../../sprint-4/tasks/09-public-offer.md), [04 web ЛК](./04-partner-web-lk.md) |

## Цель

Владелец копицентра создаёт партнёрский аккаунт на сайте без пароля: Telegram Login + принятие оферты.

## Scope

- `/partner/register` — чекбокс оферты + Telegram Login
- `POST /api/partner/auth/telegram` mode=`register` → создаёт/обновляет `Partner`, пишет `offerAcceptedAt`
- CTA на `/partners` и в хедере → `/partner/register`
- Модель комиссии на старте: 75/25 (как в маркетинге); выбор тарифов ONB-02 полностью — позже

## Не в scope

- Self-service создание точки и скачивание агента (ONB-03) — точка всё ещё через admin/bind
- Email/пароль

## Ops

В BotFather: `/setdomain` на домен сайта (иначе виджет не откроется).

## DoD

- [x] Новый пользователь принимает оферту → `Partner` + сессия → `/partner`
- [x] Уже привязанный в боте telegramId → тот же `Partner`, кабинет с точками
- [x] Без оферты регистрация отклоняется (`OFFER_NOT_ACCEPTED`)
