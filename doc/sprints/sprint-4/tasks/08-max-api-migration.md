# 08 — Миграция MAX Bot API на platform-api2.max.ru

| | |
|---|---|
| **Статус** | ✅ done |
| **Приоритет** | **P0 — срочно** |
| **Дедлайн** | **19 июля 2026** (уведомление MAX) |
| **Feature** | WEB-15 |
| **Спека** | [dev.max.ru/docs-api](https://dev.max.ru/docs-api) · [BOT_MESSENGERS.md](../../../project/BOT_MESSENGERS.md) |
| **Оценка** | 0.5–1 день |

## Контекст

MAX прислал уведомление разработчикам:

> Для корректной работы чат-ботов и мини-приложений просим до **19 июля** перейти с `platform-api.max.ru` на `platform-api2.max.ru` и добавить сертификат Минцифры как доверенный.

Поддержка: [max.ru/business_support_bot](https://max.ru/business_support_bot)

После 19 июля старый домен отключается — MAX-бот перестанет отвечать: не будут уходить сообщения, кнопки, staff-уведомления.

## Реализация (05.07.2026)

| Компонент | Статус | Где |
|-----------|--------|-----|
| Сертификаты НУЦ Минцифры (root + sub) | ✅ | `web/certs/russian-trusted-ca-bundle.pem` |
| Общий TLS fetch | ✅ | `web/server/utils/trusted-ca-fetch.ts` |
| T-Bank re-export | ✅ | `web/server/utils/payments/tbank-fetch.ts` |
| MAX API base URL | ✅ | `platform-api2.max.ru` в `max/client.ts` |
| MAX исходящие через trusted CA | ✅ | `max/client.ts` — все 3 `fetch()` |
| PEM bundle (newline между cert) | ✅ | исправлен `russian-trusted-ca-bundle.pem` |
| MAX webhook (входящие) | ✅ без изменений | `web/server/api/max/webhook.post.ts` |

## План работ

### 8.1 — Сменить базовый URL API

- [x] `MAX_API_BASE` = `https://platform-api2.max.ru` в `web/server/utils/max/client.ts`

### 8.2 — Подключить Russian Trusted CA к MAX-клиенту

- [x] `web/server/utils/trusted-ca-fetch.ts` — общая логика undici Agent + bundle
- [x] `tbank-fetch.ts` → re-export `trustedCaFetch as tbankFetch`
- [x] `max/client.ts` — `trustedCaFetch()` в `request`, `downloadFile`, `uploadFile`

### 8.3 — Обновить документацию

- [x] `doc/dev/ENV_SETUP.md`
- [x] `doc/project/FEATURES.md`
- [x] `web/.env.example`

### 8.4 — Деплой и проверка

**Деплой:** push → Vercel production.

**Перерегистрация webhook (после деплоя):**

```bash
cd web
ADMIN_SECRET=xxx ./scripts/set-bot-webhooks.sh https://kopir-seven.vercel.app
```

- [x] `npm run test` — 15/15 pass
- [x] TLS smoke: `trustedCaFetch` → `platform-api2.max.ru/me` → 401 (TLS ok)
- [x] Деплой Vercel + `set-webhooks` + E2E в MAX

- [x] `/start` — приветствие
- [x] Отправка PDF → batch / оплата
- [x] Inline-кнопки (оплата, «Проверить оплату»)
- [x] Staff-уведомление в MAX (`STAFF_MAX_USER_ID` или `/bind`)
- [x] Нет TLS-ошибок в логах Vercel

**Диагностика TLS:**

```bash
curl -v --cacert web/certs/russian-trusted-ca-bundle.pem \
  -H "Authorization: \$MAX_BOT_TOKEN" \
  "https://platform-api2.max.ru/me"
```

## DoD

- [x] `MAX_API_BASE` = `https://platform-api2.max.ru`
- [x] Исходящие запросы MAX через Russian Trusted CA
- [x] Prod E2E в MAX после деплоя
- [x] Документация обновлена

## Ссылки

- [MAX API docs](https://dev.max.ru/docs-api)
- [GET /updates — пример с platform-api2](https://dev.max.ru/docs-api/methods/GET/updates)
- Код: [`trusted-ca-fetch.ts`](../../../../web/server/utils/trusted-ca-fetch.ts), [`max/client.ts`](../../../../web/server/utils/max/client.ts)
