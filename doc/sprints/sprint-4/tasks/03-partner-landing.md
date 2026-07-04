# 03 — Лендинг для партнёров `/partners`

| | |
|---|---|
| **Статус** | ⬜ |
| **Feature** | MKT (новый), ONB-06 partial |
| **Спека** | [website-structure.md](../../../product/website-structure.md) § «Партнёрам» |

## Scope

Минимальная страница Nuxt `pages/partners.vue`:

| Блок | Содержание |
|------|------------|
| Hero | «Превратите принтер в пассивный доход» |
| Экономика | 70/30 или актуальный % из [partner-economics.md](../../../marketing/texts/partner-economics.md) |
| Как подключиться | 3 шага: бот → агент → QR |
| CTA | «Стать партнёром» → deep link в бот (`/start partner` или инструкция) |
| Footer | Ссылка на оферту (когда ONB-06 готова) |

## Не в scope

- Калькулятор дохода (ползунок) — можно v2
- Web-регистрация / форма заявки
- Partner web-ЛК

## DoD

- [ ] Страница на prod URL, mobile-first
- [ ] CTA ведёт в partner-flow бота
- [ ] Упомянута в header сайта («Партнёрам»)
