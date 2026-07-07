import { assertAdminAuth } from '../../../utils/admin-auth'
import { listPartnersWithPositiveBalance } from '../../../utils/partner-balance'
import {
  buildRegistry1C,
  buildRegistryEntries,
  buildRegistryTxt,
  buildRegistryXml,
  type RegistryFormat,
  type RegistryPayer,
} from '../../../utils/payout-registry'

const MONTHS_RU = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

function defaultPeriodLabel(date: Date): string {
  return `${MONTHS_RU[date.getMonth()]} ${date.getFullYear()}`
}

function resolvePayer(): RegistryPayer {
  const config = useRuntimeConfig()
  return {
    name: String(config.payoutPayerName || config.public.legalEntityName || '').trim(),
    inn: String(config.payoutPayerInn || config.public.legalInn || '').replace(/\D/g, ''),
    account: String(config.payoutPayerAccount || '').replace(/\D/g, ''),
    bik: String(config.payoutPayerBik || '').replace(/\D/g, ''),
    bankName: String(config.payoutPayerBankName || '').trim(),
    corrAccount: String(config.payoutPayerCorrAccount || '').replace(/\D/g, ''),
  }
}

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const body = await readBody(event)
  const format: RegistryFormat = body?.format === 'xml' ? 'xml' : body?.format === '1c' ? '1c' : 'txt'
  const selectedIds: string[] | null = Array.isArray(body?.partnerIds) && body.partnerIds.length > 0
    ? body.partnerIds.map((id: unknown) => String(id))
    : null

  const now = new Date()
  const periodLabel = String(body?.periodLabel ?? '').trim() || defaultPeriodLabel(now)
  const periodFrom = body?.periodFrom ? new Date(body.periodFrom) : null
  const periodTo = body?.periodTo ? new Date(body.periodTo) : null

  let rows = await listPartnersWithPositiveBalance()
  if (selectedIds) {
    const set = new Set(selectedIds)
    rows = rows.filter((r) => set.has(r.partnerId))
  }

  const { entries, skipped } = buildRegistryEntries(rows, periodLabel)
  if (entries.length === 0) {
    throw createError({
      statusCode: 400,
      data: {
        error: 'Нет партнёров с заполненными реквизитами и положительным балансом',
        code: 'NO_ELIGIBLE_PARTNERS',
        skipped,
      },
    })
  }

  const payer = resolvePayer()
  const needsPayerBank = format === 'xml' || format === '1c'
  if (needsPayerBank && (!payer.account || !payer.bik || !payer.name || !payer.inn)) {
    throw createError({
      statusCode: 400,
      data: {
        error: 'Заполните реквизиты плательщика: PAYOUT_PAYER_NAME, PAYOUT_PAYER_INN, PAYOUT_PAYER_ACCOUNT, PAYOUT_PAYER_BIK',
        code: 'PAYER_NOT_CONFIGURED',
      },
    })
  }

  const meta = { periodLabel, createdAt: now, periodFrom, periodTo }
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  let content: string
  let contentType: string
  let extension: string

  if (format === 'xml') {
    content = buildRegistryXml(payer, entries, meta)
    contentType = 'application/xml; charset=utf-8'
    extension = 'xml'
  } else if (format === '1c') {
    content = buildRegistry1C(payer, entries, meta)
    contentType = 'text/plain; charset=utf-8'
    extension = 'txt'
  } else {
    content = buildRegistryTxt(entries)
    contentType = 'text/plain; charset=utf-8'
    extension = 'txt'
  }

  const suffix = format === '1c' ? '-1c' : ''
  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Content-Disposition', `attachment; filename="kopir-payouts-${stamp}${suffix}.${extension}"`)
  setHeader(event, 'X-Registry-Count', String(entries.length))
  setHeader(event, 'X-Registry-Skipped', String(skipped.length))

  return content
})
