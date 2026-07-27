import { requireApprovedPage } from '@/lib/session-auth'

export default async function CashSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireApprovedPage()
  return children
}
