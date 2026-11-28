export type FormState =
  | { status: 'idle' }
  | { status: 'ok'; message?: string }
  | { status: 'error'; message?: string; fieldErrors?: Record<string, string[] | undefined> }

export const idleFormState: FormState = { status: 'idle' }

/** Turns FormData into a plain object. Repeated keys become arrays; empty strings stay as they are. */
export function formToObject(formData: FormData): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const out: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {}
  for (const key of new Set(formData.keys())) {
    const all = formData.getAll(key)
    out[key] = all.length > 1 ? all : all[0]
  }
  return out
}
