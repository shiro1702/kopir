import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isCalculationFileReady } from './calculation.ts'

describe('isCalculationFileReady', () => {
  it('rejects empty path so the agent does not download before blob upload', () => {
    assert.equal(isCalculationFileReady(''), false)
    assert.equal(isCalculationFileReady('   '), false)
    assert.equal(isCalculationFileReady(null), false)
    assert.equal(isCalculationFileReady(undefined), false)
  })

  it('accepts a blob url', () => {
    assert.equal(isCalculationFileReady('https://blob.vercel-storage.com/orders/abc.docx'), true)
  })
})
