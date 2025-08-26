import { useWindowSize } from '@uidotdev/usehooks'
import { ArrowRight, Pin, Rocket } from 'lucide-react'
import Confetti from 'react-confetti'
import { Button } from '../ui/button'
import { OnboardingLayout } from './OnboardingLayout'

export function CompletionStep() {
  const { width, height } = useWindowSize()

  const handleFinish = () => {
    window.open('https://www.youtube.com', '_blank')
    window.close()
  }

  return (
    <>
      {width && height && (
        <Confetti width={width} height={height} recycle={false} numberOfPieces={400} />
      )}
      <OnboardingLayout
        title={
          <>
            <Rocket className="h-8 w-8 text-primary" />
            You're All Set!
          </>
        }
        description="FluentFlow is ready to revolutionize your learning experience."
      >
        <div className="space-y-8 text-center">
          <div className="space-y-4 rounded-lg bg-muted/50 p-4">
            <h3 className="flex items-center justify-center gap-2 text-lg font-semibold">
              <Pin className="h-5 w-5" />
              Pin the Extension
            </h3>
            <p className="text-muted-foreground">
              For easy access, pin the FluentFlow icon to your browser's toolbar.
            </p>
            {/* <img
              src="https://developer.chrome.com/static/images/get-started/pin-extension-dark.png"
              alt="How to pin an extension"
              className="w-full max-w-sm mx-auto rounded-md border"
            /> */}
          </div>

          <Button onClick={handleFinish} size="lg" className="group w-full">
            Start Learning on YouTube
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </OnboardingLayout>
    </>
  )
}
