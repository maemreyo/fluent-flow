import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { Button } from '../ui/button'

const STORAGE_KEY = 'fluent-flow-hide-get-started'

export const GetStartedSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user has previously hidden this section
    const hideGetStarted = localStorage.getItem(STORAGE_KEY)
    if (hideGetStarted === 'true') {
      setIsVisible(false)
    }
    setIsLoading(false)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsVisible(false)
  }

  // Don't render anything while loading
  if (isLoading) {
    return null
  }

  // Don't render if dismissed
  if (!isVisible) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div 
        className="mt-12 overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-blue-600 to-emerald-600 shadow-2xl relative"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {/* Dismiss Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-20 text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl transition-all duration-300"
          title="I got it, don't show this again"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="relative p-12 text-center">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }} />
          </div>
          
          <div className="relative z-10">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Sparkles className="mx-auto mb-6 h-16 w-16 text-white animate-pulse" />
              <h3 className="mb-4 text-3xl font-bold text-white">
                Ready to Start Your Learning Adventure? ✨
              </h3>
              <p className="mb-8 text-lg text-white/90 max-w-3xl mx-auto leading-relaxed">
                Transform your YouTube watching into powerful vocabulary learning sessions with 
                AI-powered analysis and spaced repetition.
              </p>
            </motion.div>
            
            <motion.div 
              className="flex flex-col items-center justify-center space-y-6 lg:flex-row lg:space-x-8 lg:space-y-0 mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              {[
                { step: "1", text: "Watch videos with FluentFlow", icon: "📺" },
                { step: "2", text: "Analyze vocabulary with AI", icon: "🧠" },
                { step: "3", text: "Star words to save", icon: "⭐" },
                { step: "4", text: "Practice & master here!", icon: "🎯" }
              ].map((item) => (
                <motion.div
                  key={item.step}
                  className="flex flex-col items-center text-center group"
                  whileHover={{ scale: 1.05, y: -5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm text-2xl group-hover:bg-white/30 transition-colors">
                    {item.icon}
                  </div>
                  <div className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                    {item.text}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Action Button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              <Button
                onClick={handleDismiss}
                className="bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm rounded-2xl px-8 py-3 font-semibold transition-all duration-300 shadow-lg"
              >
                I got it, don't show this again! 🚀
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default GetStartedSection