import type { Metadata } from 'next'

import { AuthPage } from '@/components/layout/auth-page'

export const metadata: Metadata = { title: 'Check your email' }

export default function CheckEmailPage(): React.JSX.Element {
  return (
    <AuthPage
      title="Check your email"
      intro="We have sent you a link to verify your email address. Open the link in that email to finish setting up your account."
    >
      <p className="text-body">Did not get it? Look in your spam folder, or sign in and ask for a new link.</p>
    </AuthPage>
  )
}
