import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  assertPointAgentOnline,
  getPointOfflineThresholdSec,
  isPointAgentOnline,
} from './points.ts'

const originalThreshold = process.env.POINT_OFFLINE_THRESHOLD_SEC

afterEach(() => {
  if (originalThreshold === undefined) {
    delete process.env.POINT_OFFLINE_THRESHOLD_SEC
  } else {
    process.env.POINT_OFFLINE_THRESHOLD_SEC = originalThreshold
  }
})

describe('isPointAgentOnline', () => {
  it('returns false when lastSeenAt is null', () => {
    assert.equal(isPointAgentOnline({ lastSeenAt: null }), false)
  })

  it('returns true when lastSeenAt is within threshold', () => {
    process.env.POINT_OFFLINE_THRESHOLD_SEC = '20'
    const lastSeenAt = new Date(Date.now() - 5_000)
    assert.equal(isPointAgentOnline({ lastSeenAt }), true)
  })

  it('returns false when lastSeenAt is older than threshold', () => {
    process.env.POINT_OFFLINE_THRESHOLD_SEC = '20'
    const lastSeenAt = new Date(Date.now() - 25_000)
    assert.equal(isPointAgentOnline({ lastSeenAt }), false)
  })
})

describe('assertPointAgentOnline', () => {
  it('throws POINT_AGENT_OFFLINE when agent is offline', () => {
    process.env.POINT_OFFLINE_THRESHOLD_SEC = '20'
    const lastSeenAt = new Date(Date.now() - 60_000)
    assert.throws(
      () => assertPointAgentOnline({ lastSeenAt }),
      (error: unknown) => {
        assert.ok(error && typeof error === 'object' && 'data' in error)
        const data = (error as { data?: { code?: string } }).data
        return data?.code === 'POINT_AGENT_OFFLINE'
      },
    )
  })

  it('does not throw when agent is online', () => {
    process.env.POINT_OFFLINE_THRESHOLD_SEC = String(getPointOfflineThresholdSec())
    const lastSeenAt = new Date()
    assert.doesNotThrow(() => assertPointAgentOnline({ lastSeenAt }))
  })
})
