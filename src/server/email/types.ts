/**
 * Every email the platform sends. This list is also the checklist of SMTP2GO templates the project owner
 * creates: the template needs a variable with each name below. Replace each `templateId` with the id shown
 * in SMTP2GO. Text written by users (messages, notes, document names) is never a variable.
 */
export const emailTypes = {
  'auth.verify-email': { templateId: 'tpl_auth_verify_email', variables: ['firstName', 'link'] },
  'auth.reset-password': { templateId: 'tpl_auth_reset_password', variables: ['firstName', 'link'] },
  'auth.change-email': { templateId: 'tpl_auth_change_email', variables: ['firstName', 'link'] },
  'auth.staff-invite': { templateId: 'tpl_auth_staff_invite', variables: ['firstName', 'link'] },
  'message.new': { templateId: 'tpl_message_new', variables: ['firstName', 'senderName', 'link'] },
  'contact.received': { templateId: 'tpl_contact_received', variables: ['senderName', 'subject', 'message'] },
} as const

export type EmailType = keyof typeof emailTypes
export type EmailVariables<T extends EmailType> = Record<(typeof emailTypes)[T]['variables'][number], string>

export function emailVariableNames(type: EmailType): readonly string[] {
  return emailTypes[type].variables
}
