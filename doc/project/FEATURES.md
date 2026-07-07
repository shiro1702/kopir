# Kopir — реестр фич

> Сводка DRI и сроков: [DRI.md](./DRI.md)

## Легенда статусов

| Статус | Значение |
|--------|----------|
| `⬜ todo` | Не начато |
| `🔵 in_progress` | В работе |
| `✅ done` | Готово |
| `⏸ deferred` | Отложено (не MVP) |

> Обновляй статус при начале и завершении работы. Одна фича — одна строка.

---

## 1. Инфраструктура и репозиторий

| Статус | ID | Фича | Этап | Примечание |
|--------|-----|------|------|------------|
| ✅ done | INF-01 | Monorepo: `web/` + `desktop/` | 1 | См. PROJECT.md |
| ⬜ todo | INF-02 | `.cursorrules` для Nuxt + Python | 1 | |
| ⬜ todo | INF-03 | CI: lint + typecheck web | 2 | |
| ⬜ todo | INF-04 | Deploy: Vercel staging + VPS prod | 1–2 | Sprint 0: Vercel + Neon + Blob; WS → VPS |
| ⬜ todo | INF-05 | Staging + prod окружения | 2 | Neon branches, отдельные Blob store |

---

## 2. Web — ядро (Nuxt 3 + Nitro)

| Статус | ID | Фича | Этап | Примечание |
|--------|-----|------|------|------------|
| ✅ done | WEB-01 | Скелет Nuxt 3 проекта | 1 | |
| ✅ done | WEB-02 | Prisma + PostgreSQL схема | 1 | Neon; users, points, orders |
| ✅ done | WEB-03 | REST API: upload, orders, points | 1 | PDF → Vercel Blob |
| ⬜ todo | WEB-04 | WebSocket: агент ↔ сервер | 1 | print jobs, heartbeat |
| ⬜ todo | WEB-05 | Redis: heartbeat + TTL коды | 2 | |
| ⬜ todo | WEB-06 | Омниканальный сайт (PWA) | 2 | QR → `?point_id=`; клиентская печать `/print` — Sprint 6 |
| ⬜ todo | WEB-07 | Telegram Mini App (SPA) | 2 | Sprint 5: карта точки; Sprint 6: upload + оплата |
| ✅ done | WEB-08 | Telegram Bot: /start, приём PDF | 1 | grammY; см. WEB-14 |
| ✅ done | WEB-14 | Ядро мультиканальных ботов (`bot/core`) | 1 | общая логика заказов |
| ✅ done | WEB-15 | MAX Bot: /start, приём PDF | 1 | platform-api2.max.ru |
| ⬜ todo | WEB-16 | VK Bot (адаптер на общее ядро) | 3–4 | Callback API; см. BOT_MESSENGERS.md |
| ⬜ todo | WEB-17 | Viber Bot | 4 | после VK |
| ⬜ todo | WEB-09 | Мультиссылка QR (TG / MAX / VK / Viber) | 3 | редиректор `/go?point=` |
| ⬜ todo | WEB-10 | Страница карты точек (Leaflet) | 2 | статичные пины |
| ⬜ todo | WEB-11 | Карта: динамическая нагрузка (🟢🟡🔴) | 3 | из очереди принтера |
| ⬜ todo | WEB-12 | Super-admin дашборд | 3–4 | GMV, комиссии; MVP админки точек — Sprint 2 |
| ⬜ todo | WEB-13 | Partner кабинет | 4–5 | **Sprint 4:** bot; **Sprint 5:** web |

---

## 3. Загрузка и обработка файлов

| Статус | ID | Фича | Этап | Примечание |
|--------|-----|------|------|------------|
| ⬜ todo | FILE-01 | Приём PDF, подсчёт страниц | 1 | pdf-lib / pdf-parse; Sprint 0.1 partial |
| ⬜ todo | FILE-02 | DOCX/DOC → PDF (облако) | 2 | **Свой VPS + LibreOffice/Gotenberg** |
| ✅ done | FILE-10 | DOCX: статусы CALCULATING + API calculation | 1 | Sprint 0.1 |
| ✅ done | FILE-11 | Бот: приём doc/docx, quote клиенту | 1 | Sprint 0.1 |
| ⬜ todo | FILE-03 | JPG/PNG → PDF A4 | 2 | pdf-lib wrap |
| ⬜ todo | FILE-04 | Превью страниц в Mini App | 2 | pdfjs-dist |
| ⬜ todo | FILE-05 | Выбор диапазона страниц | 2 | |
| ⬜ todo | FILE-06 | Дисклеймер при DOCX | 2 | «шрифты могут измениться» |
| ✅ done | FILE-07 | Автоудаление после печати | 2 | `blob.del()`; Sprint 0 basic |
| ⬜ todo | FILE-08 | Маршрутизация на фотопринтер | ⏸ deferred | target_printer tag |
| ⬜ todo | FILE-09 | XLSX/PPTX конвертация | ⏸ deferred | |

---

## 4. Параметры печати и UX

| Статус | ID | Фича | Этап | Примечание |
|--------|-----|------|------|------------|
| ⬜ todo | UX-01 | Калькулятор цены в реальном времени | 2 | |
| ⬜ todo | UX-02 | Ч/Б vs цветной | 2 | |
| ⬜ todo | UX-03 | Дуплекс / односторонняя | 2 | |
| ⬜ todo | UX-04 | Количество копий | 2 | |
| ⬜ todo | UX-05 | Выбор точки: QR deep link | 1 | `?start=point_X` |
| ⬜ todo | UX-06 | Выбор точки: ручной номер | 2 | |
| ⬜ todo | UX-07 | Выбор точки: геолокация | 3 | |
| ⬜ todo | UX-08 | Выбор точки: NFC-метка | ⏸ deferred | |
| ⬜ todo | UX-09 | Статус заказа в реальном времени | 2 | «3 из 15 стр.» |
| ⬜ todo | UX-10 | Уведомление «Готово!» в мессенджере | 2 | TG + MAX; расширить на VK |
| ⬜ todo | UX-11 | Кнопка «Проблема с печатью» | 3 | 10 мин после заказа |
| ⬜ todo | UX-12 | Демо-режим оплаты (тест UX) | 1 | без банка |
| ⬜ todo | UX-13 | Выбор тарифа «наша / своя бумага» в боте | ⏸ deferred | BOX-10 |
| ✅ done | UX-14 | Удаление файла из пачки до оплаты | 1 | inline на сообщении файла; см. batch-edit-flow.md |
| ✅ done | UX-15 | Статусные сообщения бота (edit + typing) | 1 | «Принимаю…» → edit; см. задача 15 |

---

## 5. Платежи и финансы

| Статус | ID | Фича | Этап | Примечание |
|--------|-----|------|------|------------|
| ✅ done | PAY-01 | Ручное подтверждение оплаты (пилот) | 1 | перевод на карту |
| ✅ done | PAY-01b | Выбор способа: перевод СБП / на месте | 1 | [payment-flow.md](../product/payment-flow.md) |
| ✅ done | PAY-02 | Т-Банк: Init + GetQr (СБП/карта) | 3 | prod ✅ |
| ✅ done | PAY-03 | Webhook оплаты → печать | 3 | prod webhook ✅; GetState — ручной fallback |
| 🟡 review | PAY-04 | Облачная касса ATOL Online (ФЗ-54) | 3 | на проверке |
| ⬜ todo | PAY-05 | Агентская схема в чеке | 3 | ИНН партнёра |
| ✅ done | PAY-06 | Баланс партнёра + ledger | 4 | Sprint 4, bot |
| ⬜ todo | PAY-07 | Еженедельные выплаты (ручные СБП) | 5 | реестр + Т-Бизнес |
| ⬜ todo | PAY-08 | Mass Payments API (автовыплаты) | 3 | самозанятые |
| ⬜ todo | PAY-09 | Тарифы: revenue share / SaaS / гибрид | 3 | |
| ⬜ todo | PAY-10 | POS-терминал Vendotek на боксе | ⏸ deferred | этап боксов |
| ⬜ todo | PAY-11 | Частичный возврат при ошибке печати | 3 | |

---

## 6. Desktop Agent (Python, Windows)

| Статус | ID | Фича | Этап | Примечание |
|--------|-----|------|------|------------|
| ✅ done | AGT-01 | Консольный polling-агент | 1 | proof of concept |
| ✅ done | AGT-02 | Печать PDF на принтер по умолчанию | 1 | SumatraPDF CLI + lp |
| ⬜ todo | AGT-03 | WebSocket вместо polling | 2 | |
| ⬜ todo | AGT-04 | GUI PySide6: статус + лог заказов | 2 | |
| ⬜ todo | AGT-05 | Авторизация по токену (6 цифр) | 3 | |
| ⬜ todo | AGT-06 | Windows Service + трей | 3 | нельзя закрыть |
| ⬜ todo | AGT-07 | Кнопка «Пауза приёма заказов» | 3 | status: paused |
| ⬜ todo | AGT-08 | Heartbeat каждые 15 сек | 2 | Sprint 1 WS; polling MVP: `lastSeenAt` ✅ |
| ⬜ todo | AGT-09 | Мониторинг очереди Windows Spooler | 3 | нагрузка на карту |
| ⬜ todo | AGT-10 | Разделительный лист (toggle) | 2 | `USE_SEPARATOR_PAGE` |
| ⬜ todo | AGT-11 | «Печать QR-материалов» из программы | 2 | PDF с point_id |
| ⬜ todo | AGT-12 | PyInstaller → `kopir-agent.exe` | 2 | |
| ✅ done | AGT-14 | Word: подсчёт страниц docx (pywin32) | 1 | Sprint 0.1, Windows |
| ✅ done | AGT-15 | Word: печать doc/docx | 1 | Sprint 0.1; PDF — AGT-02 |
| ⬜ todo | AGT-13 | Дашборд: статистика для партнёра | 3 | без GMV платформы |

---

## 7. Мониторинг и уведомления

| Статус | ID | Фича | Этап | Примечание |
|--------|-----|------|------|------------|
| 🟡 partial | MON-01 | Offline если нет ping > порога | 2 | polling: `lastSeenAt` + админка 🟢/🔴 |
| ⬜ todo | MON-02 | Блокировка заказа на offline-точку | 2 | до оплаты — Sprint 1 |
| ⬜ todo | MON-03 | Алерт партнёру: оффлайн | 3 | Telegram admin |
| ⬜ todo | MON-04 | Алерт: закончилась бумага | 3 | |
| ⬜ todo | MON-05 | Предупреждение: мало бумаги/тонера | 3 | 10% лотка |
| ⬜ todo | MON-06 | Алерт: замятие бумаги | 3 | |
| ⬜ todo | MON-07 | Очередь на сервере (1 job за раз) | 3 | для боксов |
| ⬜ todo | MON-08 | Оценка времени ожидания | 3 | pages_in_queue |
| ✅ done | MON-09 | Ручная печать при сбое агента | 2 | файл staff + кнопка «Печать готова»; sprint-1/12 |

---

## 8. Онбординг партнёров

| Статус | ID | Фича | Этап | Примечание |
|--------|-----|------|------|------------|
| ⬜ todo | ONB-01 | Регистрация партнёра | 4–5 | **Sprint 4:** bind в боте; web → Sprint 5 |
| ⬜ todo | ONB-02 | Выбор модели 80/20 | 3 | |
| ⬜ todo | ONB-03 | Скачивание агента + токен | 3 | |
| ⬜ todo | ONB-04 | Автоопределение принтера Windows | 3 | |
| ⬜ todo | ONB-05 | Генерация PDF плаката с QR | 2 | |
| ✅ done | ONB-06 | Публичная оферта (агентский договор) | 2 | `/offer` |
| ⬜ todo | ONB-07 | Отчёт агента PDF (для налоговой) | 3 | |
| ⬜ todo | ONB-08 | Gamification: рейтинг точек | ⏸ deferred | |
| ⬜ todo | ONB-09 | Привязка staff-канала через `/bind` + токен | 2 | Sprint 2; замена env `STAFF_*` |

---

## 9. Принт-боксы и железо

| Статус | ID | Фича | Этап | Примечание |
|--------|-----|------|------|------------|
| ⬜ todo | BOX-01 | Linux-агент (CUPS `lp`) | ⏸ deferred | Orange Pi |
| ⬜ todo | BOX-02 | Печать по QR на корпусе (не сразу) | 3 | безопасность |
| ⬜ todo | BOX-03 | Локальный Wi-Fi + Captive Portal | ⏸ deferred | |
| ⬜ todo | BOX-04 | Walled garden для СБП | ⏸ deferred | |
| ⬜ todo | BOX-05 | Read-only FS + RAM /tmp | ⏸ deferred | |
| ⬜ todo | BOX-06 | Watchdog + auto-reconnect | ⏸ deferred | |
| ⬜ todo | BOX-07 | Антивандальный корпус | ⏸ deferred | ~12–30k ₽ |
| ⬜ todo | BOX-08 | Ethernet без отдельного роутера | ⏸ deferred | |
| ⬜ todo | BOX-09 | BYOP: печать со своей бумаги (Manual Feed) | ⏸ deferred | LITE-BYOP ~28k |
| ⬜ todo | BOX-10 | Гибрид: выбор «наша / своя» + CUPS InputSlot | ⏸ deferred | см. byop-hybrid-printing.md |
| ⬜ todo | BOX-11 | Student Hub: ячейки + электрозамки + оплата | ⏸ deferred | MAX/PRO опция |
| ⬜ todo | BOX-12 | Каталог товаров ячеек (админ-конструктор) | ⏸ deferred | Telegram / web |
| ⬜ todo | BOX-13 | Подсветка ячеек WS2812B (витрина + «забери») | ⏸ deferred | |
| ⬜ todo | BOX-14 | Статус Add Paper → push «добавьте листы» | ⏸ deferred | BYOP сценарий |

---

## 10. AI и монетизация (после PMF)

| Статус | ID | Фича | Этап | Примечание |
|--------|-----|------|------|------------|
| ⏸ deferred | AI-01 | Groq FAQ в боте | 4 | |
| ⏸ deferred | AI-02 | Классификация документов | 4 | |
| ⏸ deferred | AI-03 | Проверка ГОСТ в PDF | 4 | 99 ₽ |
| ⏸ deferred | MKT-01 | Реферальная программа | 4 | |
| ⏸ deferred | MKT-02 | Реклама в Mini App при ожидании | 4 | |
| ⏸ deferred | MKT-03 | Абонемент 199 ₽/мес | 4 | |
| ⏸ deferred | MKT-04 | «Печать без очереди» +50 ₽ | 4 | |

---

## 11. Расширение аудитории (после студентов)

| Статус | ID | Фича | Этап | Примечание |
|--------|-----|------|------|------------|
| ⏸ deferred | NIC-01 | Селлеры WB/Ozon — термоэтикетки | 5 | |
| ⏸ deferred | NIC-02 | ЖК — печать у дома | 5 | |
| ⏸ deferred | NIC-03 | МФЦ / госучреждения | 5 | web без TG |
| ⏸ deferred | NIC-04 | Коворкинги — SaaS лимиты | 5 | |

---

## Сводка по статусам

| Статус | Кол-во |
|--------|--------|
| ⬜ todo | 78 |
| 🔵 in_progress | 4 |
| ✅ done | 13 |
| ⏸ deferred | 25 |

*Обновлено: 13.06.2026*
