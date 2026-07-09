import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parsePartnerCommandCallback,
  parsePartnerCommandText,
} from './partner-commands.ts'

describe('partner-commands', () => {
  it('parses slash commands', () => {
    assert.equal(parsePartnerCommandText('/partner'), 'partner')
    assert.equal(parsePartnerCommandText('/partner_points'), 'partner_points')
    assert.equal(parsePartnerCommandText('/partner_balance'), 'partner_balance')
    assert.equal(parsePartnerCommandText('/partner_requisites'), 'partner_requisites')
    assert.equal(parsePartnerCommandText('/partner_help@KopirBot'), 'partner_help')
  })

  it('parses reply keyboard labels', () => {
    assert.equal(parsePartnerCommandText('📋 Кабинет'), 'partner')
    assert.equal(parsePartnerCommandText('💰 Баланс'), 'partner_balance')
  })

  it('parses callbacks', () => {
    assert.equal(parsePartnerCommandCallback('partner_cmd:partner_help'), 'partner_help')
    assert.equal(parsePartnerCommandCallback('partner_cmd:nope'), null)
  })
})
