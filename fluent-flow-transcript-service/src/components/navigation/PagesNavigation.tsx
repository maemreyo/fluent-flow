'use client'

import { Play, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function PagesNavigation() {
  const pathname = usePathname()

  const isGroupsActive = pathname.startsWith('/groups')
  const isLoopsActive = pathname.startsWith('/loops')

  return (
    <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2">
      <div className="flex rounded-2xl border border-white/20 bg-white/90 p-1 shadow-xl backdrop-blur-sm">
        <Link
          href="/loops"
          className={`flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all duration-300 ${
            isLoopsActive
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-white/60 hover:text-indigo-600'
          }`}
        >
          <Play className="h-5 w-5" />
          My Loops
        </Link>
        <Link
          href="/groups"
          className={`flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all duration-300 ${
            isGroupsActive
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-white/60 hover:text-indigo-600'
          }`}
        >
          <Users className="h-5 w-5" />
          Study Groups
        </Link>
      </div>
    </div>
  )
}
