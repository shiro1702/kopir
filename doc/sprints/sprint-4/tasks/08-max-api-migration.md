# 08 — Миграция MAX Bot API на platform-api2.max.ru

| | |
|---|---|
| **Статус** | ⬜ |
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

## Что уже есть в проекте

| Компонент | Статус | Где |
|-----------|--------|-----|
| Сертификаты НУЦ Минцифры (root + sub) | ✅ | `web/certs/russian-trusted-ca-bundle.pem` |
| TLS для исходящих запросов с bundle | ✅ только T-Bank | `web/server/utils/payments/tbank-fetch.ts` |
| MAX webhook (входящие от MAX → Vercel) | ✅ не меняется | `web/server/api/max/webhook.post.ts` |
| Токены `MAX_BOT_TOKEN`, `MAX_WEBHOOK_SECRET` | ✅ не меняются | env / Vercel |
| Базовый URL MAX API | ❌ старый | `web/server/utils/max/client.ts` → `platform-api.max.ru` |
| TLS для MAX API (исходящие) | ❌ обычный `fetch()` | `web/server/utils/max/client.ts` |

**Важно:** сертификат Минцифры мы уже добавляли для **Т-Банка** (Sprint 3). Для **MAX** он пока не подключён — клиент MAX использует глобальный `fetch()` без Russian Trusted CA.

## Что сломается без миграции

Исходящие вызовы из `MaxClient`:

- `POST /subscriptions` — регистрация webhook
- `POST /messages`, `PUT /messages` — ответы клиенту, кнопки, статусы
- `POST /answers` — callback-кнопки
- `POST /uploads` + upload по URL — staff PDF, файлы
- `GET /messages` — получение сообщения по id

Входящие webhook'и (MAX → `https://kopir-seven.vercel.app/api/max/webhook`) **не затрагиваются**.

## План работ

### 8.1 — Сменить базовый URL API

**Файл:** `web/server/utils/max/client.ts`

```diff
-const MAX_API_BASE = 'https://platform-api.max.ru'
+const MAX_API_BASE = 'https://platform-api2.max.ru'
```

### 8.2 — Подключить Russian Trusted CA к MAX-клиенту

**Рекомендация:** вынести общий fetch из `tbank-fetch.ts` в `web/server/utils/trusted-ca-fetch.ts` (или переименовать `tbank-fetch.ts`), чтобы T-Bank и MAX использовали один механизм.

Логика (уже реализована для T-Bank):

1. Искать `web/certs/russian-trusted-ca-bundle.pem` (пути для Vercel `/var/task/...` уже учтены)
2. Опционально — `NODE_EXTRA_CA_CERTS` из env
3. undici `Agent` с `ca = [...tls.rootCertificates, extraPem]`
4. Все исходящие запросы MAX — через этот fetch (включая `downloadFile` и `uploadFile`, если URL ведёт на домены с сертификатом Минцифры)

**Файлы:**

- `web/server/utils/payments/tbank-fetch.ts` → реэкспорт или thin wrapper
- `web/server/utils/max/client.ts` — заменить `fetch()` на `trustedCaFetch()`

`NODE_EXTRA_CA_CERTS` в Vercel **не обязателен**, если bundle лежит в `web/certs/` (как для T-Bank).

### 8.3 — Обновить документацию

- [ ] `doc/dev/ENV_SETUP.md` — секция MAX: упомянуть `platform-api2.max.ru` и reuse bundle из `web/certs/`
- [ ] `doc/project/FEATURES.md` — WEB-15: `platform-api2.max.ru`
- [ ] `doc/project/BOT_MESSENGERS.md` — при необходимости ссылка на эту задачу

### 8.4 — Деплой и проверка

**Деплой:** push → Vercel production.

**Перерегистрация webhook (если нужно):**

```bash
cd web
ADMIN_SECRET=xxx ./scripts/set-bot-webhooks.sh https://kopir-seven.vercel.app
```

**Чеклист E2E в MAX:**

- [ ] `/start` — приветствие
- [ ] Отправка PDF → batch / оплата
- [ ] Inline-кнопки (оплата, «Проверить оплату»)
- [ ] Staff-уведомление в MAX (`STAFF_MAX_USER_ID` или `/bind`)
- [ ] Нет TLS-ошибок в логах Vercel (`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, `certificate verify failed`)

**Быстрая проверка TLS локально:**

```bash
cd web
node -e "
const { tbankFetch } = require('./server/utils/payments/tbank-fetch.ts');
// после рефактора — trustedCaFetch на platform-api2
"
```

Или curl с bundle (для диагностики):

```bash
curl -v --cacert web/certs/russian-trusted-ca-bundle.pem \
  -H "Authorization: \$MAX_BOT_TOKEN" \
  "https://platform-api2.max.ru/me"
```

## Дополнительно (уже выполнено / не блокер)

| Требование MAX | Статус |
|----------------|--------|
| Webhook только HTTPS (с 25.05.2026) | ✅ Vercel |
| Доверенный сертификат на webhook URL | ✅ Vercel |
| Не передавать токен в query | ✅ заголовок `Authorization` |
| Лимит 30 rps на `platform-api2.max.ru` | ✅ для нашего объёма достаточно |

## DoD

- [ ] `MAX_API_BASE` = `https://platform-api2.max.ru`
- [ ] Исходящие запросы MAX проходят TLS с Russian Trusted CA (тот же bundle, что T-Bank)
- [ ] Prod: бот отвечает в MAX, оплата и staff-канал работают
- [ ] Документация обновлена

## Ссылки

- [MAX API docs](https://dev.max.ru/docs-api)
- [GET /updates — пример с platform-api2](https://dev.max.ru/docs-api/methods/GET/updates)
- [Т-Банк: migration Russian Trusted CA](https://developer.tbank.ru/eacq/intro/certificates/migration-russian-trusted-ca) — тот же bundle
- Код сейчас: [`max/client.ts`](../../../../web/server/utils/max/client.ts), [`tbank-fetch.ts`](../../../../web/server/utils/payments/tbank-fetch.ts)
