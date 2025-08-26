import { motion } from 'framer-motion'
import { BrainCircuit, CircleQuestionMark, Sparkles, Zap } from 'lucide-react'
import { Button } from '../ui/button'
import { OnboardingLayout } from './OnboardingLayout'

interface FeatureShowcaseStepProps {
  onNext: () => void
  onPrevious: () => void
}

export function FeatureShowcaseStep({ onNext, onPrevious }: FeatureShowcaseStepProps) {
  const features = [
    {
      icon: <Sparkles className="h-6 w-6 text-primary" />,
      title: 'AI-Powered Insights',
      description: 'Get summaries, key points, and explanations for any video content.'
    },
    {
      icon: <CircleQuestionMark className="h-6 w-6 text-primary" />,
      title: 'Interactive Q&A',
      description: 'Ask questions and get instant, context-aware answers from the video.'
    },
    {
      icon: <BrainCircuit className="h-6 w-6 text-primary" />,
      title: 'Active Learning',
      description: 'Generate quizzes and flashcards to solidify your knowledge.'
    }
  ]

  return (
    <OnboardingLayout
      title={
        <>
          <Zap className="h-7 w-7 text-yellow-400" />
          Unlock Superpowers
        </>
      }
      description="To enable these features, we'll need you to provide your own Gemini API key."
    >
      <div className="space-y-6">
        <div className="space-y-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="flex items-start gap-4 rounded-lg bg-muted/50 p-3 transition-all duration-300 hover:scale-105 hover:bg-muted/80 hover:shadow-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}
            >
              <div className="mt-1 flex-shrink-0">{feature.icon}</div>
              <div>
                <h4 className="font-semibold">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex justify-between gap-4">
          <Button variant="outline" onClick={onPrevious}>
            Back
          </Button>
          <Button onClick={onNext} className="w-full">
            Next: Add API Key
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  )
}
