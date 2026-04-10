import PlannerBottomNav from '@/components/PlannerBottomNav'

interface Props {
  children: React.ReactNode
  params: Promise<{ plannerId: string }>
}

export default async function PlannerLayout({ children, params }: Props) {
  const { plannerId } = await params
  return (
    <>
      {/* Bottom padding on mobile so content clears the nav bar */}
      <div className="pb-16 md:pb-0">{children}</div>
      <PlannerBottomNav plannerId={plannerId} />
    </>
  )
}
