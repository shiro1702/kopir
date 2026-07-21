import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getPointScheduleStatus } from './point-schedule'

describe('getPointScheduleStatus', () => {
  it('returns open when inside weekday hours', () => {
    const monday10am = new Date('2026-07-20T02:00:00.000Z') // 10:00 Asia/Irkutsk Monday
    const status = getPointScheduleStatus({
      timezone: 'Asia/Irkutsk',
      openingHours: { weekdays: '09:00-19:00', saturday: null, sunday: null },
    }, monday10am)
    assert.equal(status.isOpenNow, true)
    assert.match(status.statusText, /Открыто до/)
  })

  it('returns closed outside hours', () => {
    const monday8pm = new Date('2026-07-20T12:00:00.000Z') // 20:00 Asia/Irkutsk Monday
    const status = getPointScheduleStatus({
      timezone: 'Asia/Irkutsk',
      openingHours: { weekdays: '09:00-19:00', saturday: null, sunday: null },
    }, monday8pm)
    assert.equal(status.isOpenNow, false)
    assert.match(status.statusText, /Закрыто/)
  })

  it('defaults to open when schedule missing', () => {
    const status = getPointScheduleStatus({ timezone: 'Asia/Irkutsk', openingHours: null })
    assert.equal(status.isOpenNow, true)
  })
})
