/**
 * Every email the platform sends. This list is also the checklist of SMTP2GO templates the project owner
 * creates: the template needs a variable with each name below. Replace each `templateId` with the id shown
 * in SMTP2GO. Text written by users (messages, notes, document names) is never a variable.
 */
const billingVariables = ['firstName', 'organisationName', 'planName', 'amount', 'date', 'link'] as const

export const emailTypes = {
  'auth.verify-email': { templateId: 'tpl_auth_verify_email', variables: ['firstName', 'link'] },
  'auth.reset-password': { templateId: 'tpl_auth_reset_password', variables: ['firstName', 'link'] },
  'auth.change-email': { templateId: 'tpl_auth_change_email', variables: ['firstName', 'link'] },
  'auth.staff-invite': { templateId: 'tpl_auth_staff_invite', variables: ['firstName', 'link'] },
  'message.new': { templateId: 'tpl_message_new', variables: ['firstName', 'senderName', 'link'] },
  'contact.received': { templateId: 'tpl_contact_received', variables: ['senderName', 'subject', 'message'] },
  // Every billing email has the same variables. A template uses the ones that make sense for it; the others are empty.
  'billing.subscription-started': { templateId: 'tpl_billing_subscription_started', variables: billingVariables },
  'billing.trial-started': { templateId: 'tpl_billing_trial_started', variables: billingVariables },
  'billing.receipt': { templateId: 'tpl_billing_receipt', variables: billingVariables },
  'billing.trial-ending': { templateId: 'tpl_billing_trial_ending', variables: billingVariables },
  'billing.renewal-near': { templateId: 'tpl_billing_renewal_near', variables: billingVariables },
  'billing.payment-failed': { templateId: 'tpl_billing_payment_failed', variables: billingVariables },
  'billing.payment-recovered': { templateId: 'tpl_billing_payment_recovered', variables: billingVariables },
  'billing.access-stopped': { templateId: 'tpl_billing_access_stopped', variables: billingVariables },
  'billing.cancelled': { templateId: 'tpl_billing_cancelled', variables: billingVariables },
  'billing.paused': { templateId: 'tpl_billing_paused', variables: billingVariables },
  'billing.resumed': { templateId: 'tpl_billing_resumed', variables: billingVariables },
  'billing.ended': { templateId: 'tpl_billing_ended', variables: billingVariables },
  'billing.subscribe-again': { templateId: 'tpl_billing_subscribe_again', variables: billingVariables },
  'billing.refund': { templateId: 'tpl_billing_refund', variables: billingVariables },
  'billing.plan-changed': { templateId: 'tpl_billing_plan_changed', variables: billingVariables },
  'billing.staff-payment-failed': { templateId: 'tpl_billing_staff_payment_failed', variables: billingVariables },
  'billing.staff-refund': { templateId: 'tpl_billing_staff_refund', variables: billingVariables },
} as const

export type EmailType = keyof typeof emailTypes
export type EmailVariables<T extends EmailType> = Record<(typeof emailTypes)[T]['variables'][number], string>

export function emailVariableNames(type: EmailType): readonly string[] {
  return emailTypes[type].variables
}
