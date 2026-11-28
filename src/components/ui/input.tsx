'use client'

import {
  FieldError,
  Input as AriaInput,
  Label,
  Text,
  TextArea as AriaTextArea,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components'

import { cn } from '@/lib/cn'

const control =
  'text-body bg-surface border-thin border-border rounded-none px-sm py-xs w-full text-text-light focus:border-accent focus:text-heading focus:outline-none data-invalid:border-error'

type Props = Omit<AriaTextFieldProps, 'className' | 'children'> & {
  label: string
  hint?: string
  /** Messages from the server (field errors). */
  errors?: readonly string[]
  placeholder?: string
  multiline?: boolean
  rows?: number
  className?: string
}

/** A labelled text field. The label, hint and error are linked to the control for screen readers. */
export function TextField({ label, hint, errors, placeholder, multiline, rows, className, ...rest }: Props): React.JSX.Element {
  const invalid = Boolean(errors && errors.length > 0)
  return (
    <AriaTextField className={cn('flex flex-col gap-2xs', className)} isInvalid={invalid || rest.isInvalid} {...rest}>
      <Label className="text-label">
        {label}
        {rest.isRequired ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {multiline ? (
        <AriaTextArea className={control} placeholder={placeholder} rows={rows ?? 4} />
      ) : (
        <AriaInput className={control} placeholder={placeholder} />
      )}
      {hint ? (
        <Text slot="description" className="text-hint">
          {hint}
        </Text>
      ) : null}
      <FieldError className="text-body text-error">{invalid ? errors!.join(' ') : undefined}</FieldError>
    </AriaTextField>
  )
}
