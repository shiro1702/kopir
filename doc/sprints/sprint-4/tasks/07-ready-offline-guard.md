# 07 — «Готово!» + блок offline-точки (хвост Sprint 1)

| | |
|---|---|
| **Статус** | ⬜ |
| **Приоритет** | P1 |
| **Feature** | UX-10, MON-02 |
| **Спека** | [point-availability.md](../../../product/point-availability.md) · [bot-user-flow.md](../../../product/bot-user-flow.md) |
| **Зависимости** | MON-01 partial (`lastSeenAt`, 🟢/🔴 в админке) |
| **Оценка** | 1–2 дня |

## Цель

Закрыть хвост Sprint 1: клиент получает «✅ Готово!» после печати; нельзя оплатить на offline-точку.

## Scope

### UX-10 — «Готово!»

- [ ] **7.1** После `Order.status → PRINTED` (или batch `COMPLETED`) — сообщение клиенту в TG + MAX
- [ ] **7.2** Текст: «✅ Готово! Заберите распечатку у принтера»
- [ ] **7.3** Не дублировать, если уже отправлено (idempotent)

### MON-02 — блок offline

- [ ] **7.4** Перед `finalizeBatch` / выбором оплаты — `isPointAgentOnline(point)`
- [ ] **7.5** При `/start` с deep link на offline-точку — предупреждение (не принимать файлы на мёртвую точку — см. [point-availability.md](../../../product/point-availability.md) сценарий B)
- [ ] **7.6** API: `POST finalize` / payment init → 400 если точка offline
- [ ] **7.7** Inline «📍 Выбрать другую точку» — заглушка до Sprint 5 (или скрыть, если одна точка)

## Не в scope (Sprint 5)

- Автопереключение на соседнюю точку
- Staff: ручная смена статуса «нет бумаги»
- Геолокация ближайшей точки

## DoD

- [ ] E2E: оплата → печать → «Готово!» в TG и MAX
- [ ] E2E: агент offline → «Оплатить» недоступна / понятное сообщение
- [ ] [bot-user-flow-status.md](../../../product/bot-user-flow-status.md) — строки 16–17 ✅
