import { PartyPopper } from 'lucide-react'
import { Button } from '../ui/button'
import { OnboardingLayout } from './OnboardingLayout'
import { motion } from 'framer-motion'

interface WelcomeStepProps {
  onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <OnboardingLayout
      title={
        <motion.div
          className="flex items-center gap-3"
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}>
          <PartyPopper className="h-8 w-8 text-primary" />
          Welcome to FluentFlow!
        </motion.div>
      }
      description="Your new AI-powered companion for a revolutionary learning experience.">
      <div className="text-center space-y-6">
        <p className="text-muted-foreground">
          Get ready to understand content deeper, learn faster, and engage with information like
          never before.
        </p>
        <Button onClick={onNext} size="lg" className="w-full">
          Get Started
        </Button>
      </div>
    </OnboardingLayout>
  )
}