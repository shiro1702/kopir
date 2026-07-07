import type { Prisma } from '@prisma/client'

/** Partner bank requisites for payouts (stored in Partner.requisites Json). */
export type PartnerRequisites = {
  /** Legal name, e.g. «ИП Иванов Иван Иванович». */
  legalName: string
  /** INN: 10 digits (company) or 12 digits (sole proprietor). */
  inn: string
  /** Settlement account: 20 digits. */
  accountNumber: string
  /** Bank BIK: 9 digits. */
  bik: string
}

const DIGITS_ONLY = /^\d+$/

function digits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '')
}

/** Reads requisites from a Prisma Json value; returns null when absent or not an object. */
export function parsePartnerRequisites(raw: Prisma.JsonValue | null | undefined): PartnerRequisites | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }
  const obj = raw as Record<string, unknown>
  return {
    legalName: String(obj.legalName ?? '').trim(),
    inn: digits(obj.inn),
    accountNumber: digits(obj.accountNumber),
    bik: digits(obj.bik),
  }
}

/** True when every field is present and passes format validation. */
export function isRequisitesComplete(req: PartnerRequisites | null): req is PartnerRequisites {
  if (!req) {
    return false
  }
  return (
    req.legalName.length > 0
    && (req.inn.length === 10 || req.inn.length === 12)
    && req.accountNumber.length === 20
    && req.bik.length === 9
  )
}

/**
 * Normalizes and validates raw input into requisites.
 * Throws a 400 createError with a field-specific code on invalid data.
 */
export function validatePartnerRequisites(input: {
  legalName?: unknown
  inn?: unknown
  accountNumber?: unknown
  bik?: unknown
}): PartnerRequisites {
  const legalName = String(input.legalName ?? '').trim()
  const inn = digits(input.inn)
  const accountNumber = digits(input.accountNumber)
  const bik = digits(input.bik)

  if (!legalName) {
    throw createError({
      statusCode: 400,
      data: { error: 'legalName cannot be empty', code: 'INVALID_LEGAL_NAME' },
    })
  }
  if (!DIGITS_ONLY.test(inn) || (inn.length !== 10 && inn.length !== 12)) {
    throw createError({
      statusCode: 400,
      data: { error: 'inn must contain 10 or 12 digits', code: 'INVALID_INN' },
    })
  }
  if (accountNumber.length !== 20) {
    throw createError({
      statusCode: 400,
      data: { error: 'accountNumber must contain 20 digits', code: 'INVALID_ACCOUNT' },
    })
  }
  if (bik.length !== 9) {
    throw createError({
      statusCode: 400,
      data: { error: 'bik must contain 9 digits', code: 'INVALID_BIK' },
    })
  }

  return { legalName, inn, accountNumber, bik }
}

/** Human-readable multi-line view for bot and admin. */
export function formatRequisitesForDisplay(req: PartnerRequisites | null): string {
  if (!req || !req.legalName) {
    return 'Реквизиты не заполнены'
  }
  const lines = [req.legalName]
  if (req.inn) lines.push(`ИНН: ${req.inn}`)
  if (req.accountNumber) lines.push(`Р/С: ${req.accountNumber}`)
  if (req.bik) lines.push(`БИК: ${req.bik}`)
  return lines.join('\n')
}
