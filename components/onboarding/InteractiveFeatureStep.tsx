import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  PlayCircle, 
  Brain, 
  MessageSquare, 
  BarChart3, 
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  Headphones,
  FileText,
  Lightbulb,
  Target,
  Repeat
} from 'lucide-react'
import { Button } from '../ui/button'

interface InteractiveFeatureStepProps {
  onNext: () => void
  onPrevious: () => void
}

const FeatureDemo = ({ 
  icon: Icon, 
  title, 
  description, 
  demoSteps, 
  isActive,
  onActivate 
}) => {
  const [currentDemo, setCurrentDemo] = useState(0)

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setCurrentDemo(prev => (prev + 1) % demoSteps.length)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [isActive, demoSteps.length])

  return (
    <motion.div
      layout
      className={`relative cursor-pointer transition-all duration-500 ${
        isActive 
          ? 'col-span-2 row-span-2' 
          : 'col-span-1 row-span-1 hover:scale-105'
      }`}
      onClick={onActivate}
      whileHover={!isActive ? { scale: 1.02 } : {}}
    >
      <motion.div
        className={`relative h-full bg-gradient-to-br ${
          isActive 
            ? 'from-primary/20 to-primary/5 shadow-2xl' 
            : 'from-white/10 to-white/5 hover:from-white/15 hover:to-white/10'
        } backdrop-blur-sm rounded-2xl p-6 border border-white/20 overflow-hidden`}
        layout
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-transparent" />
        </div>

        <div className="relative z-10 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              className={`p-3 rounded-xl ${
                isActive ? 'bg-primary/30' : 'bg-white/10'
              }`}
              animate={isActive ? { rotate: [0, 5, -5, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Icon className={`h-6 w-6 ${isActive ? 'text-primary' : 'text-white'}`} />
            </motion.div>
            <h3 className={`font-bold ${
              isActive ? 'text-2xl text-white' : 'text-lg text-white/90'
            }`}>
              {title}
            </h3>
          </div>

          <p className={`text-gray-100 mb-6 ${
            isActive ? 'text-lg leading-relaxed' : 'text-sm'
          }`}>
            {description}
          </p>

          {isActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex-1 flex flex-col justify-center"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentDemo}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white/10 rounded-xl p-4 border border-white/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">
                      Step {currentDemo + 1}
                    </span>
                  </div>
                  <p className="text-white font-medium">
                    {demoSteps[currentDemo]}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="flex gap-2 mt-4">
                {demoSteps.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentDemo 
                        ? 'bg-primary flex-1' 
                        : 'bg-white/20 w-2'
                    }`}
                    layout
                  />
                ))}
              </div>
            </motion.div>
          )}

          {!isActive && (
            <div className="mt-auto">
              <div className="flex items-center text-sm text-primary">
                <Eye className="h-4 w-4 mr-1" />
                Click to explore
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export function InteractiveFeatureStep({ onNext, onPrevious }: InteractiveFeatureStepProps) {
  const [activeFeature, setActiveFeature] = useState(0)

  const features = [
    {
      icon: PlayCircle,
      title: "Smart Video Loops",
      description: "Create perfect practice segments with AI-powered precision and automatic loop detection.",
      demoSteps: [
        "🎯 Select any YouTube video you want to practice with",
        "🤖 AI analyzes and suggests optimal loop segments",
        "⏰ Fine-tune start/end times with precision controls",
        "🔄 Perfect loops ready for intensive practice"
      ]
    },
    {
      icon: Brain,
      title: "AI Conversations",
      description: "Generate intelligent questions and engage in meaningful conversations based on video content.",
      demoSteps: [
        "📝 AI extracts transcript from your video segment",
        "🧠 Generates contextually relevant questions", 
        "💬 Practice conversations with AI feedback",
        "📊 Track your progress and improvement areas"
      ]
    },
    {
      icon: FileText,
      title: "Transcript Analysis", 
      description: "Automatically extract and analyze transcripts for deeper content comprehension.",
      demoSteps: [
        "📹 Access video content from any YouTube URL",
        "🔍 Extract accurate transcripts automatically",
        "📖 Highlight key phrases and vocabulary",
        "💡 Generate summaries and insights"
      ]
    },
    {
      icon: BarChart3,
      title: "Learning Analytics",
      description: "Comprehensive tracking and insights to optimize your learning journey.",
      demoSteps: [
        "📈 Monitor practice sessions and time spent",
        "🎯 Track accuracy and improvement over time", 
        "📊 Visualize learning patterns and trends",
        "🔄 Get personalized recommendations"
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.div
            className="flex items-center justify-center gap-3 mb-6"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Lightbulb className="h-12 w-12 text-yellow-400" />
            <h1 className="text-4xl md:text-6xl font-black text-white">
              Powerful Features
            </h1>
          </motion.div>
          <p className="text-xl text-gray-100 max-w-3xl mx-auto">
            Discover how FluentFlow transforms your learning experience with cutting-edge AI technology
          </p>
        </motion.div>

        {/* Interactive Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="grid grid-cols-3 grid-rows-2 gap-6 h-[600px] mb-12"
        >
          {features.map((feature, index) => (
            <FeatureDemo
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              demoSteps={feature.demoSteps}
              isActive={activeFeature === index}
              onActivate={() => setActiveFeature(index)}
            />
          ))}
        </motion.div>

        {/* Feature Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          {[
            { icon: Target, label: "Precision Learning", desc: "Micro-targeted practice sessions" },
            { icon: Headphones, label: "Audio Integration", desc: "Seamless audio-visual learning" },
            { icon: Repeat, label: "Adaptive Loops", desc: "Smart repetition algorithms" }
          ].map((highlight, index) => (
            <motion.div
              key={highlight.label}
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center"
            >
              <highlight.icon className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-white mb-2">{highlight.label}</h3>
              <p className="text-gray-200 text-sm">{highlight.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex justify-between items-center"
        >
          <Button
            variant="outline"
            onClick={onPrevious}
            className="group bg-white/10 border-white/20 hover:bg-white/20 text-white"
          >
            <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            Back
          </Button>

          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Step 2 of 5</p>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={`w-2 h-2 rounded-full ${
                    step <= 2 ? 'bg-primary' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>

          <Button
            onClick={onNext}
            className="group bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
          >
            Create Account
            <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
          </Button>
        </motion.div>
      </div>
    </div>
  )
}