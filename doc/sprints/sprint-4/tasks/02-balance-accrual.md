# 02 — Баланс партнёра (PAY-06, фаза 1 PAY-07)

| | |
|---|---|
| **Статус** | ✅ |
| **Feature** | PAY-06, PAY-07 (начисление) |
| **Спека** | [partner-payouts.md](../../../business/partner-payouts.md) § 1–3 |

## Scope

### Prisma

- `PartnerBalance` или ledger: `partnerId`, `amountKopeks`, `type` (`CREDIT`/`PAYOUT`), `orderId`/`batchId`, `createdAt`
- На `Point`: `commissionPercent` (default **25**; early bird ≤10 точек — **14%**; пилотные точки могут остаться на 30 вручную) или `payoutType` (`percent` | `per_page`)

### Логика

При `confirmBatchPayment` / webhook онлайн-оплаты:

```
Клиент заплатил 100 ₽, commission 25% (default)
→ platform: +25 ₽
→ partner balance: +75 ₽
```

(Early bird ≤10 точек: **14%** → 86/14. Пилотные точки с 30% в админке: split 70/30. Tiered шкала — Sprint 6.)

- Только для **TBANK_*** online (ручная оплата — без автоначисления на MVP)
- Идемпотентность: один batch → одно начисление

### Bot

- Экран «Баланс»: сумма к выплате, последние 10 операций
- Текст: «Выплаты раз в неделю по реквизитам» (фактический перевод — Sprint 5)

## Не в scope (Sprint 5)

- Реестр выплат в super-admin
- Экспорт для Т-Бизнес
- Кнопка «Запросить выплату»
- Mass Payments API (PAY-08)

## DoD

- [x] После prod-оплаты баланс партнёра +N ₽ в БД
- [x] Партнёр видит баланс в боте
- [x] Unit-тест: split 70/30 на тестовой сумме
