import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ImpressiveWelcomeStep } from '../components/onboarding/ImpressiveWelcomeStep'
import { InteractiveFeatureStep } from '../components/onboarding/InteractiveFeatureStep'
import { ModernApiKeyStep } from '../components/onboarding/ModernApiKeyStep'
import { CompletionStep } from '../components/onboarding/CompletionStep'
import '../styles/globals.css'

const TOTAL_STEPS = 4

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1)

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS))
  const handlePrevious = () => setCurrentStep(prev => Math.max(prev - 1, 1))

  return (
    <div className="min-h-screen font-sans text-foreground">
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentStep} 
          className="w-full"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {currentStep === 1 && <ImpressiveWelcomeStep onNext={handleNext} />}
          {currentStep === 2 && <InteractiveFeatureStep onNext={handleNext} onPrevious={handlePrevious} />}
          {currentStep === 3 && <ModernApiKeyStep onNext={handleNext} onPrevious={handlePrevious} />}
          {currentStep === 4 && <CompletionStep onNext={handleNext} onPrevious={handlePrevious} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
