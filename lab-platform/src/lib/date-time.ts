const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'

export function dateTimeLocalToIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error('La fecha y hora no tienen un formato válido')
  }

  const date = new Date(`${value}:00-03:00`)
  if (Number.isNaN(date.getTime())) throw new Error('La fecha y hora no son válidas')
  return date.toISOString()
}

export function isoToDateTimeLocal(value: string | null | undefined): string {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]))
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`
}
