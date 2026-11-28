import { Footer } from '@/components/layout/footer'
import { getSetting } from '@/server/settings'

export async function SiteFooter(): Promise<React.JSX.Element> {
  const supportEmail = await getSetting<string>('support.email')
  return <Footer supportEmail={supportEmail} year={new Date().getFullYear()} />
}
