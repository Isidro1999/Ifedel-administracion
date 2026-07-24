import { requireApprovedPage } from '@/lib/session-auth'

export default async function PurchasesSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireApprovedPage()
  return children
}
