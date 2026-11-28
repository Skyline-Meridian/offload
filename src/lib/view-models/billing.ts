import type { OrgTypeKey } from '@/lib/constants'

export type PlanCardData = {
  id: string
  name: string
  organisationType: OrgTypeKey
  interval: 'MONTH' | 'YEAR'
  amountPence: number
}

export type ShownStatus = 'Trial' | 'Active' | 'Cancelled' | 'Past due' | 'Paused' | 'Ended'

export type SubscriptionPageData = {
  kind: 'PAID' | 'TRIAL'
  shownStatus: ShownStatus
  planName: string
  interval: 'MONTH' | 'YEAR'
  amountPence: number | null
  startedAt: Date
  currentPeriodEnd: Date | null
  isCancelledAtPeriodEnd: boolean
  scheduledPlan: { id: string; name: string; amountPence: number } | null
  switchTarget: { id: string; name: string; amountPence: number } | null
  purchasedBy: string
  pastDueSince: Date | null
}

export type BillingDetails = {
  billingName: string | null
  company: string | null
  email: string | null
  phone: string | null
  address: string | null
  card: string | null
}

export type PaymentRow = {
  id: string
  invoiceNumber: string | null
  status: 'PAID' | 'FAILED' | 'OPEN' | 'VOID'
  amountPence: number
  discountPence: number
  amountRefundedPence: number
  periodStart: Date
  periodEnd: Date
  paidAt: Date | null
  createdAt: Date
}
