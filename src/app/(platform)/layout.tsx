import Link from 'next/link'
import { Suspense } from 'react'

import { Alert } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { routes } from '@/lib/routes'
import { getPaymentBanner } from '@/server/dal/billing'
import { getViewer } from '@/server/dal/viewer'

/** Shown on every dashboard page to the managers of an organisation whose payment failed and whose grace period is over. */
async function PaymentBanner(): Promise<React.JSX.Element | null> {
  const viewer = await getViewer()
  if (!viewer || viewer.role !== 'MANAGER' || viewer.membership?.status !== 'ACTIVE' || !viewer.organisation) return null
  if (!(await getPaymentBanner(viewer.organisation.id))) return null
  return (
    <Alert variant="error" className="text-center">
      Your payment failed.{' '}
      <Link href={routes.subscription} className="text-link">
        Update payment method
      </Link>
    </Alert>
  )
}

export default function PlatformLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-4xl">
          <Spinner />
        </div>
      }
    >
      <Suspense fallback={null}>
        <PaymentBanner />
      </Suspense>
      {children}
    </Suspense>
  )
}
