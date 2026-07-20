# 09 — SEO-фундамент (sitemap, метрика, Schema)

| | |
|---|---|
| **Спринт** | 5 |
| **Статус** | ⬜ |
| **Приоритет** | P1 |
| **Feature** | WEB-06, MKT |
| **Спека** | [seo-strategy.md](../../../marketing/seo-strategy.md) |
| **Зависимости** | [10-homepage-landing.md](../../sprint-4/tasks/10-homepage-landing.md) · [08-client-landing-print.md](./08-client-landing-print.md) · [06-print-point-pages.md](./06-print-point-pages.md) |
| **Оценка** | 1–2 дня |

## Цель

Технический SEO-минимум после публикации маркетинговых страниц (главная — Sprint 4, `/print` и точки — Sprint 5).

## Scope

### Технический SEO

- [ ] **9.1** `public/robots.txt` — allow `/`, `/print`, `/partners`, `/print/*`
- [ ] **9.2** Nitro route или `@nuxtjs/sitemap` — `sitemap.xml` (точки из API)
- [ ] **9.3** Яндекс Метрика (env `NUXT_PUBLIC_YM_ID`)
- [ ] **9.4** `<link rel="canonical">` на marketing-страницах
- [ ] **9.5** Open Graph / Twitter cards для `/`, `/print`, `/partners`

### Schema.org

- [ ] **9.6** `Organization` на главной (если не сделано в задаче 10)
- [ ] **9.7** `FAQPage` на `/`, `/print`, `/partners`
- [ ] **9.8** `LocalBusiness` + `BreadcrumbList` на страницах точек (в задаче 06)

### Блог (минимум, опционально P2)

- [ ] **9.9** `pages/blog/[slug].vue` — layout marketing
- [ ] **9.10** Первая статья: «Как распечатать документ с телефона» → CTA на `/print`

## Не в scope

- Контент главной `/` → [Sprint 4 / 10](../../sprint-4/tasks/10-homepage-landing.md)
- Полноценный CMS для блога
- Яндекс Бизнес / 2ГИС (операционно, см. [seo-strategy.md](../../../marketing/seo-strategy.md) § 7)

## DoD

- [ ] `sitemap.xml` и `robots.txt` на prod
- [ ] Сайт добавлен в Яндекс Вебмастер (ручной шаг, чеклист ниже)
- [ ] OG-теги на `/`, `/print`, `/partners`

## Операционный чеклист (после деплоя)

1. Яндекс Вебмастер — добавить сайт, отправить sitemap
2. Google Search Console — если нужен
3. Яндекс Метрика — цели: клик CTA Telegram, переход `/partners`
4. Первая точка — карточка в Яндекс Бизнес со ссылкой на `/print/{city}/{slug}`
