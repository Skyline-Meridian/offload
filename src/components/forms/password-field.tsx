'use client'

import { Check, Circle } from 'lucide-react'
import { useState } from 'react'

import { Icon } from '@/components/ui/icon'
import { TextField } from '@/components/ui/input'
import { cn } from '@/lib/cn'
import { passwordRules } from '@/lib/password-rules'

type Props = {
  name?: string
  label?: string
  errors?: readonly string[]
  /** Show which rules are met while typing (GEN-2.3). */
  showRules?: boolean
  autoComplete?: 'new-password' | 'current-password'
}

export function PasswordField({
  name = 'password',
  label = 'Password',
  errors,
  showRules = false,
  autoComplete = 'new-password',
}: Props): React.JSX.Element {
  const [value, setValue] = useState('')
  return (
    <div className="flex flex-col gap-xs">
      <TextField
        name={name}
        label={label}
        type="password"
        autoComplete={autoComplete}
        isRequired
        errors={errors}
        value={value}
        onChange={setValue}
      />
      {showRules ? (
        <ul className="flex flex-col gap-2xs" aria-label="Password rules">
          {passwordRules.map((rule) => {
            const met = rule.test(value)
            return (
              <li key={rule.id} className={cn('text-hint flex items-center gap-2xs', met && 'text-success')}>
                <Icon icon={met ? Check : Circle} size="sm" />
                {rule.label}
                <span className="sr-only">{met ? ' (met)' : ' (not met yet)'}</span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
