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

## Модель комиссии (гибрид)

### Слой 1 — Сейчас (Sprint 4–5)

| Кто | Режим | % платформы |
|-----|-------|-------------|
| **Новые точки** | `FIXED` | **15%** default (партнёру 85%) |
| **Пилотные точки** | `FIXED` | **30%** вручную в админке, пока не переведём |
| **Ранние птички** | `FIXED` + флаг | **7%** навсегда |

> Default в БД и форме админки: **15**, не 30. Пилоты не трогаем — у них в БД остаётся 30.

### Слой 2 — Tiered (этот спринт)

Шкала **начинается близко к пилотным 30%** и сходится к целевым 12% при росте оборота:

| Оборот точки за месяц (TBANK, ₽) | Комиссия платформы | Партнёру |
|----------------------------------|-------------------|----------|
| до 10 000 | **25%** | 75% |
| 10 000 – 49 999 | **18%** | 82% |
| 50 000 – 149 999 | **14%** | 86% |
| ≥ 150 000 | **12%** | 88% |

Логика: на малых оборотах платформа ближе к пилоту (25% vs 30%), на крупных — как в outreach (12%). Порог 150k — когда точка «окупает» инфраструктуру.

### Слой 3 — Overrides

| Правило | Поведение |
|---------|-----------|
| `commissionMode = fixed` | всегда `commissionPercent` из админки (пилот 30%, новая точка 15%, ручная правка) |
| `commissionMode = tiered` | шкала выше; `commissionPercent` = fallback если tiers пуст |
| `earlyBirdLocked` | **7%** платформы, шкала не применяется |
| Перевод пилота на tiered | явное действие в админке + уведомление партнёру («с оборотом комиссия снижается») |

### Сравнение вариантов (почему не «сразу 12%»)

| Вариант | Плюс | Минус |
|---------|------|-------|
| A. Default 15% сейчас | Честно для новых, близко к целевой экономике | Пилоты на 30% — разный разговор |
| B. Шкала от 25% | Плавный спуск с пилота | На старте всё ещё выше outreach |
| C. Гибрид A+B | Новые сразу 15%; tiered — мост от 25% к 12% | Чуть сложнее объяснить | **← выбрано** |

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
  commissionPercent  Int            @default(15)   // FIXED / fallback
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
| Fixed | % платформы (default 15) |
| Tiered | таблица порогов + пресет «Стандартная шкала» |
| Early bird | ☑ 7% навсегда |
| Пилот | подсказка: «30% — legacy пилот; для новых рекомендуем 15% или Tiered» |

## Partner bot (read-only)

> Комиссия сейчас: **18%** (оборот за месяц: 24 300 ₽).  
> До **14%** осталось: 25 700 ₽ оборота.

## DoD

- [ ] Новая точка без правок → FIXED **15%**
- [ ] Пилот с 30% в БД → без изменений до ручного перевода
- [ ] TIERED, оборот 9k → batch 1k → партнёру **75%** (25%)
- [ ] Оборот перешёл 10k → следующий batch → **82%** (18%)
- [ ] `earlyBirdLocked` → 7%
- [ ] Unit-тесты + `platformPercentApplied` в ledger

## Связанные задачи

- Sprint 4: [02-balance-accrual.md](../../sprint-4/tasks/02-balance-accrual.md)
- Sprint 5: [01-partner-payouts.md](../../sprint-5/tasks/01-partner-payouts.md)
