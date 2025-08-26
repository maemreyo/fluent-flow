import { LogIn, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { AuthComponent } from '../auth-component'
import { Button } from '../ui/button'
import { OnboardingLayout } from './OnboardingLayout'

interface LoginStepProps {
  onNext: () => void
  onPrevious: () => void
}

export function LoginStep({ onNext, onPrevious }: LoginStepProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleAuthSuccess = () => {
    setIsLoggedIn(true)
  }

  return (
    <OnboardingLayout
      title={
        isLoggedIn ? (
          <>
            <UserCheck className="h-7 w-7 text-green-500" />
            You're Logged In!
          </>
        ) : (
          <>
            <LogIn className="h-7 w-7" />
            Sync Your Progress
          </>
        )
      }
      description={
        isLoggedIn
          ? 'Your learning journey will now be saved to your account.'
          : 'Create an account or log in to sync your data across devices. (Optional)'
      }>
      <div className="space-y-6">
        {!isLoggedIn && <AuthComponent onAuthSuccess={handleAuthSuccess} />}

        <div className="flex justify-between gap-4">
          <Button variant="outline" onClick={onPrevious}>
            Back
          </Button>
          <Button onClick={onNext} className="w-full">
            {isLoggedIn ? 'Finish Setup' : 'Skip and Finish'}
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  )
}
