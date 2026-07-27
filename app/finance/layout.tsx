import { requireApprovedPage } from '@/lib/session-auth'

export default async function FinanceSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireApprovedPage()
  return children
}
