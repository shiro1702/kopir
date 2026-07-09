import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatClientCommandList,
  parseClientCommandCallback,
  parseClientCommandText,
} from './client-commands.ts'

describe('client-commands', () => {
  it('parses slash commands', () => {
    assert.equal(parseClientCommandText('/help'), 'help')
    assert.equal(parseClientCommandText('/print'), 'print')
    assert.equal(parseClientCommandText('/point'), 'point')
    assert.equal(parseClientCommandText('/files'), 'files')
    assert.equal(parseClientCommandText('/my_files'), 'files')
    assert.equal(parseClientCommandText('/help@KopirBot'), 'help')
  })

  it('parses reply keyboard labels', () => {
    assert.equal(parseClientCommandText('❓ Помощь'), 'help')
    assert.equal(parseClientCommandText('📄 Печать'), 'print')
  })

  it('parses client command callbacks', () => {
    assert.equal(parseClientCommandCallback('client_cmd:help'), 'help')
    assert.equal(parseClientCommandCallback('client_cmd:unknown'), null)
  })

  it('formats client command list', () => {
    const text = formatClientCommandList()
    assert.match(text, /\/print/)
    assert.match(text, /\/files/)
    assert.match(text, /\/point/)
    assert.match(text, /\/help/)
  })
})
