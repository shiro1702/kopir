import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveBatchKeyboardMode } from './batch.ts'

describe('resolveBatchKeyboardMode', () => {
  it('asks for a point even while Word is calculating so the file can reach an agent', () => {
    assert.equal(
      resolveBatchKeyboardMode({
        calculatingCount: 1,
        hasPoint: false,
        agentOnline: false,
        hasActiveOrders: true,
      }),
      'needs_point',
    )
  })

  it('stays calculating when a point is already bound', () => {
    assert.equal(
      resolveBatchKeyboardMode({
        calculatingCount: 1,
        hasPoint: true,
        agentOnline: true,
        hasActiveOrders: true,
      }),
      'calculating',
    )
  })

  it('marks the point offline after calculation when the agent is gone', () => {
    assert.equal(
      resolveBatchKeyboardMode({
        calculatingCount: 0,
        hasPoint: true,
        agentOnline: false,
        hasActiveOrders: true,
      }),
      'point_offline',
    )
  })

  it('is ready when files are quoted and the agent is online', () => {
    assert.equal(
      resolveBatchKeyboardMode({
        calculatingCount: 0,
        hasPoint: true,
        agentOnline: true,
        hasActiveOrders: true,
      }),
      'ready',
    )
  })
})
