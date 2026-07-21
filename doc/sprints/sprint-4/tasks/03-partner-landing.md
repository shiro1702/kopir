# 03 — Лендинг для партнёров `/partners`

| | |
|---|---|
| **Статус** | ✅ |
| **Feature** | MKT (новый), ONB-06 partial |
| **Спека** | [landing-pages-spec.md](../../../marketing/texts/landing-pages-spec.md) · [website-structure.md](../../../product/website-structure.md) § «Партнёрам» |

## Scope

Минимальная страница Nuxt `pages/partners.vue` — **узкое позиционирование А4 ч/б**, не «весь копицентр»:

| Блок | Содержание |
|------|------------|
| Hero | «Автоматизируйте печать А4 ч/б в вашем копицентре» + CTA |
| Боль | Мелкая печать отнимает время оператора |
| Решение | QR → бот → файл → оплата → печать |
| Фокус | Только А4 ч/б автоматически |
| Не автоматизируем | Цвет, фото, ламинирование — остаются у оператора |
| Инфо-стенд | Доп. услуги точки как витрина «от X ₽» |
| Экономика | 75/25 или актуальный % из [partner-economics.md](../../../marketing/texts/partner-economics.md) |
| Пилот | 0 ₽ подключение, комиссия только с заказов |
| Как подключиться | 3 шага: бот → агент → QR |
| FAQ | 5–7 вопросов (см. [landing-pages-spec.md](../../../marketing/texts/landing-pages-spec.md)) |
| CTA | «Стать партнёром» → deep link в бот |
| Footer | Ссылка на [оферту](/offer) |

## Не в scope

- Калькулятор дохода (ползунок) — можно v2
- Web-регистрация / форма заявки
- Partner web-ЛК

## DoD

- [ ] Страница на prod URL, mobile-first
- [ ] CTA ведёт в partner-flow бота
- [ ] Упомянута в header сайта («Партнёрам»)

---

## План реализации

**Оценка:** 3–4 ч · **Зависимости:** [01 partner-bot-lk](./01-partner-bot-lk.md) (CTA `start=partner`), [09 оферта](./09-public-offer.md) ✅

### Текущее состояние

| Готово | Нет |
|--------|-----|
| `layout/marketing.vue` + `SiteHeader` / `SiteFooter` | `pages/partners.vue` |
| Ссылка «Партнёрам» в header и footer | Публичный username бота на клиенте |
| `/offer` как образец страницы | Тексты лендинга в коде |
| Бот: `/start partner` → меню ЛК или «не привязан» | Публичная ссылка на скачивание агента |

### Архитектура

Одна статическая страница Nuxt, без API и Prisma — по аналогии с [`offer.vue`](../../../../web/pages/offer.vue).

```
web/
├── pages/partners.vue              # страница
├── composables/usePartnerBotLinks.ts  # deep link TG / MAX
├── utils/marketing/partner-landing.ts # тексты блоков (версионируемо)
└── nuxt.config.ts                  # TELEGRAM_BOT_USERNAME / MAX_BOT_LINK → public
```

**Почему не server route:** deep link — только публичный username + payload `partner`; секреты не нужны.

### Шаг 1 — Env и composable (≈30 мин)

**`nuxt.config.ts`** — в `runtimeConfig.public` (те же env, что для bind/QR):

```ts
telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME ?? '',
maxBotLink: process.env.MAX_BOT_LINK ?? '',
```

**`web/.env.example`:** уже есть `TELEGRAM_BOT_USERNAME` и `MAX_BOT_LINK` рядом с токенами ботов.

**`composables/usePartnerBotLinks.ts`:**

```ts
// telegramPartnerUrl: https://t.me/{user}?start=partner
// maxPartnerUrl: {maxBotLink}?start=partner | null
// hasTelegram: boolean — для disabled-состояния CTA
```

Логика payload — как в [`point-links.ts`](../../../../web/server/utils/point-links.ts) (`encodeURIComponent('partner')`). На prod обязательно заполнить `TELEGRAM_BOT_USERNAME` (используется и server-side, и CTA на лендинге).

### Шаг 2 — Тексты (`utils/marketing/partner-landing.ts`) (≈30 мин)

Вынести копирайт из шаблона — как [`agent-offer.ts`](../../../../web/utils/legal/agent-offer.ts).

| Константа | Содержание |
|-----------|------------|
| `PARTNER_HERO` | Заголовок: «Автоматизируйте печать А4 ч/б в вашем копицентре»; подзаголовок: QR → бот → оплата → печать |
| `PARTNER_FOCUS` | Только А4 ч/б автоматически; доп. услуги — информационный стенд |
| `PARTNER_NOT_AUTO` | Цвет, фото, ламинирование, переплет — не автоматизируем на старте |
| `PARTNER_PILOT` | Пилот 30–60 дней, 0 ₽ подключение, комиссия только с заказов |
| `PARTNER_ECONOMICS` | **75% партнёру / 25% платформе** на старте |
| `PARTNER_STEPS` | 3 шага (см. ниже) |
| `PARTNER_FAQ` | 5–7 вопросов из [landing-pages-spec.md](../../../marketing/texts/landing-pages-spec.md) |
| `PARTNER_CTA_LABEL` | «Стать партнёром» |
| `PARTNER_CTA_HINT` | «Откроется бот — для привязки точки нужна ссылка от менеджера Kopir» |

**Экономика на лендинге:** не писать «70/30» из старого черновика задачи — в пилоте 30% только legacy-точки; для outreach маркетинг **75%**.

**3 шага подключения** (из scope задачи, не «регистрация на сайте»):

1. **Откройте бота** — нажмите CTA или получите персональную ссылку `/partner bind_…` от администратора Kopir
2. **Установите агент** на Windows-ПК с принтером (ссылку на `.exe` выдаёт менеджер; публичный download — Sprint 1+)
3. **Разместите QR** на точке — клиенты сканируют и печатают сами

### Шаг 3 — Страница `pages/partners.vue` (≈1,5 ч)

```ts
definePageMeta({ layout: 'marketing' })
useSeoMeta({
  title: 'Автоматизация печати А4 ч/б для копицентров — Kopir',
  description: 'Клиент сканирует QR, загружает документ в Telegram-бот, оплачивает и забирает распечатку. Пилот без абонплаты.',
})
```

**Секции (mobile-first, Tailwind, `max-w-3xl` как у оферты):**

| # | Блок | UI |
|---|------|-----|
| 1 | Hero | `h1` + подзаголовок + primary CTA |
| 2 | Боль + решение | 2 колонки на `sm:` |
| 3 | Фокус А4 ч/б / что не автоматизируем | 2 карточки |
| 4 | Инфо-стенд точки | пример списка доп. услуг «от» |
| 5 | Экономика | «75%» + пример расчёта |
| 6 | Пилот + 3 шага подключения | |
| 7 | FAQ | `<details>` или аккордеон |
| 8 | CTA повтор | + `mailto:` fallback |

**CTA-кнопка:**

- Primary: `<a :href="telegramPartnerUrl" target="_blank" rel="noopener">` — «Стать партнёром»
- Если `!hasTelegram`: disabled + текст «Напишите на support@…»
- Secondary (опц.): кнопка MAX, если `maxPartnerUrl` задан

**Поведение бота после клика:** `handleStart` с payload `partner` → [`handlePartnerCommand`](../../../../web/server/utils/bot/core.ts) → меню ЛК или [`formatPartnerNotBound`](../../../../web/server/utils/bot/partner-messages.ts) с инструкцией запросить bind-ссылку.

### Шаг 4 — Header (≈0) 

Уже есть в [`SiteHeader.vue`](../../../../web/components/site/SiteHeader.vue). После деплоя проверить, что с главной (`index.vue` позже тоже на `marketing`) ссылка ведёт на `/partners`.

### Шаг 5 — Деплой и prod (≈30 мин)

1. Vercel: `TELEGRAM_BOT_USERNAME`, `MAX_BOT_LINK` (если нужен MAX CTA), `NUXT_PUBLIC_SITE_URL`
2. Открыть `https://{site}/partners` с телефона
3. CTA → Telegram → `/start partner` → ожидаемый экран бота
4. Lighthouse: readable font sizes, tap targets ≥ 44px

### Вне scope (не делать в этой задаче)

- Калькулятор дохода (ползунок страниц/день)
- Web-форма заявки
- Хостинг `kopir-agent.exe` на CDN
- A/B-тесты, аналитика (можно `data-` атрибуты на CTA — опционально)

### Чеклист приёмки

- [ ] `/partners` рендерится с layout marketing
- [ ] На мобильном все блоки читаемы без горизонтального скролла
- [ ] CTA открывает `t.me/...?start=partner`
- [ ] Упомянуты 75% (или актуальный % из `partner-landing.ts`)
- [ ] Ссылка на оферту в тексте страницы
- [ ] `TELEGRAM_BOT_USERNAME` задан на prod
- [ ] Оферта §5.1 ссылается на `/partners` — уже в [`agent-offer.ts`](../../../../web/utils/legal/agent-offer.ts) ✅
