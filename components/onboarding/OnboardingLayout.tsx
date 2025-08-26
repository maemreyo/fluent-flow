import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

interface OnboardingLayoutProps {
  title: string | ReactNode
  description: string | ReactNode
  children: ReactNode
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}

export function OnboardingLayout({ title, description, children }: OnboardingLayoutProps) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="w-full">
      <Card className="w-full max-w-lg mx-auto glassmorphic-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  )
}
