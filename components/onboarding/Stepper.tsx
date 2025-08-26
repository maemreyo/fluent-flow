import { motion } from 'framer-motion'

interface StepperProps {
  currentStep: number
  totalSteps: number
}

export function Stepper({ currentStep, totalSteps }: StepperProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1)

  return (
    <div className="flex items-center justify-center gap-4 mb-8">
      {steps.map(step => (
        <div key={step} className="flex items-center gap-4">
          <motion.div
            className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-lg"
            animate={{
              backgroundColor:
                step <= currentStep ? 'hsl(var(--primary))' : 'hsl(var(--card) / 0.5)',
              borderColor: step <= currentStep ? 'hsl(var(--primary))' : 'hsl(var(--border))',
              color: step <= currentStep ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))'
            }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}>
            {step}
          </motion.div>
          {step < totalSteps && (
            <div className="relative h-1 w-16 bg-border/50 rounded-full overflow-hidden">
              <motion.div
                className="absolute left-0 top-0 h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: step < currentStep ? '100%' : '0%'
                }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}