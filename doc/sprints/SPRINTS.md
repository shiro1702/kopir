# Kopir — спринты

**Текущая дата:** 5 июля 2026  
**Активный спринт:** [Sprint 4 — ЛК партнёра в боте](./sprint-4/README.md)  
**Предыдущий:** [Sprint 3 — Т-Банк](./sprint-3/README.md) ✅ (реализация)  
**Горизонт:** запуск к 1 сентября 2026

> Продуктовые этапы: [roadmap/ROADMAP.md](../roadmap/ROADMAP.md)

## Карта спринтов (актуализация 05.07.2026)

```
Sprint 0–0.2   Пилот (код ✅)
Sprint 1       Бета в 1 копицентре, polling ✅
Sprint 2       Админка точек, /bind, скелет Т-Банка ✅ (P0)
Sprint 3       Т-Банк prod ✅ · касса ATOL 🟡 · webhook ✅
Sprint 4  ◄──  АКТИВНЫЙ: ЛК партнёра + QR точки + баланс (PAY-06)
Sprint 5       Выбор точки в боте + web ЛК + PAY-07 + 5 точек
Sprint 6       Рост: Mini App печати, web /print (guest), Mass Payments
Backlog        WebSocket, VPS hub, Redis — когда понадобится масштаб
```

**Ключевые решения:**
- WebSocket **не делаем** — polling + `lastSeenAt` достаточно для 1–5 точек
- **Онлайн-оплата prod ✅** — боевой терминал, webhook → автопечать; `GetState` только по кнопке «Проверить оплату» (фоновый polling откатан)
- **Облачная касса (PAY-04)** — ATOL Online, на проверке у банка/ОФД
- **ЛК партнёра** — сначала **бот** (Sprint 4), web-кабинет позже (Sprint 5)
- **Выплаты (PAY-07)** — баланс Sprint 4, реестр + ручные СБП Sprint 5, API Sprint 6
- **QR и ссылки точки** — панель «Ссылка точки» в админке (Sprint 4 P1); выбор точки в боте без QR → Sprint 5 P0
- Хвост Sprint 1 (UX-10, MON-02) — Sprint 4 P1, задача 07

---

## Что дальше (июль 2026)

### Sprint 4 — ЛК партнёра в боте (~2 недели) ◄

📁 [sprint-4/](./sprint-4/README.md)

| P | Задача |
|---|--------|
| P0 | Partner bind, меню: статус агента, заказы, настройки точки |
| P0 | Начисление комиссии при онлайн-оплате + баланс в боте (PAY-06) |
| P1 | «Ссылка точки»: QR + deep links TG/MAX в `/admin/points` |
| P1 | Лендинг `/partners` → CTA в бот |
| P1 | **Главная `/`** → CTA в бот, FAQ, футер ИП |
| P1 | UX-10 «Готово!», MON-02 offline |
| **P0 ⚠️** | **MAX API → platform-api2.max.ru + TLS Минцифры (дедлайн 19.07)** |

**Не в Sprint 4:** web-регистрация, web ЛК, выбор точки в боте без QR, Mass Payments.

### Sprint 5 (август → 1 сентября)

📁 [sprint-5/](./sprint-5/README.md)

| P | Задача |
|---|--------|
| P0 | Выбор точки в боте: last point, список, код (UX-06) |
| P0 | Web ЛК v1, регистрация партнёра на сайте |
| P0 | Реестр выплат PAY-07 фаза 2 |
| P1 | Карта точек + Mini App (WEB-10) |
| P1 | Геолокация ближайшей точки (UX-07) |
| P2 | VK-бот, мультиссылка QR (WEB-09), автопереключение offline |

5+ точек, Windows Service, алерты.

### PAY-07 — выплаты партнёрам (по спринтам)

| Фаза | Спринт | Что делаем | Feature |
|------|--------|------------|---------|
| **1. Учёт** | Sprint 4 | `Partner`, ledger, split при оплате, баланс в боте | PAY-06 |
| **2. Операции** | Sprint 5 | Реестр в super-admin, экспорт для Т-Бизнес, ручной СБП раз в неделю | PAY-07 |
| **3. Отчётность** | Sprint 5 | Отчёт агента PDF/Excel (ONB-07), реквизиты партнёра | ONB-07 |
| **4. Автоматизация** | Sprint 6 | Mass Payments API, «Вывести» одной кнопкой | PAY-08 |

Спека: [partner-payouts.md](../business/partner-payouts.md) · [agent-payments-tbank.md](../business/agent-payments-tbank.md)

---

## Как пользоваться

- Спринт = **1–2 недели** (Sprint 3 может быть короче — только интеграция)
- Задачи ссылаются на ID из [FEATURES.md](../project/FEATURES.md)
- Статусы: `⬜` / `🔵` / `✅` / `❌ cancelled` / `⏸ blocked`
- В конце спринта — ретро по шаблону ниже

---

## Sprint 0 — «Первая печать» ✅

📁 [sprint-0/](./sprint-0/README.md)

| Статус | Задача | Feature ID |
|--------|--------|------------|
| ✅ | Nuxt + Prisma + боты TG/MAX | WEB-01, WEB-02, WEB-08, WEB-14, WEB-15 |
| ✅ | API upload/orders, desktop polling, печать PDF | WEB-03, AGT-01, AGT-02 |
| ✅ | Админка: ручное «Оплачено» | PAY-01 |
| ↪️ | Batch → Sprint 0.2 | FILE-01 |

---

## Sprint 0.1 — «DOCX» ✅ по коду

📁 [sprint-0-1/](./sprint-0-1/README.md)

| Статус | Задача | Feature ID |
|--------|--------|------------|
| ✅ | CALCULATING, приём docx, API, Word count/print | FILE-10, FILE-11, AGT-14, AGT-15 |
| ⬜ | E2E docx на Windows | — |

---

## Sprint 0.2 — «Batch» ✅ по коду

📁 [sprint-0-2/](./sprint-0-2/README.md)

| Статус | Задача | Feature ID |
|--------|--------|------------|
| ✅ | OrderBatch, bot flow, API, agent queue, admin batch | FILE-01, UX-12, PAY-01 |
| 🔵 | E2E: 5 batch-заказов | — |

---

## Sprint 1 — «Бета в копицентре (polling)» ✅

📁 [sprint-1/](./sprint-1/README.md)

**Цель:** реальные пользователи на 1 точке, ручная оплата, агент на polling.

| Статус | Задача | Feature ID |
|--------|--------|------------|
| ✅ | Агент установлен в копицентре | AGT-12 |
| ✅ | QR deep link + плакат на стойке | UX-05, ONB-05 |
| ✅ | Выбор способа оплаты: перевод / на месте | PAY-01b |
| ✅ | Batch queue, удаление файла, статусные сообщения | UX-14, UX-15 |
| ✅ | Ручная печать при сбое агента | MON-09 |
| 🟡 | Heartbeat polling: `lastSeenAt` + админка | AGT-08, MON-01 |
| ⬜ | «Готово!» после печати (TG + MAX) → Sprint 4 P1 | UX-10 |
| ⬜ | Блокировка заказов на offline-точку → Sprint 4 P1 | MON-02 |
| ⬜ | Метрики + feedback (notes.md) | — |
| ⬜ | Разделительный лист (опционально) | AGT-10 |
| ❌ | WebSocket hub + агент на WS | WEB-04, AGT-03 → Backlog |
| ❌ | Демо-оплата (не нужна — есть ручная) | UX-12 → cancelled |

**DoD:** 30+ заказов, QR работает, агент стабилен на polling.

---

## Sprint 2 — «Подготовка к коммерции» ✅ (P0)

📁 [sprint-2/](./sprint-2/README.md) · [REPORT.md](./sprint-2/REPORT.md)

**Цель:** инфраструктура для масштаба точек и эквайринга. **P0 закрыт** 28.06; P1 перенесён.

| Статус | Задача | Feature ID | Приоритет |
|--------|--------|------------|-----------|
| ✅ | Админка точек: CRUD, реквизиты, способы оплаты | WEB-12 partial | P0 |
| ✅ | `/bind <token>` — staff на точку | ONB-09 | P0 |
| ✅ | Токен активации агента (без полной регистрации) | ONB-03, AGT-05 | P0 |
| ✅ | Скелет Т-Банка → реализован в Sprint 3 | PAY-02 prep | P0 |
| ⬜ | Оферта агентского договора на сайте | ONB-06 | P1 → Sprint 4 |
| ⬜ | Подключить 2-ю и 3-ю точку (ручная оплата) | — | P1 → операционно |
| ⬜ | Еженедельные выплаты партнёру | PAY-07 | → Sprint 5 фаза 2 |
| ⬜ | «Готово!» + MON-02 | UX-10, MON-02 | P1 → Sprint 4 |
| ⬜ | Telegram Mini App (upload) | WEB-07 | P2 → Sprint 4 |
| ⬜ | GUI агента PySide6 | AGT-04 | P2 → backlog |

**DoD P0:** ✅ админка, `/bind`, токен агента, провайдер Т-Банка.

---

## Sprint 3 — «Т-Банк» ✅

📁 [sprint-3/](./sprint-3/README.md)

**Цель:** онлайн-оплата СБП/карта → автопечать без staff. **Prod ✅** (05.07.2026).

| Статус | Задача | Feature ID |
|--------|--------|------------|
| ✅ | Т-Банк: Init, GetQr, webhook (prod) | PAY-02, PAY-03 |
| ✅ | Боевой терминал подключён | PAY-02 |
| ✅ | Webhook → PAID → печать (фоновый GetState polling откатан) | PAY-03 |
| ✅ | Провайдер + выбор в боте (TG + MAX) | PAY-02 |
| ✅ | UX: СБП/карта, «Проверить» (ручной GetState) | PAY-02/03 |
| 🟡 | Облачная касса ATOL Online | PAY-04 |
| ⏸ | 100+ prod-транзакций (метрика) | PAY-02 |

**DoD:** ✅ клиент платит онлайн → webhook → печать без staff.

---

## Sprint 4 — «ЛК партнёра в боте» 🔵 АКТИВНЫЙ

📁 [sprint-4/](./sprint-4/README.md)

**Цель:** партнёр управляет точкой через бот; QR и ссылки для клиентов в админке. **Web ЛК и выбор точки в боте — Sprint 5.**

| Статус | Задача | Feature ID |
|--------|--------|------------|
| ⬜ | Partner bind + меню ЛК (статус, заказы) | ONB-01 bot, WEB-13 bot |
| ⬜ | Настройки точки в боте (цена, способы оплаты) | WEB-12 |
| ⬜ | Начисление комиссии + баланс партнёра | PAY-06 |
| ⬜ | «Ссылка точки»: QR + deep links + буклеты PDF | UX-05, ONB-05, MKT |
| ⬜ | Лендинг `/partners` (B2B) | MKT |
| ⬜ | **Главная `/`** (B2C + B2B-блок) | WEB-06, MKT → [10-homepage-landing.md](./sprint-4/tasks/10-homepage-landing.md) |
| ⬜ | «Готово!» + MON-02 offline | UX-10, MON-02 |
| ✅ | **MAX API → platform-api2 + TLS** (дедлайн 19.07) | WEB-15 |
| ↪️ | Регистрация на сайте | ONB-01 web → Sprint 5 |
| ↪️ | Web-кабинет партнёра | WEB-13 web → Sprint 5 |
| ↪️ | Выбор точки в боте без QR | UX-06 → Sprint 5 |
| ↪️ | Реестр выплат + ручной СБП | PAY-07 → Sprint 5 |

> Выплаты: фаза 1 (баланс) здесь; фаза 2 (переводы) — [PAY-07 по спринтам](#pay-07--выплаты-партнёрам-по-спринтам).

---

## Sprint 5 — «К 1 сентября»

📁 [sprint-5/](./sprint-5/README.md)

**Цель:** 5+ точек, выбор точки в боте, web ЛК, выплаты, стабильность.

| Статус | Задача | Feature ID |
|--------|--------|------------|
| ✅ | Количество копий в боте (1–10) | UX-04 → [07-print-copies.md](./sprint-5/tasks/07-print-copies.md) |
| ⬜ | Выбор точки в боте: last point, список, код | UX-06, UX-05b |
| ⬜ | Карта точек + Mini App | WEB-10, WEB-07 |
| ⬜ | SEO-страницы точек `/print/[city]/[slug]` | WEB-06 partial → [06-print-point-pages.md](./sprint-5/tasks/06-print-point-pages.md) |
| ⬜ | Лендинг `/print` (B2C) | MKT → [08-client-landing-print.md](./sprint-5/tasks/08-client-landing-print.md) |
| ⬜ | SEO-фундамент (sitemap, метрика) | MKT → [09-seo-foundation.md](./sprint-5/tasks/09-seo-foundation.md) |
| ⬜ | Геолокация «ближайшая точка» | UX-07 |
| ⬜ | Реестр выплат + ручные СБП (PAY-07 фаза 2) | PAY-07 |
| ⬜ | Отчёт агента PDF/Excel | ONB-07 |
| ⬜ | Web ЛК партнёра v1 | WEB-13 |
| ⬜ | Регистрация партнёра на сайте | ONB-01, ONB-02 |
| ⬜ | Windows Service + трей | AGT-06 |
| ⬜ | Пауза приёма заказов | AGT-07 |
| ⬜ | Алерты: оффлайн, бумага, замятие | MON-03–06 |
| ⬜ | «Проблема с печатью» + тикет | UX-11 |
| ⬜ | Частичный возврат | PAY-11 |
| ⬜ | Super-admin: GMV, комиссии | WEB-12 |
| ⬜ | VK Bot, мультиссылка QR | WEB-16, WEB-09 |
| ⬜ | Mass Payments (пилот) | PAY-08 |
| ⬜ | Маркетинг: паблики БГУ | — |

**Milestone 1 сентября:** 5+ точек, 0 критических багов в оплате.

---

## Sprint 6 — «Рост» (сентябрь 2026+)

📁 [sprint-6/](./sprint-6/README.md)

| Статус | Задача | Feature ID |
|--------|--------|------------|
| ⬜ | Mini App: печать файлов (TG + MAX) | WEB-07 → [02-print-miniapp.md](./sprint-6/tasks/02-print-miniapp.md) |
| ⬜ | Сайт: печать без логина (guest session) | WEB-06 → [03-web-print-guest.md](./sprint-6/tasks/03-web-print-guest.md) |
| ⬜ | 5+ новых копицентров | — |
| ⬜ | Прогрессивная комиссия от оборота точки | PAY-06b → [01-tiered-commission.md](./sprint-6/tasks/01-tiered-commission.md) |
| ⬜ | Mass Payments «Вывести» | PAY-08 |
| ⬜ | Принт-бокс / Linux agent | BOX-01, BOX-02 |
| ⬜ | Реферальная программа | MKT-01 |

---

## Backlog (без спринта)

**Инфра (когда > 5 точек или нестабильный polling):**
- WebSocket hub на VPS (WEB-04, AGT-03) — было Sprint 1, отменено 28.06
- Redis heartbeat (WEB-05)
- Deploy prod VPS для WS

**Продукт:**
- Telegram Login на `/print` (история заказов) — P2 в Sprint 6 / 03
- POS Vendotek, NFC, МФЦ, динамическое ценообразование
- ~~Прогрессивная комиссия от оборота~~ → Sprint 6 [01-tiered-commission.md](./sprint-6/tasks/01-tiered-commission.md)
- DOCX → PDF на VPS, JPG→PDF, PWA
- Viber-бот (WEB-17)
- Partner landing v2 (калькулятор дохода)

---

## Ретро-шаблон

```markdown
## Sprint N Retro — ДД.ММ.ГГГГ

### Сделано
-

### Метрики
- Заказов:
- Успешных печатей %:
- Активных точек:

### Что пошло не так
-

### Решения на следующий спринт
-
```
