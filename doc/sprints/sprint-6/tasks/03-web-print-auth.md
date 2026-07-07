# 03 — Сайт: авторизация клиента и печать (WEB-06)

| | |
|---|---|
| **Спринт** | 6 |
| **Статус** | ⬜ |
| **Приоритет** | P1 |
| **Feature** | WEB-06, WEB-07 (shared UI), UX-05 |
| **Спека** | [website-structure.md](../../../product/website-structure.md) · [multi-city-and-deeplinks.md](../../../product/multi-city-and-deeplinks.md) |
| **Зависимости** | [02-print-miniapp.md](./02-print-miniapp.md) — shared `components/print/`, `usePrintBatch`; Sprint 5: выбор точки, карта `/map` |
| **Оценка** | 4–6 дней |

## Проблема

Часть клиентов приходит с **ноутбука или браузера** (SEO «где распечатать», QR на плакате с URL, ссылка из поиска). Сейчас сайт — лендинг + карта; печать только через бота.

Партнёрская регистрация и web ЛК — Sprint 5 ([WEB-13](../../sprint-5/README.md)). **Клиентский** кабинет на сайте — отдельный scope: лёгкая авторизация без пароля, история не обязательна на MVP.

## Цель

Раздел **`/print`** на сайте: авторизованный клиент загружает файлы и оплачивает так же, как в Mini App. Один код UI с Mini App; различается только способ входа.

## Scope

### Авторизация клиента

- [ ] **3.1** **Telegram Login Widget** на `/print/login` — основной способ (без пароля, тот же `User` по `telegramId`)
- [ ] **3.2** Сессия: httpOnly cookie / JWT после валидации hash виджета на сервере
- [ ] **3.3** Fallback CTA: «Открыть в Telegram» / «Открыть в MAX» — deep link с `point` если есть в URL
- [ ] **3.4** Опционально: magic link из бота (`/auth/link?token=`) для пользователей без Telegram на ПК — P2 внутри спринта

### Маршруты

- [ ] **3.5** `/print` — редирект: не авторизован → login; авторизован → wizard
- [ ] **3.6** `/print?point={slug}` — preselect точки (с плаката / SEO-страницы точки)
- [ ] **3.7** `/print/[city]/[pointSlug]` — SEO-лендинг точки + кнопка «Печатать здесь» → wizard с выбранной точкой

### Wizard печати (reuse Mini App UI)

- [ ] **3.8** Те же шаги, что [02-print-miniapp](./02-print-miniapp.md): файлы → параметры → точка → оплата → статус
- [ ] **3.9** Desktop: drag-and-drop зона, multi-file; mobile web — file picker
- [ ] **3.10** Оплата TBANK в браузере (redirect / embedded QR — как в боте)

### Интеграция с картой

- [ ] **3.11** С `/map` (Sprint 5): «Печатать здесь» ведёт на `/print?point=…` (не только в бот)

### PWA (минимум)

- [ ] **3.12** `manifest.json`, иконки, `theme-color` — «Добавить на экран» на телефоне (WEB-06 partial)
- [ ] **3.13** Service worker — **не в scope** (offline / push → backlog)

## Не в scope

- Регистрация **партнёра** на сайте (ONB-01 web) — Sprint 5
- История заказов клиента, профиль, сохранённые файлы
- OAuth VK / Госуслуги
- Полноценный omni-PWA с offline-очередью

## Безопасность

- Валидация Telegram Login hash на сервере (bot token)
- Upload только для авторизованной сессии; rate limit как у bot API
- Файлы — Vercel Blob, удаление после печати (FILE-07)

## DoD

- [ ] Клиент логинится через Telegram Widget на `/print`
- [ ] Загрузка PDF с десктопа → выбор точки → оплата → печать (E2E)
- [ ] URL `/print?point=slug` с плаката предзаполняет точку
- [ ] С карты `/map` кнопка ведёт на web-wizard, не только в бот
- [ ] UI переиспользует компоненты из задачи 02 (нет дублирования логики оплаты)

## Связанные задачи

- Sprint 5: web ЛК партнёра (отдельный auth flow)
- Sprint 6: [02-print-miniapp.md](./02-print-miniapp.md)
