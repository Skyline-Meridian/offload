import { Alert } from '@/components/ui/alert'
import type { FormState } from '@/lib/form-state'

/** Shows the result of a Server Action: a success message or a general error. Field errors show under the fields. */
export function FormMessage({ state }: { state: FormState }): React.JSX.Element | null {
  if (state.status === 'ok' && state.message) return <Alert variant="success">{state.message}</Alert>
  if (state.status === 'error' && state.message) return <Alert variant="error">{state.message}</Alert>
  return null
}
