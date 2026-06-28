import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  _resetPendingPaymentsForTest,
  getQr,
  handleTbankWebhook,
  initPayment,
  verifyTbankWebhookSecret,
} from './providers/tbank-acquiring.ts'
import type { PaymentContext } from './types.ts'
import { PaymentMethod } from '@prisma/client'

function sampleContext(entityId = 'order_test123'): PaymentContext {
  return {
    kind: 'order',
    entityId,
    shortId: entityId.slice(-6),
    amountKopeks: 2500,
    paymentMethod: PaymentMethod.TBANK_ONLINE,
    point: {
      id: 'point1',
      slug: 'point_dev_1',
      name: 'Dev',
      isActive: true,
      pricePerPageKopeks: 1000,
      paymentMethodsEnabled: [PaymentMethod.TBANK_ONLINE],
      transferPhone: null,
      transferBankLabel: null,
      lastSeenAt: null,
      createdAt: new Date(),
    },
    user: { username: 'test', firstName: 'Test' },
    order: {
      id: entityId,
      fileName: 'doc.pdf',
      pageCount: 2,
    },
  }
}

describe('tbank-acquiring stub', () => {
  it('initPayment returns mock QR payload', () => {
    _resetPendingPaymentsForTest()
    const result = initPayment(sampleContext())
    assert.match(result.paymentId, /^tbank_stub_/)
    assert.match(result.qrPayload, /^STUB-QR:/)
    assert.equal(getQr(result.paymentId), result.qrPayload)
  })

  it('handleTbankWebhook ignores non-confirmed status', async () => {
    const result = await handleTbankWebhook({
      entityId: 'order_test123',
      status: 'REJECTED',
    })
    assert.equal(result.ok, true)
    assert.equal(result.ignored, true)
  })

  it('verifyTbankWebhookSecret allows when secret not configured', () => {
    const original = process.env.TBANK_WEBHOOK_SECRET
    delete process.env.TBANK_WEBHOOK_SECRET
    assert.equal(verifyTbankWebhookSecret(undefined), true)
    if (original !== undefined) {
      process.env.TBANK_WEBHOOK_SECRET = original
    }
  })
})
