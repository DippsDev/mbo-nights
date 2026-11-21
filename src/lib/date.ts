const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** Splits '19 Sep 2026' into ticket-stub parts without Date string parsing (Safari is strict). */
export function stubDate(date: string) {
  const [day = '', month = '', year = ''] = date.split(' ')
  const m = MONTHS.indexOf(month.slice(0, 3).toLowerCase())
  const weekday =
    m >= 0
      ? new Date(Number(year), m, Number(day)).toLocaleDateString('en-GB', { weekday: 'short' })
      : ''
  return { day, month, year, weekday }
}

/** '28 Nov 2026' + '16:00' as a timestamp in Gaborone time (UTC+2, no daylight saving). NaN if unparseable. */
export function startsAt(date: string, time: string) {
  const { day, month, year } = stubDate(date)
  const m = MONTHS.indexOf(month.slice(0, 3).toLowerCase())
  const [h = 0, min = 0] = time.split(':').map(Number)
  if (m < 0) return NaN
  return Date.UTC(Number(year), m, Number(day), h - 2, min)
}
