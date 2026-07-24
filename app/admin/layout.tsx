import { requireAdminPage } from '@/lib/admin-auth'

/**
 * Gate ADMIN para /admin/* (users, import, settings, edit productos, etc.).
 */
export default async function AdminSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminPage()
  return children
}
