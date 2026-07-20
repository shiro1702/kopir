# 08 — Лендинг для клиентов `/print`

| | |
|---|---|
| **Спринт** | 5 |
| **Статус** | ⬜ |
| **Приоритет** | P1 |
| **Feature** | WEB-06 partial, MKT |
| **Спека** | [landing-pages-spec.md](../../../marketing/texts/landing-pages-spec.md) § 2 · [seo-strategy.md](../../../marketing/seo-strategy.md) |
| **Зависимости** | [06-point-client-links.md](../../sprint-4/tasks/06-point-client-links.md) (deep links); [06-print-point-pages.md](./06-print-point-pages.md) (блок «Где забрать») |
| **Оценка** | 1–2 дня |

## Цель

Клиентский лендинг: **быстрая печать А4 ч/б через Telegram**. Сайт перехватывает SEO-запросы и ведёт в бота (бот не индексируется).

## Scope

### Страница `pages/print/index.vue`

| # | Блок | Содержание |
|---|------|------------|
| 1 | Hero | «Распечатай документ А4 за 1 минуту» · цена от · CTA «Распечатать в Telegram» |
| 2 | 3 шага | файл → копии → оплата → забор |
| 3 | Что печатать | заявление, справка, билет, PDF, Word… |
| 4 | Почему удобно | без флешки, цена до оплаты, с телефона |
| 5 | Цены | А4 ч/б от X ₽/стр., зависит от точки |
| 6 | Где забрать | ссылка на `/print/{city}` или мини-список точек |
| 7 | Другие услуги | информационный блок: «уточняйте у оператора» |
| 8 | FAQ | 6–8 вопросов |
| 9 | Финальный CTA | deep link в бот (без preselect точки) |

### Тексты и SEO

- [ ] **8.1** `utils/marketing/client-landing.ts` — тексты блоков (как `partner-landing.ts`)
- [ ] **8.2** `useSeoMeta`: Title «Распечатать документ А4 ч/б через Telegram — Kopir»
- [ ] **8.3** Schema.org `FAQPage` на странице
- [ ] **8.4** `composables/useClientBotLinks.ts` — generic deep link (без `start=slug`) + MAX

### CTA

- Primary: `https://t.me/{bot}` (или `?start=print` если нужен трекинг)
- Secondary: ссылка на карту точек `/print/ulan-ude` (или redirect по городу)
- Mobile: CTA виден без прокрутки

## Не в scope

- Upload и оплата на сайте → [Sprint 6 / 03](../../sprint-6/tasks/03-web-print-guest.md)
- Guest session, wizard → Sprint 6
- Блог / статьи → [09-seo-foundation.md](./09-seo-foundation.md)

## DoD

- [ ] `/print` на prod, mobile-first
- [ ] CTA открывает бота с телефона
- [ ] FAQ + meta title/description по [seo-strategy.md](../../../marketing/seo-strategy.md)
- [ ] Ссылка «Партнёрам» → `/partners`
- [ ] Header: пункт «Где распечатать» ведёт сюда

## Связанные материалы

- Клиентская листовка A5 (PDF с QR точки): [06-point-client-links.md](../../sprint-4/tasks/06-point-client-links.md) фаза 3
- Тексты листовки: [booklets-and-posters.md](../../../marketing/texts/booklets-and-posters.md) § 2
