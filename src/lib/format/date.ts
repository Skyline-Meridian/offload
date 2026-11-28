const dateFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
const monthFormat = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/London',
})

/** A calendar date (a date of birth, a contract end). Stored as a date, so it is read as UTC. DD/MM/YYYY. */
export function formatDate(date: Date): string {
  return dateFormat.format(date)
}

export function formatMonthYear(date: Date): string {
  return monthFormat.format(date)
}

/** A moment in time, shown in UK time. */
export function formatDateTime(date: Date): string {
  return dateTimeFormat.format(date)
}

/** Value for an `<input type="date">`. */
export function toDateInputValue(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : ''
}
