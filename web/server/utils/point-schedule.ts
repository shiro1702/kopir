export type PointOpeningHours = {
  weekdays?: string | null
  saturday?: string | null
  sunday?: string | null
}

export type PointScheduleStatus = {
  isOpenNow: boolean
  statusText: string
  closingSoon: boolean
  closesAt: string | null
  opensAt: string | null
}

type Interval = { openMin: number, closeMin: number }

function parseInterval(raw: string): Interval | null {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/)
  if (!match) {
    return null
  }
  const openMin = Number(match[1]) * 60 + Number(match[2])
  const closeMin = Number(match[3]) * 60 + Number(match[4])
  if (openMin >= closeMin) {
    return null
  }
  return { openMin, closeMin }
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

function getZonedDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon'
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  }
  return {
    dayOfWeek: weekdayMap[weekday] ?? 1,
    minutesOfDay: hour * 60 + minute,
  }
}

function intervalForDay(hours: PointOpeningHours | null, dayOfWeek: number): string | null {
  if (!hours) {
    return null
  }
  if (dayOfWeek === 0) {
    return hours.sunday ?? null
  }
  if (dayOfWeek === 6) {
    return hours.saturday ?? null
  }
  return hours.weekdays ?? null
}

function findNextOpen(
  hours: PointOpeningHours | null,
  startDay: number,
  startMin: number,
  timeZone: string,
  now: Date,
): { dayOffset: number, openMin: number } | null {
  if (!hours) {
    return null
  }
  for (let offset = 0; offset < 7; offset += 1) {
    const day = (startDay + offset) % 7
    const raw = intervalForDay(hours, day)
    if (!raw) {
      continue
    }
    const interval = parseInterval(raw)
    if (!interval) {
      continue
    }
    if (offset === 0 && startMin < interval.closeMin) {
      if (startMin < interval.openMin) {
        return { dayOffset: 0, openMin: interval.openMin }
      }
      return null
    }
    if (offset > 0) {
      return { dayOffset: offset, openMin: interval.openMin }
    }
  }
  void timeZone
  void now
  return null
}

export function parsePointOpeningHours(raw: unknown): PointOpeningHours | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const obj = raw as Record<string, unknown>
  return {
    weekdays: obj.weekdays != null ? String(obj.weekdays) : null,
    saturday: obj.saturday != null ? String(obj.saturday) : null,
    sunday: obj.sunday != null ? String(obj.sunday) : null,
  }
}

export function buildOpeningHoursFromAdmin(body: {
  openingHoursWeekdays?: unknown
  openingHoursSaturday?: unknown
  openingHoursSunday?: unknown
}): PointOpeningHours | null {
  const weekdays = body.openingHoursWeekdays ? String(body.openingHoursWeekdays).trim() : ''
  const saturday = body.openingHoursSaturday ? String(body.openingHoursSaturday).trim() : ''
  const sunday = body.openingHoursSunday ? String(body.openingHoursSunday).trim() : ''
  if (!weekdays && !saturday && !sunday) {
    return null
  }
  return {
    weekdays: weekdays || null,
    saturday: saturday || null,
    sunday: sunday || null,
  }
}

export function openingHoursToAdminFields(hours: unknown) {
  const parsed = parsePointOpeningHours(hours)
  return {
    openingHoursWeekdays: parsed?.weekdays ?? '',
    openingHoursSaturday: parsed?.saturday ?? '',
    openingHoursSunday: parsed?.sunday ?? '',
  }
}

export function getPointScheduleStatus(
  point: {
    openingHours?: unknown
    timezone?: string | null
  },
  now: Date = new Date(),
): PointScheduleStatus {
  const hours = parsePointOpeningHours(point.openingHours)
  const timeZone = point.timezone?.trim() || 'Asia/Irkutsk'

  if (!hours || (!hours.weekdays && !hours.saturday && !hours.sunday)) {
    return {
      isOpenNow: true,
      statusText: 'График уточняйте у оператора',
      closingSoon: false,
      closesAt: null,
      opensAt: null,
    }
  }

  const { dayOfWeek, minutesOfDay } = getZonedDateParts(now, timeZone)
  const todayRaw = intervalForDay(hours, dayOfWeek)
  const today = todayRaw ? parseInterval(todayRaw) : null

  if (today && minutesOfDay >= today.openMin && minutesOfDay < today.closeMin) {
    const minutesToClose = today.closeMin - minutesOfDay
    const closesAt = formatTime(today.closeMin)
    return {
      isOpenNow: true,
      statusText: `Открыто до ${closesAt}`,
      closingSoon: minutesToClose <= 30,
      closesAt,
      opensAt: null,
    }
  }

  const next = findNextOpen(hours, dayOfWeek, minutesOfDay, timeZone, now)
  if (!next) {
    return {
      isOpenNow: false,
      statusText: 'Закрыто',
      closingSoon: false,
      closesAt: null,
      opensAt: null,
    }
  }

  const openTime = formatTime(next.openMin)
  if (next.dayOffset === 0) {
    return {
      isOpenNow: false,
      statusText: `Закрыто, откроется сегодня в ${openTime}`,
      closingSoon: false,
      closesAt: null,
      opensAt: openTime,
    }
  }
  if (next.dayOffset === 1) {
    return {
      isOpenNow: false,
      statusText: `Закрыто, откроется завтра в ${openTime}`,
      closingSoon: false,
      closesAt: null,
      opensAt: openTime,
    }
  }
  return {
    isOpenNow: false,
    statusText: `Закрыто, откроется в ${openTime}`,
    closingSoon: false,
    closesAt: null,
    opensAt: openTime,
  }
}
