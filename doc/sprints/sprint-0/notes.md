# Sprint 0 — заметки и метрики

Заполнять по ходу спринта.

## Реализация (код)

| Компонент | Путь | Статус |
|-----------|------|--------|
| Nuxt web | `web/` | ✅ build ok |
| Prisma schema + migration | `web/prisma/` | ✅ |
| Agent API | `web/server/api/agent/` | ✅ |
| Telegram bot | `web/server/api/telegram/` | ✅ |
| Admin UI | `web/app/pages/admin/` | ✅ |
| Desktop agent | `desktop/agent/` | ✅ |

## Окружение

| Параметр | Значение |
|----------|----------|
| ОС агента (dev) | macOS — `lp` |
| ОС агента (копицентр) | Windows — SumatraPDF |
| Имя принтера | _заполнить после E2E_ |
| Sumatra / lp | lp (dev), SumatraPDF (prod) |
| PostgreSQL | Neon (free) |
| PDF-хранилище | Vercel Blob |
| Хостинг API | Vercel |
| Tunnel (webhook) | `*.vercel.app` |

## Деплой (чеклист)

1. Vercel: Root Directory = `web`, env из `web/.env.example`
2. `DATABASE_URL=... npm run db:deploy && npm run db:seed` (в `web/`)
3. `ADMIN_SECRET=... ./scripts/deploy-checklist.sh https://YOUR_APP.vercel.app`
4. Desktop: `cp .env.example .env`, `SERVER_URL` = Vercel URL, `python -m agent.main`

## Метрики печати

| Тест | Страниц | Сек до старта печати | OK |
|------|---------|----------------------|-----|
| 1 | | | ⬜ |
| 2 | | | ⬜ |
| 3 | | | ⬜ |
| 4 | | | ⬜ |
| 5 | | | ⬜ |

**Среднее:** ___ сек

## E2E сценарии

- **E2E-01** happy path: PDF → bot → admin pay → agent print → PRINTED
- **E2E-02** не-PDF отклоняется
- **E2E-03** agent offline → pay → agent start → print
- **E2E-04** printer error → FAILED

## Партнёр

| Поле | Значение |
|------|----------|
| Название | |
| Адрес | |
| Контакт | |
| Дата теста Sprint 1 | |

## Решения спринта

- `POINT_ID` в агенте = slug точки (`point_dev_1`), не cuid
- Агент скачивает PDF только через `/api/agent/orders/:id/file`
- Blob удаляется после `PRINTED` / `FAILED`

## Блокеры

- E2E требует заполненные env на Vercel (Neon, Blob, Telegram token)
