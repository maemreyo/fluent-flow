import React, { useEffect, useState } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { 
  PlayCircle, 
  Brain, 
  Sparkles, 
  ArrowRight,
  Youtube,
  Zap,
  Target,
  BookOpen
} from 'lucide-react'
import { Button } from '../ui/button'

interface ImpressiveWelcomeStepProps {
  onNext: () => void
}

const FloatingIcon = ({ 
  icon: Icon, 
  delay = 0, 
  duration = 3,
  className = ""
}) => {
  const controls = useAnimation()

  useEffect(() => {
    controls.start({
      y: [0, -20, 0],
      rotate: [0, 5, -5, 0],
      transition: {
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut"
      }
    })
  }, [controls, delay, duration])

  return (
    <motion.div
      animate={controls}
      className={`absolute opacity-20 ${className}`}
    >
      <Icon className="h-12 w-12 text-primary" />
    </motion.div>
  )
}

const FeatureHighlight = ({ 
  icon: Icon, 
  title, 
  description, 
  delay = 0 
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ 
      duration: 0.6, 
      delay,
      type: "spring",
      stiffness: 100
    }}
    whileHover={{ 
      scale: 1.05,
      rotateY: 5,
      transition: { duration: 0.2 }
    }}
    className="relative group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300"
  >
    {/* Glow effect */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    
    <div className="relative z-10 flex flex-col items-center text-center space-y-3">
      <motion.div
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.5 }}
        className="p-3 bg-primary/20 rounded-full"
      >
        <Icon className="h-8 w-8 text-primary" />
      </motion.div>
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="text-sm text-gray-100 leading-relaxed">{description}</p>
    </div>
  </motion.div>
)

export function ImpressiveWelcomeStep({ onNext }: ImpressiveWelcomeStepProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const features = [
    {
      icon: Youtube,
      title: "Smart Video Loops",
      description: "Create perfect practice segments from any YouTube video with AI-powered timestamps"
    },
    {
      icon: Brain,
      title: "AI Conversations", 
      description: "Generate intelligent questions and practice conversations based on video content"
    },
    {
      icon: Target,
      title: "Transcript Analysis",
      description: "Extract and analyze transcripts automatically for deeper comprehension"
    },
    {
      icon: BookOpen,
      title: "Learning Analytics",
      description: "Track your progress and optimize your learning journey with detailed insights"
    }
  ]

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <FloatingIcon icon={PlayCircle} delay={0} className="top-10 left-10" />
        <FloatingIcon icon={Sparkles} delay={1} duration={4} className="top-20 right-20" />
        <FloatingIcon icon={Brain} delay={2} duration={3.5} className="bottom-20 left-16" />
        <FloatingIcon icon={Zap} delay={0.5} duration={2.5} className="bottom-16 right-12" />
        
        {/* Gradient Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-12 min-h-screen flex flex-col justify-center">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -50 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <motion.h1 
            className="text-6xl md:text-8xl font-black mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ 
              duration: 1,
              type: "spring",
              stiffness: 100
            }}
          >
            FluentFlow
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="space-y-4"
          >
            <p className="text-2xl md:text-3xl font-semibold text-white/90">
              Master Interactive Video Learning
            </p>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Transform any YouTube video into an interactive learning experience with 
              AI-powered conversations, smart loops, and comprehensive analytics
            </p>
          </motion.div>

          {/* Animated Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex justify-center gap-12 mt-12"
          >
            {[
              { number: "∞", label: "Videos" },
              { number: "AI", label: "Powered" }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                whileHover={{ scale: 1.1 }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-primary">{stat.number}</div>
                <div className="text-sm text-gray-300">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {features.map((feature, index) => (
            <FeatureHighlight
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={1.4 + index * 0.1}
            />
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.8 }}
          className="text-center"
        >
          <Button
            onClick={onNext}
            size="lg"
            className="group relative px-12 py-6 text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <span className="relative z-10 flex items-center gap-3">
              Begin Your Journey
              <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" />
            </span>
            
            {/* Button glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 blur opacity-75 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
          </Button>

          <p className="mt-6 text-gray-400 text-lg">
            Ready in just <span className="text-primary font-semibold">2 minutes</span> ⚡
          </p>
        </motion.div>
      </div>

      {/* Subtle particles effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, -100, window.innerHeight + 100],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 10,
            }}
          />
        ))}
      </div>
    </div>
  )
}