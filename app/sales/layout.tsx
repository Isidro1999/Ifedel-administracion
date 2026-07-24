import { requireApprovedPage } from '@/lib/session-auth'

export default async function SalesSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireApprovedPage()
  return children
}
