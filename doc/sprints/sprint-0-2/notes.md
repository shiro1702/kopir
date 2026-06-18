# Sprint 0.2 — E2E notes

## Pre-flight

```bash
cd web && npm run db:deploy && npm run db:seed
# Добавить в web/.env:
# BATCH_MAX_FILES=5
# BATCH_BUILD_TIMEOUT_MIN=15
```

## Manual test checklist

| # | Сценарий | Статус |
|---|----------|--------|
| 7.1 | 2 PDF → finalize → admin «Оплатить пачку» → 2 печати по порядку | ⬜ |
| 7.2 | 5 файлов (лимит) — сумма и порядок | ⬜ |
| 7.3 | Один файл падает — остальные печатаются, `PARTIALLY_FAILED` | ⬜ |
| 7.4 | Повторный confirm пачки — идемпотентность | ⬜ |
| 7.5 | 1 файл → finalize → оплата → печать | ⬜ |
| 7.6 | Legacy order без `batchId` в admin | ⬜ |

## DoD

- [ ] 5 успешных batch-заказов подряд (≥2 файла)
- [ ] Логи содержат `[batch:{id}]` (web) и `batch=...` (desktop agent)

## Build verification

- `cd web && npm run build` — ✅ passed (2026-06-18)
