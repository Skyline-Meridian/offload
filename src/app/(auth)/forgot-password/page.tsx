import type { Metadata } from 'next'

import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { AuthPage } from '@/components/layout/auth-page'

export const metadata: Metadata = { title: 'Forgot password' }

export default function ForgotPasswordPage(): React.JSX.Element {
  return (
    <AuthPage title="Forgot password" intro="Enter your email and we will send you a link to choose a new password.">
      <ForgotPasswordForm />
    </AuthPage>
  )
}
