import { Suspense } from 'react'

import { Spinner } from '@/components/ui/spinner'

export default function PlatformLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-4xl">
          <Spinner />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
