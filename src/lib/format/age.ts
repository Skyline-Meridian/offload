/** Age in whole years on `today`. Dates are compared as calendar dates (UTC), so time zones do not shift birthdays. */
export function ageOn(dateOfBirth: Date, today: Date): number {
  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear()
  const hadBirthday =
    today.getUTCMonth() > dateOfBirth.getUTCMonth() ||
    (today.getUTCMonth() === dateOfBirth.getUTCMonth() && today.getUTCDate() >= dateOfBirth.getUTCDate())
  if (!hadBirthday) age -= 1
  return age
}

/** True when `date` is today or up to six months ahead: the "Contract ending soon" badge (PLR-9.8). */
export function contractEndingSoon(date: Date | null, today: Date): boolean {
  if (!date) return false
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const limit = Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 6, today.getUTCDate())
  return date.getTime() >= start && date.getTime() < limit
}
