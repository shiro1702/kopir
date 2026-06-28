# Kopir — реестр фич (DRI)

> **DRI** (Directly Responsible Individual) — кто отвечает за доставку фичи.  
> **Обновлять:** при старте/закрытии спринта и при смене статуса в [FEATURES.md](./FEATURES.md).

**Легенда:** `done` | `in_progress` | `todo` | `blocked` | `deferred` | `cancelled`

**Пересборка спринтов:** 28.06.2026 — см. [SPRINTS.md](../sprints/SPRINTS.md)

---

## Sprint 0–0.2 (закрыто)

| ID | Фича | Статус | Спринт | DRI |
|----|------|--------|--------|-----|
| INF-01 | Monorepo web + desktop | done | 0 | TBD |
| WEB-01–03, WEB-08, WEB-14, WEB-15 | Ядро web + боты | done | 0 | TBD |
| AGT-01, AGT-02 | Polling + печать PDF | done | 0 | TBD |
| PAY-01 | Ручное подтверждение оплаты | done | 0 | TBD |
| FILE-10, FILE-11, AGT-14, AGT-15 | DOCX flow | done | 0.1 | TBD |
| FILE-01, UX-14, UX-15 | Batch | done | 0.2 | TBD |

---

## Sprint 1 (закрывается)

| ID | Фича | Статус | Спринт | DRI |
|----|------|--------|--------|-----|
| PAY-01b | Выбор способа: перевод / на месте | done | 1 | TBD |
| MON-09 | Ручная печать при сбое агента | done | 1 | TBD |
| AGT-12 | Агент в копицентре | done | 1 | TBD |
| UX-05, ONB-05 | QR deep link + плакат | done | 1 | TBD |
| AGT-08, MON-01 | Heartbeat polling | in_progress | 1 | TBD |
| MON-02 | Блокировка offline-точки | todo | 1 | TBD |
| UX-10 | Уведомление «Готово!» | todo | 1 | TBD |
| AGT-10 | Разделительный лист | todo | 1 | TBD |
| WEB-04, AGT-03 | WebSocket | cancelled | — | TBD |
| UX-12 | Демо-оплата | cancelled | — | TBD |

---

## Sprint 2 (активный)

| ID | Фича | Статус | Спринт | DRI |
|----|------|--------|--------|-----|
| WEB-12 | Админка точек (MVP) | todo | 2 | TBD |
| ONB-09 | `/bind` staff | todo | 2 | TBD |
| ONB-03, AGT-05 | Токен активации агента | todo | 2 | TBD |
| PAY-02 | Скелет Т-Банка | todo | 2 | TBD |
| ONB-06 | Оферта | todo | 2 | TBD |
| PAY-07 | Выплаты партнёру (ручные) | todo | 2 | TBD |
| WEB-07 | Mini App | todo | 2 | TBD |
| AGT-04 | GUI PySide6 | todo | 2 | TBD |

---

## Sprint 3 (blocked — банк)

| ID | Фича | Статус | Спринт | DRI |
|----|------|--------|--------|-----|
| PAY-02 | Т-Банк Init + GetQr (prod) | blocked | 3 | TBD |
| PAY-03 | Webhook → печать | blocked | 3 | TBD |
| PAY-04 | Облачная касса | blocked | 3 | TBD |

---

## Sprint 4+

| ID | Фича | Статус | Спринт | DRI |
|----|------|--------|--------|-----|
| ONB-01–02 | Регистрация партнёра | todo | 4 | TBD |
| WEB-13 | Partner dashboard | todo | 4 | TBD |
| PAY-06 | Баланс + «Вывести» | todo | 4 | TBD |
| WEB-10 | Карта точек | todo | 4 | TBD |
| INF-04 | Deploy staging/prod | todo | 4 | TBD |
| WEB-12 | Super-admin GMV | todo | 5 | TBD |
| PAY-08 | Mass Payments | todo | 5 | TBD |
| WEB-05 | Redis heartbeat | deferred | backlog | TBD |
| WEB-04, AGT-03 | WebSocket | deferred | backlog | TBD |

---

## Связанные документы

- [FEATURES.md](./FEATURES.md)
- [payment-flow.md](../product/payment-flow.md)
- [SPRINTS.md](../sprints/SPRINTS.md)
- [ROADMAP.md](../roadmap/ROADMAP.md)
