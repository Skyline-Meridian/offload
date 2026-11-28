import Image from 'next/image'

import { PlaceholderImage } from '@/components/ui/placeholder-image'
import { cn } from '@/lib/cn'
import { routes } from '@/lib/routes'

type Props = {
  /** File id of the profile picture, or null. */
  fileId: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'size-avatar-sm', md: 'size-avatar-md', lg: 'size-avatar-lg' } as const
const pixels = { sm: 32, md: 48, lg: 96 } as const

export function UserAvatar({ fileId, name, size = 'md', className }: Props): React.JSX.Element {
  return (
    <span className={cn('relative inline-block shrink-0 overflow-hidden rounded-full', sizes[size], className)}>
      {fileId ? (
        <Image src={routes.media(fileId, 'avatar')} alt={name} width={pixels[size]} height={pixels[size]} unoptimized className="size-full object-cover" />
      ) : (
        <PlaceholderImage />
      )}
    </span>
  )
}
