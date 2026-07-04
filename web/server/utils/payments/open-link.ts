import { createHmac, timingSafeEqual } from 'node:crypto'
import { PaymentMethod as PaymentMethodEnum } from '@prisma/client'
import { getTbankPassword, getTbankWebhookSecret, isTbankConfigured } from '../tbank-config'
import { selectPaymentMethod } from './service'
import { initPayment, type TbankPayChannel } from './providers/tbank-acquiring'

export type PaymentOpenMethod = 'tbank_sbp' | 'tbank_card'

const TOKEN_TTL_MS = 30 * 60 * 1000
const OPEN_METHODS = new Set<PaymentOpenMethod>(['tbank_sbp', 'tbank_card'])

function mapOpenMethod(method: PaymentOpenMethod): PaymentMethodEnum {
  if (method === 'tbank_sbp') return PaymentMethodEnum.TBANK_SBP
  return PaymentMethodEnum.TBANK_ONLINE
}

function channelFromOpenMethod(method: PaymentOpenMethod): TbankPayChannel {
  return method === 'tbank_card' ? 'card' : 'sbp'
}

function signingSecret(): string {
  const secret = getTbankWebhookSecret() || getTbankPassword()
  if (!secret) {
    throw new Error('Payment open links require TBANK_WEBHOOK_SECRET or TBANK_PASSWORD')
  }
  return secret
}

export function getPublicSiteBase(): string {
  const siteUrl = String(process.env.NUXT_PUBLIC_SITE_URL ?? '').trim()
    || String(process.env.VERCEL_URL ?? '').trim()
  if (!siteUrl) {
    throw new Error('NUXT_PUBLIC_SITE_URL or VERCEL_URL is required for payment open links')
  }
  return (siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`).replace(/\/$/, '')
}

function signPayload(payload: string): string {
  return createHmac('sha256', signingSecret()).update(payload).digest('base64url')
}

function verifySignature(payload: string, sig: string): boolean {
  const expected = signPayload(payload)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) {
    return false
  }
  return timingSafeEqual(a, b)
}

export function buildPaymentOpenUrl(params: {
  entityId: string
  method: PaymentOpenMethod
  userExternalId: string
}): string {
  const exp = Date.now() + TOKEN_TTL_MS
  const payload = `${params.entityId}:${params.method}:${params.userExternalId}:${exp}`
  const sig = signPayload(payload)
  const qs = new URLSearchParams({
    entity: params.entityId,
    method: params.method,
    user: params.userExternalId,
    exp: String(exp),
    sig,
  })
  return `${getPublicSiteBase()}/api/payments/open?${qs.toString()}`
}

export function parsePaymentOpenQuery(query: Record<string, unknown>): {
  entityId: string
  method: PaymentOpenMethod
  userExternalId: string
} | null {
  const entityId = String(query.entity ?? '').trim()
  const method = String(query.method ?? '').trim() as PaymentOpenMethod
  const userExternalId = String(query.user ?? '').trim()
  const exp = Number(query.exp)
  const sig = String(query.sig ?? '').trim()

  if (!entityId || !userExternalId || !OPEN_METHODS.has(method) || !Number.isFinite(exp) || !sig) {
    return null
  }
  if (Date.now() > exp) {
    return null
  }

  const payload = `${entityId}:${method}:${userExternalId}:${exp}`
  if (!verifySignature(payload, sig)) {
    return null
  }

  return { entityId, method, userExternalId }
}

export function buildMaxOnlinePaymentUrls(
  entityId: string,
  userExternalId: string,
  methods: PaymentMethodEnum[],
): Partial<Record<'TBANK_SBP' | 'TBANK_ONLINE', string>> {
  if (!isTbankConfigured()) {
    return {}
  }

  const urls: Partial<Record<'TBANK_SBP' | 'TBANK_ONLINE', string>> = {}
  try {
    if (methods.includes(PaymentMethodEnum.TBANK_SBP)) {
      urls.TBANK_SBP = buildPaymentOpenUrl({
        entityId,
        method: 'tbank_sbp',
        userExternalId,
      })
    }
    if (methods.includes(PaymentMethodEnum.TBANK_ONLINE)) {
      urls.TBANK_ONLINE = buildPaymentOpenUrl({
        entityId,
        method: 'tbank_card',
        userExternalId,
      })
    }
  } catch (error) {
    console.error('[payment] failed to build MAX open URLs:', error)
  }
  return urls
}

export async function executePaymentOpenRedirect(params: {
  entityId: string
  method: PaymentOpenMethod
  userExternalId: string
}): Promise<string> {
  if (!isTbankConfigured()) {
    throw createError({
      statusCode: 503,
      data: { error: 'Online payment is not configured', code: 'TBANK_NOT_CONFIGURED' },
    })
  }

  const payMethod = params.method
  const result = await selectPaymentMethod(
    params.entityId,
    mapOpenMethod(params.method),
    params.userExternalId,
  )
  const shortId = params.entityId.slice(-6)
  const amountKopeks = result.kind === 'batch'
    ? result.batch.totalAmountKopeks
    : result.order.amountKopeks
  const point = result.kind === 'batch'
    ? result.batch.point
    : result.order.point

  const init = await initPayment({
    kind: result.kind,
    entityId: params.entityId,
    shortId,
    amountKopeks,
    paymentMethod: result.method,
    point,
    user: result.kind === 'batch' ? result.batch.user : result.order.user,
    batch: result.kind === 'batch' ? result.batch : undefined,
    order: result.kind === 'order' ? result.order : undefined,
  }, channelFromOpenMethod(params.method))

  return init.payUrl
}
