'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Users, Vote, Settings } from 'lucide-react'

interface Props {
  plannerId: string
}

export default function PlannerBottomNav({ plannerId }: Props) {
  const pathname = usePathname()

  const base = `/planners/${plannerId}`

  const tabs = [
    {
      href: base,
      label: 'Calendar',
      icon: CalendarDays,
      active: pathname === base,
    },
    {
      href: `${base}/polls`,
      label: 'Polls',
      icon: Vote,
      active: pathname.startsWith(`${base}/polls`),
    },
    {
      href: `${base}/members`,
      label: 'Members',
      icon: Users,
      active: pathname.startsWith(`${base}/members`),
    },
    {
      href: `${base}/settings`,
      label: 'Settings',
      icon: Settings,
      active: pathname.startsWith(`${base}/settings`),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-white/95 backdrop-blur-sm md:hidden">
      <div className="flex h-16 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                tab.active ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <Icon
                className={`h-5 w-5 ${tab.active ? 'stroke-[2.25]' : 'stroke-[1.75]'}`}
              />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
