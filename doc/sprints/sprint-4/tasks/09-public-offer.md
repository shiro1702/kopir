# 09 — Публичная оферта на сайте

| | |
|---|---|
| **Статус** | ✅ |
| **Feature** | ONB-06 |
| **URL** | `/offer` |

## Scope

| Элемент | Реализация |
|---------|------------|
| Страница оферты | `web/pages/offer.vue` — агентский договор-оферта |
| Текст | `web/utils/legal/agent-offer.ts` — версионируемые разделы |
| Реквизиты Агента | `NUXT_PUBLIC_LEGAL_*` в runtime config |
| Footer / header | `components/site/SiteFooter.vue`, `SiteHeader.vue`, layout `marketing` |
| Акцепт в боте | При привязке точки — ссылка на оферту в welcome-сообщении |

## Не в scope

- Юридическая вычитка юристом (черновик по [agent-payments-tbank.md](../../../business/agent-payments-tbank.md))
- Галочка в web-форме регистрации (web ЛК → Sprint 5)
- PDF-версия оферты

## Env

```env
NUXT_PUBLIC_SITE_URL="https://kopir.ru"
NUXT_PUBLIC_LEGAL_ENTITY_NAME="ИП ..."
NUXT_PUBLIC_LEGAL_INN=""
NUXT_PUBLIC_LEGAL_OGRNIP=""
NUXT_PUBLIC_LEGAL_ADDRESS=""
NUXT_PUBLIC_LEGAL_EMAIL="support@kopir.ru"
```

## DoD

- [x] Страница `/offer` на prod, mobile-first
- [x] Ссылка в footer (layout marketing)
- [x] При bind партнёра в боте — упоминание оферты
- [ ] Реквизиты ИП заполнены в prod env (операционно)
- [ ] Юрист утвердил текст (операционно)
