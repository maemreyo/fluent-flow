'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-3">
      <div className="flex items-center justify-center p-6 sm:p-12 lg:col-span-1">
        {children}
      </div>
      <div className="relative hidden lg:col-span-2 lg:block">
        <motion.div
          className="absolute inset-0 z-0"
          style={{
            background: 'linear-gradient(120deg, #a1c4fd, #c2e9fb)',
          }}
          animate={{
            background: [
              'linear-gradient(120deg, #a1c4fd, #c2e9fb)',
              'linear-gradient(120deg, #ffecd2, #fcb69f)',
              'linear-gradient(120deg, #d4fc79, #96e6a1)',
              'linear-gradient(120deg, #a1c4fd, #c2e9fb)',
            ],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />
      </div>
    </div>
  )
}
