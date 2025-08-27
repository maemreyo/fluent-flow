import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  CheckCircle, 
  Sparkles, 
  ArrowRight,
  Trophy,
  Rocket,
  Star,
  Zap,
  Crown,
  Gift,
  Pin
} from 'lucide-react'
import { Button } from '../ui/button'

interface CompletionStepProps {
  onNext?: () => void
  onPrevious?: () => void
}

const SuccessAnimation = () => {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    setShowConfetti(true)
  }, [])

  return (
    <div className="relative">
      {/* Main Success Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          duration: 1, 
          type: "spring", 
          stiffness: 100,
          delay: 0.2 
        }}
        className="mx-auto w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-2xl"
      >
        <CheckCircle className="h-16 w-16 text-white" />
      </motion.div>

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][i % 6],
                left: `${20 + (i % 4) * 20}%`,
                top: '50%'
              }}
              initial={{ 
                y: 0, 
                x: 0, 
                opacity: 1, 
                scale: 0 
              }}
              animate={{ 
                y: [-100, -200],
                x: [(i % 2 === 0 ? -1 : 1) * Math.random() * 100],
                opacity: [1, 0],
                scale: [0, 1, 0],
                rotate: [0, 360]
              }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      )}

      {/* Success Rings */}
      {[1, 2, 3].map((ring, index) => (
        <motion.div
          key={ring}
          className="absolute inset-0 border-2 border-green-400/30 rounded-full"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.5 + index * 0.3, opacity: 0 }}
          transition={{
            duration: 2,
            delay: 0.5 + index * 0.2,
            ease: "easeOut"
          }}
          style={{
            width: `${8 + index * 2}rem`,
            height: `${8 + index * 2}rem`,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}
    </div>
  )
}

const Feature = ({ icon: Icon, title, description, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6 }}
    className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10"
  >
    <div className="p-2 bg-gradient-to-br from-primary/30 to-primary/10 rounded-lg">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-100">{description}</p>
    </div>
  </motion.div>
)

export function CompletionStep({ onNext, onPrevious }: CompletionStepProps = {}) {
  const handleFinish = () => {
    window.open('https://www.youtube.com', '_blank')
    window.close()
  }

  const readyFeatures = [
    {
      icon: Zap,
      title: "AI-Powered Analysis",
      description: "Your Gemini API key is ready for intelligent video processing"
    },
    {
      icon: Rocket,
      title: "Smart Video Loops",
      description: "Create perfect practice segments from any YouTube content"
    },
    {
      icon: Star,
      title: "Interactive Conversations",
      description: "Generate questions and engage with video content"
    },
    {
      icon: Crown,
      title: "Learning Analytics",
      description: "Track your progress and optimize your learning journey"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-green-900 p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header with Success Animation */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <SuccessAnimation />
          
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="text-4xl md:text-6xl font-black text-white mb-4"
          >
            🎉 All Set!
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="text-xl text-gray-100 max-w-2xl mx-auto"
          >
            FluentFlow is now configured and ready to supercharge your learning experience!
          </motion.p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Features Ready */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Gift className="h-6 w-6 text-green-400" />
              Ready to Use
            </h2>
            
            <div className="space-y-4">
              {readyFeatures.map((feature, index) => (
                <Feature
                  key={feature.title}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  delay={1.6 + index * 0.1}
                />
              ))}
            </div>
          </motion.div>

          {/* Quick Start Guide */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.6, duration: 0.8 }}
            className="space-y-6"
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                <Trophy className="h-5 w-5 text-yellow-400" />
                Quick Start
              </h3>
              
              <div className="space-y-4 text-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white mt-0.5">
                    1
                  </div>
                  <p className="text-sm">Navigate to any YouTube video you want to learn from</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white mt-0.5">
                    2
                  </div>
                  <p className="text-sm">Click the FluentFlow extension icon in your toolbar</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white mt-0.5">
                    3
                  </div>
                  <p className="text-sm">Start creating loops and generating AI conversations!</p>
                </div>
              </div>
            </div>

            {/* Pin Extension Guide */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-3">
                <Pin className="h-5 w-5 text-blue-400" />
                Pin the Extension
              </h3>
              <p className="text-sm text-gray-100">
                For easy access, pin the FluentFlow icon to your browser's toolbar.
              </p>
            </div>

            {/* Pro Tips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 0.8 }}
              className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <span className="font-semibold text-blue-400">Pro Tip</span>
              </div>
              <p className="text-sm text-gray-100">
                Your API key is stored securely in your browser. You can manage it anytime 
                in the extension settings.
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2 }}
          className="flex justify-between items-center mt-12"
        >
          {onPrevious ? (
            <Button
              variant="outline"
              onClick={onPrevious}
              className="group bg-white/10 border-white/20 hover:bg-white/20 text-white"
            >
              <ArrowRight className="h-5 w-5 mr-2 rotate-180 group-hover:-translate-x-1 transition-transform duration-300" />
              Back
            </Button>
          ) : <div />}

          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Setup Complete!</p>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4].map((step) => (
                <CheckCircle
                  key={step}
                  className="w-3 h-3 text-green-400"
                />
              ))}
            </div>
          </div>

          <Button
            onClick={onNext || handleFinish}
            className="group bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
          >
            Start Learning
            <Rocket className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
