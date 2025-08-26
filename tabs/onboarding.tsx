import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ApiKeyStep,
  CompletionStep,
  FeatureShowcaseStep,
  LoginStep,
  Stepper,
  WelcomeStep
} from '../components/onboarding'
import '../styles/globals.css'

const TOTAL_STEPS = 5

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1)

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS))
  const handlePrevious = () => setCurrentStep(prev => Math.max(prev - 1, 1))

  return (
    <div className="animated-gradient-background min-h-screen font-sans text-foreground">
      <motion.div
        className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}>
        <Stepper currentStep={currentStep} totalSteps={TOTAL_STEPS} />
        <AnimatePresence mode="wait">
          <div key={currentStep} className="w-full">
            {currentStep === 1 && <WelcomeStep onNext={handleNext} />}
            {currentStep === 2 && <LoginStep onNext={handleNext} onPrevious={handlePrevious} />}
            {currentStep === 3 && (
              <FeatureShowcaseStep onNext={handleNext} onPrevious={handlePrevious} />
            )}
            {currentStep === 4 && <ApiKeyStep onNext={handleNext} onPrevious={handlePrevious} />}
            {currentStep === 5 && <CompletionStep />}
          </div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
