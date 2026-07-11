import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isMaxAttachmentNotReadyError } from './client.ts'

describe('max/client', () => {
  it('detects MAX attachment-not-ready errors', () => {
    const error = new Error(
      'MAX API POST /messages failed: 400 {"code":"attachment.not.ready","message":"Key: errors.process.attachment.file.not.processed"}',
    )
    assert.equal(isMaxAttachmentNotReadyError(error), true)
  })

  it('ignores unrelated MAX errors', () => {
    const error = new Error('MAX API POST /messages failed: 403 {"code":"forbidden"}')
    assert.equal(isMaxAttachmentNotReadyError(error), false)
    assert.equal(isMaxAttachmentNotReadyError('not an error'), false)
  })
})
