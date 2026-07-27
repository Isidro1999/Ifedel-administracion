import { requireApprovedPage } from '@/lib/session-auth'

export default async function AnalyticsSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireApprovedPage()
  return children
}
