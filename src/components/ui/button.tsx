'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import { Button as AriaButton } from 'react-aria-components'

import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'sm'

const base =
  'text-button inline-flex items-center justify-center gap-xs border-strong rounded-none transition-fast cursor-pointer data-disabled:cursor-not-allowed data-disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent border-accent text-surface hover:bg-surface hover:text-accent data-hovered:bg-surface data-hovered:text-accent',
  secondary:
    'bg-secondary border-secondary text-surface hover:bg-surface hover:text-secondary data-hovered:bg-surface data-hovered:text-secondary',
  ghost:
    'bg-transparent border-border text-heading hover:border-accent hover:text-accent data-hovered:border-accent data-hovered:text-accent',
  danger:
    'bg-error border-error text-white hover:bg-white hover:text-error data-hovered:bg-white data-hovered:text-error',
}

const sizes: Record<ButtonSize, string> = {
  md: 'px-2xl py-sm',
  sm: 'px-lg py-xs',
}

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}): string {
  return cn(base, variants[variant], sizes[size], className)
}

type ButtonProps = Omit<ComponentProps<typeof AriaButton>, 'className'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

export function Button({ variant, size, className, ...rest }: ButtonProps): React.JSX.Element {
  return <AriaButton className={buttonClasses({ variant, size, className })} {...rest} />
}

type LinkButtonProps = Omit<ComponentProps<typeof Link>, 'className'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

/** A link that looks like a button. Use for navigation; use Button for actions. */
export function LinkButton({ variant, size, className, ...rest }: LinkButtonProps): React.JSX.Element {
  return <Link className={buttonClasses({ variant, size, className })} {...rest} />
}
