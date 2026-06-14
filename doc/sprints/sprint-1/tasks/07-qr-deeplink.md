# 07 — QR deep link + приветствие точки

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | UX-05 |
| **Зависимости** | Точка в Neon (01), боты Sprint 0 |
| **Оценка** | 3–4 часа |

## Цель

QR на стойке ведёт в бота с привязкой к точке копицентра. Клиент видит название точки и не печатает на «dev»-точку.

## Подзадачи

- [ ] **7.1** Формат slug: `point_<город>_<название>` (напр. `point_bgu_smolina`); seed в Neon + `isActive=true`
- [ ] **7.2** Telegram deep link:
  ```
  https://t.me/<BotUsername>?start=point_bgu_smolina
  ```
  Payload = всё после `start=` → `handleStart` → `setPointPreference`
- [ ] **7.3** MAX: настроить start payload в кабинете MAX или через ссылку с `payload=point_bgu_smolina` (см. [BOT_MESSENGERS.md](../../../project/BOT_MESSENGERS.md))
- [ ] **7.4** Persist preference: заменить in-memory `Map` в `preferences.ts` на поле `User.preferredPointSlug` (Prisma) — переживает рестарт Vercel
- [ ] **7.5** `handleStart`: если slug не найден → fallback `DEFAULT_POINT_SLUG` + предупреждение в лог
- [ ] **7.6** Персонализированное приветствие:
  ```typescript
  // messages.ts
  formatStart(pointName: string): string
  // «Печать в «Копицентр Смолина, БГУ». Отправьте PDF или Word…»
  ```
- [ ] **7.7** Offline-guard (из 04): если точка offline — при `/start` показать «Сейчас недоступно», но не сбрасывать preference
- [ ] **7.8** Admin: страница `/admin/points/[slug]` — показать готовые ссылки TG + MAX для копирования

## Критерии приёмки

- [ ] Скан QR → `/start point_bgu_smolina` → заказ создаётся на этой точке (проверить `Order.pointId` в Neon)
- [ ] Без deep link — `DEFAULT_POINT_SLUG` (dev), поведение как раньше
- [ ] После redeploy Vercel preference сохраняется (Prisma, не Map)
- [ ] Невалидный slug → fallback + понятное приветствие (не crash)

## Заметки

- Универсальный редиректор `/go?point=` — Sprint 4 (WEB-09); в Sprint 1 достаточно двух QR (TG + MAX) или одного TG
- Имя бота в QR — из env или `getMe` один раз при генерации плаката (задача 08)
