import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/constants'

// A root oldal mindig redirectel — auth check a /dashboard layout-ban lesz
export default function RootPage() {
  redirect(ROUTES.DASHBOARD)
}
