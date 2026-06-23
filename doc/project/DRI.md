# Kopir — реестр фич (DRI)

> **DRI** (Directly Responsible Individual) — кто отвечает за доставку фичи.  
> **Обновлять:** при старте/закрытии спринта и при смене статуса в [FEATURES.md](./FEATURES.md).

**Легенда статусов:** `done` | `in_progress` | `todo` | `deferred`

---

## Sprint 0–0.2 (закрыто)

| ID | Фича | Статус | Спринт | DRI |
|----|------|--------|--------|-----|
| INF-01 | Monorepo web + desktop | done | 0 | TBD |
| WEB-01 | Скелет Nuxt 3 | done | 0 | TBD |
| WEB-02 | Prisma + PostgreSQL | done | 0 | TBD |
| WEB-03 | REST API upload/orders | done | 0 | TBD |
| WEB-08 | Telegram Bot PDF | done | 0 | TBD |
| WEB-14 | Ядро ботов `bot/core` | done | 0 | TBD |
| WEB-15 | MAX Bot | done | 0 | TBD |
| AGT-01 | Polling-агент | done | 0 | TBD |
| AGT-02 | Печать PDF | done | 0 | TBD |
| PAY-01 | Ручное подтверждение оплаты | done | 0 | TBD |
| FILE-10 | DOCX CALCULATING + API | done | 0.1 | TBD |
| FILE-11 | Бот: docx + quote | done | 0.1 | TBD |
| AGT-14 | Word: подсчёт страниц | done | 0.1 | TBD |
| AGT-15 | Word: печать | done | 0.1 | TBD |
| FILE-01 | Batch OrderBatch | done | 0.2 | TBD |
| UX-14 | Удаление файла из пачки | done | 0.2 | TBD |
| UX-15 | Статусные сообщения бота | done | 0.2 | TBD |

---

## Sprint 1 (активный)

| ID | Фича | Статус | Спринт | DRI |
|----|------|--------|--------|-----|
| PAY-01b | Выбор способа: перевод / на месте | done | 1 | TBD |
| MON-09 | Ручная печать при сбое агента | done | 1 | TBD |
| AGT-08 | Heartbeat `lastSeenAt` | in_progress | 1 | TBD |
| MON-01 | Offline по порогу ping | in_progress | 1 | TBD |
| MON-02 | Блокировка заказа offline-точки | todo | 1 | TBD |
| WEB-04 | WebSocket агент ↔ сервер | todo | 1 | TBD |
| AGT-03 | WebSocket вместо polling | todo | 1 | TBD |
| AGT-10 | Разделительный лист | todo | 1 | TBD |
| AGT-12 | PyInstaller exe | todo | 1 | TBD |
| UX-05 | QR deep link точки | todo | 1 | TBD |
| UX-10 | Уведомление «Готово!» | todo | 1 | TBD |
| UX-12 | Демо-оплата (кнопка без банка) | todo | 1 | TBD |
| ONB-05 | PDF плакат с QR | todo | 1 | TBD |

---

## Sprint 2

| ID | Фича | Статус | Спринт | DRI |
|----|------|--------|--------|-----|
| PAY-02 | Т-Банк Init + GetQr | todo | 2 | TBD |
| PAY-03 | Webhook оплаты → печать | todo | 2 | TBD |
| PAY-04 | Облачная касса ФЗ-54 | todo | 2 | TBD |
| PAY-07 | Еженедельные выплаты партнёру | todo | 2 | TBD |
| WEB-07 | Telegram Mini App | todo | 2 | TBD |
| WEB-06 | PWA сайт | todo | 2 | TBD |
| FILE-02 | DOCX → PDF на VPS | todo | 2 | TBD |
| FILE-03 | JPG/PNG → PDF | todo | 2 | TBD |
| AGT-04 | GUI PySide6 | todo | 2 | TBD |
| ONB-06 | Оферта агентского договора | todo | 2 | TBD |
| ONB-09 | `/bind` staff-канала к точке | todo | 2 | TBD |
| UX-01–04 | Калькулятор, дуплекс, копии | todo | 2 | TBD |

---

## Sprint 3+

| ID | Фича | Статус | Спринт | DRI |
|----|------|--------|--------|-----|
| ONB-01–04 | Онбординг партнёра | todo | 3 | TBD |
| WEB-13 | Partner web-кабинет | todo | 3 | TBD |
| PAY-06 | Баланс + «Вывести» | todo | 3 | TBD |
| PAY-05 | Агентская схема в чеке | todo | 3 | TBD |
| PAY-08 | Mass Payments API | todo | 3 | TBD |
| PAY-09 | Тарифы revenue share / SaaS | todo | 3 | TBD |
| PAY-11 | Частичный возврат | todo | 3 | TBD |
| WEB-10 | Карта точек Leaflet | todo | 3 | TBD |
| WEB-05 | Redis heartbeat | todo | 3 | TBD |
| INF-04 | Deploy staging + prod | todo | 3 | TBD |

---

## Отложено (deferred)

| ID | Фича | Этап | DRI |
|----|------|------|-----|
| PAY-10 | POS Vendotek на боксе | боксы | TBD |
| BOX-01–14 | Принт-боксы, IoT | 4+ | TBD |
| WEB-16–17 | VK, Viber боты | 3–4 | TBD |
| AI-01–03 | Groq FAQ, классификация | 4 | TBD |
| MKT-01–04 | Рефералки, абонементы | 4 | TBD |

---

## Связанные документы

- [FEATURES.md](./FEATURES.md) — полный реестр с примечаниями
- [payment-flow.md](../product/payment-flow.md) — спека оплаты
- [SPRINTS.md](../sprints/SPRINTS.md) — календарь спринтов
