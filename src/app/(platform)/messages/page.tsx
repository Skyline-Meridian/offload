import type { Metadata } from 'next'
import Link from 'next/link'

import { LoginRequired } from '@/components/gates'
import { Container } from '@/components/layout/container'
import { ConversationList } from '@/components/messaging/conversation-list'
import { MessageThread } from '@/components/messaging/message-thread'
import { OrganisationLogo } from '@/components/shared/organisation-logo'
import { UserAvatar } from '@/components/shared/user-avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/cn'
import { routes } from '@/lib/routes'
import { getThread, listConversations, normaliseTarget } from '@/server/dal/messaging'
import { getViewer } from '@/server/dal/viewer'
import { canMessage, inboxPartiesFor } from '@/server/policies/messaging'

export const metadata: Metadata = { title: 'Messages' }

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<React.JSX.Element> {
  const viewer = await getViewer()
  if (!viewer) return <LoginRequired next={routes.messages} />

  const params = await searchParams
  const parties = inboxPartiesFor(viewer)
  const box: 'personal' | 'organisation' = params.box === 'organisation' && parties.organisation ? 'organisation' : 'personal'
  const myParty = box === 'organisation' ? parties.organisation! : parties.personal
  const conversationId = typeof params.c === 'string' && /^[0-9a-f-]{36}$/i.test(params.c) ? params.c : undefined
  const target = conversationId ? null : normaliseTarget(params)

  const [list, thread] = await Promise.all([
    listConversations(viewer, box),
    conversationId || target ? getThread(viewer, { conversationId, other: target ?? undefined, myParty }) : Promise.resolve(null),
  ])
  const hasThread = thread !== null
  // A thread opened from the other box switches to it.
  const threadBox: 'personal' | 'organisation' = thread && parties.organisation && thread.myParty === parties.organisation ? 'organisation' : 'personal'

  return (
    <main>
      <Container className="flex flex-col gap-md py-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h1 className="text-h2">Messages</h1>
          {parties.organisation ? (
            <nav aria-label="Inbox" className="flex gap-sm">
              <Link href={routes.messages} className={cn('text-button', threadBox === 'personal' ? 'text-accent' : 'text-heading')} aria-current={threadBox === 'personal' ? 'page' : undefined}>
                Personal
              </Link>
              <Link href={`${routes.messages}?box=organisation`} className={cn('text-button', threadBox === 'organisation' ? 'text-accent' : 'text-heading')} aria-current={threadBox === 'organisation' ? 'page' : undefined}>
                {viewer.organisation?.name ?? 'Organisation'}
              </Link>
            </nav>
          ) : null}
        </div>
        <div className="border-thin border-border grid min-h-thread md:grid-cols-3">
          <section aria-label="Conversations" className={cn('border-border md:border-r md:col-span-1', hasThread && 'max-md:hidden')}>
            {list.conversations.length === 0 ? (
              <EmptyState title="No messages yet">Find a player or an organisation and send a message.</EmptyState>
            ) : (
              <ConversationList initial={list.conversations} initialCursor={list.nextCursor} box={threadBox} activeId={thread?.conversationId ?? null} />
            )}
          </section>
          <section aria-label="Conversation" className={cn('flex flex-col gap-sm p-sm md:col-span-2', !hasThread && 'max-md:hidden')}>
            {thread ? (
              <>
                <div className="flex items-center gap-sm">
                  <Link href={threadBox === 'organisation' ? `${routes.messages}?box=organisation` : routes.messages} className="text-link md:hidden">
                    Back
                  </Link>
                  {thread.otherParty.startsWith('O:') ? (
                    <OrganisationLogo fileId={thread.otherImageFileId} name={thread.otherName} variant="avatar" className="size-avatar-md" />
                  ) : (
                    <UserAvatar fileId={thread.otherImageFileId} name={thread.otherName} />
                  )}
                  <h2 className="text-h4">{thread.otherName}</h2>
                </div>
                <MessageThread key={`${thread.conversationId ?? 'new'}:${thread.otherParty}:${threadBox}`} thread={thread} box={threadBox} canSend={canMessage(viewer)} />
              </>
            ) : (
              <p className="text-hint">Choose a conversation.</p>
            )}
          </section>
        </div>
      </Container>
    </main>
  )
}
