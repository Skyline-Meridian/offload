export type ConversationRow = {
  id: string
  /** The viewer's own channel in this conversation ("U:…" or "O:…"). */
  myParty: string
  otherParty: string
  otherName: string
  otherImageFileId: string | null
  otherKind: 'U' | 'O'
  preview: string
  lastMessageAt: Date
  unread: boolean
}

export type MessageRow = {
  id: string
  conversationId: string
  body: string
  createdAt: Date
  /** True when the viewer wrote it, or a manager of the viewer's organisation did. */
  mine: boolean
  senderName: string
}

export type ThreadData = {
  conversationId: string | null
  otherName: string
  otherImageFileId: string | null
  otherParty: string
  myParty: string
  messages: MessageRow[]
  hasEarlier: boolean
}

export type NotificationRow = {
  id: string
  type: string
  label: string
  subjectName: string | null
  linkPath: string | null
  createdAt: Date
  isRead: boolean
}
