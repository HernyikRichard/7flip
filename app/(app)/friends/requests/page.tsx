'use client'

import { useFriends } from '@/hooks/useFriends'
import { useToast } from '@/hooks/useToast'
import TopBar from '@/components/layout/TopBar'
import FriendRequestList from '@/components/friends/FriendRequestList'
import Spinner from '@/components/ui/Spinner'
import { ROUTES } from '@/lib/constants'

export default function FriendRequestsPage() {
  const { incoming, outgoing, loading, acceptRequest, rejectRequest, cancelRequest } = useFriends()
  const { toast } = useToast()

  async function handleAccept(id: string) {
    await acceptRequest(id)
    toast('Barátkérés elfogadva! 🎉', 'success')
  }

  async function handleReject(id: string) {
    await rejectRequest(id)
    toast('Barátkérés elutasítva.', 'info')
  }

  async function handleCancel(id: string) {
    await cancelRequest(id)
    toast('Kérés visszavonva.', 'info')
  }

  return (
    <>
      <TopBar title="Barátkérések" showBack backHref={ROUTES.FRIENDS} />

      <div className="px-4 py-5 flex flex-col gap-5 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">
                Bejövő kérések
                {incoming.length > 0 && (
                  <span className="ml-2 text-primary-500">{incoming.length}</span>
                )}
              </p>
              {incoming.length === 0 ? (
                <p className="text-sm text-muted-foreground px-0.5">Nincs bejövő kérésed.</p>
              ) : (
                <FriendRequestList requests={incoming} type="incoming" onAccept={handleAccept} onReject={handleReject} />
              )}
            </section>

            <section className="flex flex-col gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">
                Elküldött kérések
                {outgoing.length > 0 && (
                  <span className="ml-2 text-muted-foreground">{outgoing.length}</span>
                )}
              </p>
              {outgoing.length === 0 ? (
                <p className="text-sm text-muted-foreground px-0.5">Nincs folyamatban lévő kérésed.</p>
              ) : (
                <FriendRequestList requests={outgoing} type="outgoing" onCancel={handleCancel} />
              )}
            </section>
          </>
        )}
      </div>
    </>
  )
}
