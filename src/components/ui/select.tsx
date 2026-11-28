import { cn } from '@/lib/cn'

export type SelectOption = { value: string; label: string }

type Props = {
  name: string
  label: string
  options: readonly SelectOption[]
  errors?: readonly string[]
  hint?: string
  multiple?: boolean
  required?: boolean
  placeholder?: string
  defaultValue?: string | readonly string[]
  className?: string
}

/** A labelled native select. Native controls give the best keyboard and phone behaviour for long lists. */
export function Select({ name, label, options, errors, hint, multiple, required, placeholder, defaultValue, className }: Props): React.JSX.Element {
  const id = `field-${name}`
  const invalid = Boolean(errors?.length)
  const describedBy = [hint ? `${id}-hint` : '', invalid ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-2xs', className)}>
      <label htmlFor={id} className="text-label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <select
        id={id}
        name={name}
        multiple={multiple}
        required={required}
        defaultValue={defaultValue as string | string[] | undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          'text-body bg-surface border-thin border-border rounded-none px-sm py-xs w-full text-heading focus:border-accent focus:outline-none',
          invalid && 'border-error',
        )}
      >
        {!multiple && placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? (
        <p id={`${id}-hint`} className="text-hint">
          {hint}
        </p>
      ) : null}
      {invalid ? (
        <p id={`${id}-error`} className="text-body text-error">
          {errors!.join(' ')}
        </p>
      ) : null}
    </div>
  )
}
