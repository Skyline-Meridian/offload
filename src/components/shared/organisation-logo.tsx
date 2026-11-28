import Image from 'next/image'

import { PlaceholderImage } from '@/components/ui/placeholder-image'
import { cn } from '@/lib/cn'
import { routes } from '@/lib/routes'

type Props = {
  fileId: string | null
  name: string
  variant?: 'avatar' | 'card'
  className?: string
}

export function OrganisationLogo({ fileId, name, variant = 'card', className }: Props): React.JSX.Element {
  const dimension = variant === 'avatar' ? 128 : 400
  return (
    <span className={cn('relative inline-block overflow-hidden bg-white', variant === 'avatar' ? 'size-avatar-md' : 'size-avatar-lg', className)}>
      {fileId ? (
        <Image src={routes.media(fileId, variant)} alt={`${name} logo`} width={dimension} height={dimension} unoptimized className="size-full object-contain" />
      ) : (
        <PlaceholderImage />
      )}
    </span>
  )
}
