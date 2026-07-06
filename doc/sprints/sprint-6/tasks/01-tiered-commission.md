# 01 — Прогрессивная комиссия от оборота точки (PAY-06b)

| | |
|---|---|
| **Спринт** | 6 |
| **Статус** | ⬜ |
| **Приоритет** | P1 |
| **Feature** | PAY-06 (фаза 2), экономика партнёра |
| **Спека** | [pricing-strategies.md](../../../business/pricing-strategies.md) · [partner-economics.md](../../../marketing/texts/partner-economics.md) |
| **Предусловие** | Sprint 4 ✅ `commissionPercent` в админке + `resolveEffectiveCommissionPercent()` |
| **Оценка** | 2–3 дня |

## Проблема

В Sprint 4 для пилота стоял **жёсткий 30%** (70/30) — просто и понятно на старте. Целевая экономика из [partner-economics.md](../../../marketing/texts/partner-economics.md) — **12–15%** платформы. Резкий переход «30% → шкала от 12%» при включении tiered ломает доверие пилотных партнёров.

**Решение: гибрид в три слоя** (см. ниже).

Код extension point:

- [`web/server/utils/commission.ts`](../../../../web/server/utils/commission.ts) — `CommissionTier`, `pickTierPercent()`, `resolveEffectiveCommissionPercent()`
- [`partner-balance.ts`](../../../../web/server/utils/partner-balance.ts) → `creditPartnerBalanceForBatch`

---

## Модель комиссии (поэтапно)

### Фаза 1 — Сейчас (Sprint 4–5)

| Кто | Режим | % платформы |
|-----|-------|-------------|
| **Новые точки** | `FIXED` | **25%** default (партнёру 75%) |
| **Первые 10 точек** | `FIXED` + early bird | **14%** max (`earlyBirdLocked`) |
| **Пилотные точки** | `FIXED` | **30%** вручную в админке, пока не переведём |

> Default в БД и форме админки: **25**, не 15. Пилоты не трогаем — у них в БД остаётся 30.

### Фаза 2 — Tiered (этот спринт)

Шкала **начинается близко к пилотным 30%** и сходится к целевым 12% при росте оборота:

| Оборот точки за месяц (TBANK, ₽) | Комиссия платформы | Партнёру |
|----------------------------------|-------------------|----------|
| до 10 000 | **25%** | 75% |
| 10 000 – 49 999 | **18%** | 82% |
| 50 000 – 149 999 | **14%** | 86% |
| ≥ 150 000 | **12%** | 88% |

Логика: на малых оборотах платформа ближе к пилоту (25% vs 30%), на крупных — как в outreach (12%). Порог 150k — когда точка «окупает» инфраструктуру.

### Overrides

| Правило | Поведение |
|---------|-----------|
| `commissionMode = fixed` | всегда `commissionPercent` из админки (пилот 30%, новая точка 25%, ручная правка) |
| `commissionMode = tiered` | шкала выше; `commissionPercent` = fallback если tiers пуст |
| `earlyBirdLocked` | **не выше 14%** (`min(14, ставка по режиму)`); лимит **10** точек вручную |
| Перевод пилота на tiered | явное действие в админке + уведомление партнёру («с оборотом комиссия снижается») |

### Сравнение вариантов

| Вариант | Плюс | Минус |
|---------|------|-------|
| A. Default 25% сейчас | Покрывает онбординг на малом обороте; одна цифра | Выше психологического порога 20% |
| B. Шкала от оборота сразу | Справедливо при росте | Сложно до первых оплат |
| C. A → B | Простой старт, tiered без скачка (верх шкалы = 25%) | Нужна коммуникация при включении tiered | **← выбрано** |

Пресет в админке **«Стандартная шкала»** заполняет 25 / 18 / 14 / 12.

---

## Когда считается %

**В момент начисления** (`creditPartnerBalanceForBatch`), не ретроактивно в конце месяца.

```
Клиент оплатил batch 500 ₽ (TBANK)
→ turnover_month = SUM(paid TBANK batches) за календарный месяц, включая этот batch
→ если TIERED: platform% = pickTier(turnover_month)
→ если FIXED: platform% = commissionPercent
→ partnerCredit = floor(500 * (100 - platform%) / 100)
→ ledger CREDIT + platformPercentApplied
```

### Оборот для шкалы

| Включать | Да/нет |
|----------|--------|
| `TBANK_SBP`, `TBANK_ONLINE` | ✅ |
| `SBP_TRANSFER`, `ON_SITE` | ❌ |
| Статусы batch | оплаченные (`PAID`+) |
| Период | календарный месяц `paidAt`, TZ `Asia/Irkutsk` |
| Текущий batch | ✅ в turnover до расчёта % |

---

## Prisma (миграция)

```prisma
enum CommissionMode {
  FIXED
  TIERED
}

model Point {
  commissionMode     CommissionMode @default(FIXED)
  commissionPercent  Int            @default(25)   // FIXED / fallback
  commissionTiers    Json?
  earlyBirdLocked    Boolean        @default(false)
}
```

`PartnerBalanceEntry`: `platformPercentApplied`, `turnoverMonthKopeks` (аудит).

Константа пресета в коде:

```ts
export const STANDARD_COMMISSION_TIERS: CommissionTier[] = [
  { minMonthlyTurnoverKopeks: 0, platformPercent: 25 },
  { minMonthlyTurnoverKopeks: 1_000_000, platformPercent: 18 },
  { minMonthlyTurnoverKopeks: 5_000_000, platformPercent: 14 },
  { minMonthlyTurnoverKopeks: 15_000_000, platformPercent: 12 },
]
```

---

## Admin UI

| Режим | UI |
|-------|-----|
| Fixed | % платформы (default **25**) |
| Tiered | таблица порогов + пресет «Стандартная шкала» |
| Early bird | ☑ **14%** max (первые 10 точек) |
| Пилот | подсказка: «30% — legacy пилот; для новых — 25% или early bird 14%» |

## Partner bot (read-only)

> Комиссия сейчас: **18%** (оборот за месяц: 24 300 ₽).  
> До **14%** осталось: 25 700 ₽ оборота.

## DoD

- [ ] Новая точка без правок → FIXED **25%**
- [ ] Early bird (≤10) → **14%** max
- [ ] Пилот с 30% в БД → без изменений до ручного перевода
- [ ] TIERED, оборот 9k → batch 1k → партнёру **75%** (25%)
- [ ] Оборот перешёл 10k → следующий batch → **82%** (18%)
- [ ] `earlyBirdLocked` → cap **14%**
- [ ] Unit-тесты + `platformPercentApplied` в ledger

## Связанные задачи

- Sprint 4: [02-balance-accrual.md](../../sprint-4/tasks/02-balance-accrual.md)
- Sprint 5: [01-partner-payouts.md](../../sprint-5/tasks/01-partner-payouts.md)
