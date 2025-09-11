'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { 
  LogOut, 
  User, 
  Settings, 
  HelpCircle, 
  BookOpen,
  Users,
  RotateCcw,
  Menu,
  X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { UserAvatar } from '../ui/user-avatar'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

interface MasterHeaderProps {
  showNavigation?: boolean
}

export function MasterHeader({ showNavigation = true }: MasterHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, isAuthenticated, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const navigationItems = [
    { href: '/loops', label: 'Loops', icon: RotateCcw },
    { href: '/groups', label: 'Groups', icon: Users },
    { href: '/questions', label: 'Practice', icon: BookOpen },
  ]

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const handleProfile = () => {
    // Navigate to profile page when implemented
    console.log('Navigate to profile')
  }

  const handleSettings = () => {
    // Navigate to settings page when implemented  
    console.log('Navigate to settings')
  }

  const handleHelp = () => {
    // Navigate to help page when implemented
    console.log('Navigate to help')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/20 bg-white/80 backdrop-blur-xl">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg transition-transform group-hover:scale-105">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Fluent Flow
                </h1>
                <p className="text-xs text-gray-500">Language Learning</p>
              </div>
            </Link>

            {/* Navigation - Desktop */}
            {showNavigation && isAuthenticated && (
              <nav className="hidden md:flex items-center gap-1 ml-8">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                          : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                {/* Mobile Menu Button */}
                {showNavigation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  >
                    {isMobileMenuOpen ? (
                      <X className="h-5 w-5" />
                    ) : (
                      <Menu className="h-5 w-5" />
                    )}
                  </Button>
                )}

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-3 h-auto px-3 py-2 rounded-xl hover:bg-indigo-50"
                    >
                      <UserAvatar 
                        email={user?.email}
                        username={user?.user_metadata?.username}
                        imageUrl={user?.user_metadata?.avatar_url}
                        size="md"
                      />
                      <div className="hidden sm:block text-left">
                        <div className="text-sm font-medium text-gray-900">
                          {user?.user_metadata?.username || user?.email?.split('@')[0] || 'User'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user?.email}
                        </div>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleProfile}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSettings}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleHelp}>
                      <HelpCircle className="mr-2 h-4 w-4" />
                      Help & Support
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleSignOut}
                      className="text-red-600 focus:text-red-700 focus:bg-red-50"
                    >
                      <LogOut className="mr-2 h-4 w-4 text-red-600 focus:text-red-700" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/auth/signup">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {showNavigation && isAuthenticated && isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/20 py-4">
            <nav className="flex flex-col gap-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                        : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}