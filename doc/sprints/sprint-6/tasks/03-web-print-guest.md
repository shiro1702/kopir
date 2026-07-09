# 03 — Сайт: печать без логина (WEB-06)

| | |
|---|---|
| **Спринт** | 6 |
| **Статус** | ⬜ |
| **Приоритет** | P0 |
| **Feature** | WEB-06, WEB-07 (shared UI), UX-05 |
| **Спека** | [website-structure.md](../../../product/website-structure.md) · [anonymous-print-legal.md](../../../product/anonymous-print-legal.md) · [multi-city-and-deeplinks.md](../../../product/multi-city-and-deeplinks.md) |
| **Зависимости** | [02-print-miniapp.md](./02-print-miniapp.md) — shared `components/print/`, `usePrintBatch`; Sprint 5: [06-print-point-pages.md](../../sprint-5/tasks/06-print-point-pages.md), карта `/map` |
| **Оценка** | 4–6 дней |

## Проблема

Часть клиентов приходит с **ноутбука или браузера** (SEO «где распечатать», QR на плакате с URL, ссылка из поиска). Сейчас печать только через бота.

Обязательный логин перед печатью — лишнее трение: для MVP не нужны история заказов и профиль. См. [anonymous-print-legal.md](../../../product/anonymous-print-legal.md).

## Цель

Раздел **`/print`** на сайте: клиент **без регистрации** загружает файлы и оплачивает так же, как в Mini App. Один код UI с Mini App; различается только способ идентификации (guest cookie vs `initData` мессенджера).

## Решение: guest session

При первом заходе сервер создаёт **гостевую сессию** (httpOnly cookie) и `User` без `telegramId` / `maxUserId`. Все `OrderBatch` / `Order` работают через существующую модель — без рефакторинга бота.

Опционально позже (P2): **Telegram Login Widget** — привязка guest → TG `User` для истории заказов.

## Scope

### Guest session (P0)

- [ ] **3.1** `POST /api/print/session` — создать или продлить guest-сессию, вернуть `userId` (opaque) + активный batch если есть
- [ ] **3.2** Middleware: читать cookie `kopir_guest`, валидировать, привязывать к `User`
- [ ] **3.3** TTL незавершённых batch (как `batchBuildTimeoutMin`); cleanup orphan uploads
- [ ] **3.4** Rate limit на upload / create batch (как у bot API)

### Маршруты (P0)

- [ ] **3.5** `/print` — wizard сразу, без редиректа на login
- [ ] **3.6** `/print?point={slug}` — preselect точки (с плаката / SEO-страницы)
- [ ] **3.7** Reuse SEO-страницы из Sprint 5: кнопка «Печатать здесь» → `/print?point=slug`

### Wizard печати (reuse Mini App UI)

- [ ] **3.8** Те же шаги, что [02-print-miniapp](./02-print-miniapp.md): файлы → параметры → точка → оплата → статус
- [ ] **3.9** Desktop: drag-and-drop, multi-file; mobile web — file picker
- [ ] **3.10** Оплата TBANK в браузере (redirect / embedded QR — как в боте)
- [ ] **3.11** Return URL после оплаты → тот же guest cookie → экран статуса
- [ ] **3.12** Номер заказа на экране статуса + кнопка «Проблема с печатью» (без аккаунта)

### Интеграция с картой

- [ ] **3.13** С `/map`: «Печатать здесь» ведёт на `/print?point=…` (дополнительно к callback в бот)

### Fallback CTA (P1)

- [ ] **3.14** Блок «Удобнее в Telegram / MAX» — deep link с `point` если есть в URL

### PWA (минимум, P1)

- [ ] **3.15** `manifest.json`, иконки, `theme-color` — «Добавить на экран» (WEB-06 partial)
- [ ] **3.16** Service worker — **не в scope**

### Опционально: Telegram Login (P2, backlog внутри спринта)

- [ ] **3.17** `/print/login` + Telegram Login Widget — привязка guest `User` к `telegramId`
- [ ] **3.18** История последних заказов после входа

## Не в scope

- Регистрация **партнёра** на сайте (ONB-01 web) — Sprint 5
- OAuth VK / Госуслуги
- Полноценный omni-PWA с offline-очередью
- Magic link из бота — backlog

## Безопасность

- Upload только при валидной guest-сессии; rate limit
- Файлы — Vercel Blob, удаление после печати (FILE-07)
- Cookie: `httpOnly`, `Secure`, `SameSite=Lax`
- Не логировать содержимое файлов

## DoD

- [ ] Клиент открывает `/print` без логина, загружает PDF с десктопа
- [ ] Выбор точки → оплата TBANK → печать на агенте (E2E)
- [ ] Закрытие вкладки до оплаты → возврат восстанавливает batch по cookie
- [ ] URL `/print?point=slug` предзаполняет точку
- [ ] С карты `/map` кнопка ведёт на web-wizard
- [ ] UI переиспользует компоненты из задачи 02

## Порядок в спринте

```
1. [02] shared components/print + usePrintBatch + Mini App auth (initData)
2. [03] guest session API + /print wizard (reuse shared UI)
3. [03 P2] Telegram Login — если останется время
```

## Связанные задачи

- Sprint 5: [06-print-point-pages.md](../../sprint-5/tasks/06-print-point-pages.md) — SEO-страницы точек
- Sprint 6: [02-print-miniapp.md](./02-print-miniapp.md)
