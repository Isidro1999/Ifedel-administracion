import { requireApprovedPage } from '@/lib/session-auth'

export default async function QuotesSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireApprovedPage()
  return children
}
