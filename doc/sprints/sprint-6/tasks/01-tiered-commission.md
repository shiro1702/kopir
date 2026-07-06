# 01 — Прогрессивная комиссия от оборота точки (PAY-06b)

| | |
|---|---|
| **Спринт** | 6 |
| **Статус** | ⬜ |
| **Приоритет** | P1 |
| **Feature** | PAY-06 (фаза 2), экономика партнёра |
| **Спека** | [pricing-strategies.md](../../../business/pricing-strategies.md) · [partner-economics.md](../../../marketing/texts/partner-economics.md) |
| **Предусловие** | Sprint 4 ✅ фиксированный `commissionPercent` в админке + `resolveEffectiveCommissionPercent()` |
| **Оценка** | 2–3 дня |

## Проблема

Сейчас комиссия платформы задаётся **вручную** на точку (`Point.commissionPercent`, default 30%). Для масштаба нужна **прогрессивная шкала**: чем выше месячный оборот точки, тем ниже % платформы — стимул роста без переговоров с каждым партнёром.

Sprint 4 оставил extension point в коде:

- [`web/server/utils/commission.ts`](../../../../web/server/utils/commission.ts) — `CommissionTier`, `pickTierPercent()`, `resolveEffectiveCommissionPercent()`
- начисление: [`partner-balance.ts`](../../../../web/server/utils/partner-balance.ts) → `creditPartnerBalanceForBatch`

## Бизнес-правила (MVP шкала)

Ориентир — [pricing-strategies.md](../../../business/pricing-strategies.md) «комбо 1+3»:

| Оборот точки за календарный месяц (TBANK, ₽) | Комиссия платформы |
|----------------------------------------------|-------------------|
| до 10 000 | 12% |
| 10 000 – 49 999 | 10% |
| ≥ 50 000 | 8% |

Дополнительно (флаги на `Point` или `Partner`):

| Правило | Поведение |
|---------|-----------|
| **Ранние птички** | `earlyBirdCommissionPercent = 7` — не участвует в шкале, навсегда |
| **Ручной override** | `commissionMode = fixed` + `commissionPercent` — как сейчас (админка) |
| **Шкала** | `commissionMode = tiered` + `commissionTiers` JSON |

> Точные пороги и % — конфигурируемые в super-admin, не хардкод в коде.

## Когда считается %

**В момент начисления** на баланс партнёра (`creditPartnerBalanceForBatch`), не в конце месяца ретроактивно.

```
Клиент оплатил batch на 500 ₽ (TBANK)
→ turnover_month = SUM(paid TBANK batches point) за текущий месяц, включая этот batch
→ platform% = pickTier(turnover_month)
→ partnerCredit = 500 * (100 - platform%) / 100
→ PartnerBalanceEntry CREDIT + metadata (platformPercentUsed)
```

### Оборот для шкалы

| Включать | Да/нет |
|----------|--------|
| `TBANK_SBP`, `TBANK_ONLINE` | ✅ |
| `SBP_TRANSFER`, `ON_SITE` | ❌ (как в Sprint 4) |
| Статусы batch | `PAID`, `COMPLETED`, `PARTIALLY_FAILED` (оплаченные) |
| Период | календарный месяц `paidAt` (TZ: `Asia/Irkutsk` / Улан-Удэ) |
| Текущий batch | ✅ входит в turnover **до** расчёта % |

Идемпотентность: повторный webhook не меняет уже записанный `platformPercent` в ledger.

## Prisma (миграция)

```prisma
enum CommissionMode {
  FIXED
  TIERED
}

model Point {
  // ...
  commissionMode     CommissionMode @default(FIXED)
  commissionPercent  Int            @default(30)   // fallback / FIXED mode
  commissionTiers    Json?          // CommissionTier[]
  earlyBirdLocked    Boolean        @default(false) // 7% навсегда
}
```

Опционально на `PartnerBalanceEntry`:

```prisma
platformPercentApplied Int?  // аудит: какой % был при начислении
turnoverMonthKopeks    Int?  // оборот на момент расчёта
```

Тип `CommissionTier` (уже в коде):

```ts
{ minMonthlyTurnoverKopeks: number; platformPercent: number }
```

## Код

### 1. `getPointMonthlyPaidTurnoverKopeks(pointId, at: Date)`

- Агрегация `OrderBatch.totalAmountKopeks` за месяц `at`
- Фильтр: `paymentMethod IN (TBANK_*)`, `paidAt` not null, статус оплачен

### 2. `resolveEffectiveCommissionPercent(pointId, batchAmountKopeks?)`

Расширить существующую функцию:

1. Загрузить `Point` (mode, tiers, earlyBird, fixed %)
2. Если `earlyBirdLocked` → return 7 (или `earlyBirdCommissionPercent`)
3. Если `commissionMode === FIXED` → return `commissionPercent`
4. Если `TIERED` → `turnover = monthlyTurnover + (batchAmountKopeks ?? 0)` → `pickTierPercent(turnover, tiers)`

### 3. Admin UI (`/admin/points`)

| Режим | UI |
|-------|-----|
| Fixed | поле % (уже есть) |
| Tiered | таблица порогов: «от X ₽/мес → Y%», кнопки +/− строка |
| Early bird | чекбокс «7% навсегда (ранняя точка)» |

Пресет «Стандартная шкала» — кнопка заполнить 12/10/8 из спеки.

### 4. Partner bot (read-only)

Экран **Баланс** или **Настройки**:

> Ваша комиссия сейчас: **10%** (оборот за месяц: 24 300 ₽).  
> До снижения до 8% осталось: 25 700 ₽.

### 5. Super-admin отчёт выплат

В реестре PAY-07 показывать средний % за период / breakdown по tier.

## Не в scope

- Ретроактивный пересчёт прошлых `CREDIT` при смене tier в середине месяца
- Разные шкалы по городам (→ backlog)
- SaaS 1 900 ₽/мес + 3% (отдельная модель)
- Комиссия с доп. услуг (фото, визитки)

## Edge cases

| Ситуация | Поведение |
|----------|-----------|
| Пустой `commissionTiers` при `TIERED` | fallback на `commissionPercent` |
| Переход tier внутри месяца | каждый новый batch — % по **текущему** накопленному обороту |
| Точка без партнёра | skip credit (как сейчас) |
| Первая оплата месяца | turnover = сумма первого batch |

## DoD

- [ ] Точка в режиме `TIERED` с оборотом 9k → batch 1k начисляет партнёру 88% (12%)
- [ ] После перехода оборота за 10k следующий batch → 90% партнёру (10%)
- [ ] `earlyBirdLocked` → всегда 7% платформы
- [ ] `FIXED` + 30% в админке — поведение как Sprint 4
- [ ] Unit-тесты: `pickTierPercent`, turnover agg, `resolveEffectiveCommissionPercent`
- [ ] Партнёр видит текущий % и оборот в боте
- [ ] В ledger сохранён `platformPercentApplied` для аудита

## Связанные задачи

- Sprint 4: [02-balance-accrual.md](../../sprint-4/tasks/02-balance-accrual.md) — фиксированный split
- Sprint 5: [01-partner-payouts.md](../../sprint-5/tasks/01-partner-payouts.md) — реестр; отчёт агента может включать tier breakdown
- Backlog: partner landing v2 калькулятор дохода с учётом tier
