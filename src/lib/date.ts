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
