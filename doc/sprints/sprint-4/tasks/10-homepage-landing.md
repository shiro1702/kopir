# 10 — Главная страница `/`

| | |
|---|---|
| **Статус** | ⬜ |
| **Приоритет** | P1 |
| **Feature** | WEB-06 partial, MKT |
| **Спека** | [landing-pages-spec.md](../../../marketing/texts/landing-pages-spec.md) § 4 · [website-structure.md](../../../product/website-structure.md) § «Главная» |
| **Зависимости** | [03-partner-landing.md](./03-partner-landing.md) (CTA `start=partner`, header) · [09-public-offer.md](./09-public-offer.md) ✅ (оферта, `useLegalEntity`) |
| **Оценка** | 1,5–2 дня |

## Цель

Заменить заглушку `pages/index.vue` на **маркетинговую главную**: узкий оффер А4 ч/б, объяснение сервиса и бота, точки печати, короткий B2B-блок, FAQ, юридический футер.

Сайт — вход в бота для клиентов и партнёров (бот не индексируется).

## Scope

### Страница `pages/index.vue`

`definePageMeta({ layout: 'marketing' })`

| # | Секция | id якоря | Ключевое содержание |
|---|--------|----------|---------------------|
| 1 | Hero | — | H1, подзаголовок, бейджи, CTA ×2, сноска «только А4 ч/б» |
| 2 | Что это за сервис | `#about` | Не заменяем весь копицентр |
| 3 | Как работает | `#how` | 4 шага + CTA «Распечатать в Telegram» |
| 4 | Что умеет бот | — | Только реально работающие функции; roadmap честно |
| 5 | Для каких документов | — | Список типовых А4 |
| 6 | Цена | — | «от X ₽/стр.» — min из активных точек или константа пилота |
| 7 | Точки печати | `#points` | Статический список или `GET /api/points` (если готов); иначе заглушка пилота |
| 8 | Другие услуги | — | Справочный блок, не автозаказ |
| 9 | Для копицентров | `#partners` | Короткий B2B + CTA + ссылка на `/partners` |
| 10 | Инфо-стенд | — | Что даёт страница точки (preview → Sprint 5 / 06) |
| 11 | FAQ | `#faq` | 6–8 вопросов |
| 12 | Финальный CTA | — | Повтор кнопок hero |

Готовые тексты — [брейншторм 20.06.2026 §17](../../../brainstorm/20.06.2026.md) (стр. ~2317+).

### Header (`SiteHeader.vue`)

Обновить навигацию marketing layout:

| Элемент | Действие |
|---------|----------|
| Якоря | Как работает → `#how` · FAQ → `#faq` |
| Точки печати | `#points` или `/print/{city}` когда будет |
| Для копицентров | `/partners` |
| CTA primary | «Распечатать в Telegram» → `useClientBotLinks()` |
| CTA secondary | «Подключить точку» → `usePartnerBotLinks()` |

Mobile: CTA видны в шапке или sticky bar (tap target ≥ 44px).

### Footer (`SiteFooter.vue`)

Расширить минимальный футер:

- [ ] **10.1** ИНН, ОГРНИП из `useLegalEntity()` (уже в composable, env `NUXT_PUBLIC_LEGAL_*`)
- [ ] **10.2** Email + Telegram поддержки
- [ ] **10.3** Ссылки: Оферта · Партнёрам · (заглушка «Политика конфиденциальности» — P2)
- [ ] **10.4** © год + полное наименование ИП

### Тексты и composables

```
web/
├── pages/index.vue
├── utils/marketing/home-landing.ts    # тексты всех блоков + FAQ
├── composables/useClientBotLinks.ts   # ?start=print (или без payload)
└── composables/usePartnerBotLinks.ts  # ?start=partner (reuse из задачи 03)
```

- [ ] **10.5** `home-landing.ts` — константы блоков (версионируемо, как `partner-landing.ts`)
- [ ] **10.6** `useClientBotLinks` — `telegramPrintUrl`, `maxPrintUrl?`
- [ ] **10.7** `useSeoMeta` на главной (Title, Description, OG)

### SEO на странице

| Поле | Значение |
|------|----------|
| Title | Печать документов А4 ч/б через Telegram — быстро и без флешки |
| Description | Загрузите документ в Telegram-бот, выберите количество копий… |
| H1 | Быстрая печать документов А4 ч/б через Telegram |
| Schema.org | `FAQPage` (JSON-LD), опционально `Organization` |

Технический SEO (sitemap, robots, Метрика) → [Sprint 5 / 09](../../sprint-5/tasks/09-seo-foundation.md).

### Что умеет бот (текущая версия — писать честно)

- Принимает файл (PDF, DOCX)
- Выбор количества копий (1–10)
- Расчёт стоимости до оплаты
- Онлайн-оплата (СБП/карта)
- Адрес и график точки (после QR / выбора точки)
- Номер заказа

**Не обещать на главной:** диапазон страниц, цветная печать, выбор точки без QR (если ещё не в prod).

## Не в scope

- Полноценная карта Leaflet на главной → Sprint 5 / 03
- Динамические карточки точек с API → можно статикой пилота; полный API — Sprint 5 / 06
- Блог, sitemap, Яндекс Метрика → Sprint 5 / 09
- Отдельный лендинг `/print` → Sprint 5 / 08 (главная может дублировать оффер, `/print` — SEO-страница)

## DoD

- [ ] `/` на prod с `layout: marketing`, не заглушка Sprint 0
- [ ] Две CTA в hero ведут в бота: `start=print` и `start=partner`
- [ ] Header: навигация + CTA; footer: ИНН/ОГРНИП при заполненных env
- [ ] FAQ на странице, mobile-first
- [ ] Блок «Для копицентров» со ссылкой на `/partners`
- [ ] `TELEGRAM_BOT_USERNAME` на prod

## Чеклист приёмки

- [ ] С телефона: hero + CTA без горизонтального скролла
- [ ] Клик «Распечатать» → Telegram → ожидаемый старт клиентского флоу
- [ ] Клик «Подключить точку» → Telegram → partner flow
- [ ] Оферта доступна из футера
- [ ] Тексты не обещают автоматизацию всего копицентра
