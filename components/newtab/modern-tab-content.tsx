import React from 'react'
import { motion } from 'framer-motion'
import { Book, Target } from 'lucide-react'
import { SRSDashboard } from '../learning/srs-dashboard'
import { EnhancedContextualLearning } from '../learning/enhanced-contextual-learning'

interface ModernTabContentProps {
  activeTab: 'srs' | 'contextual'
  onStartReview: () => void
  onViewAllCards: () => void
  onNavigateToVideo: (loopId: string) => void
}

export const ModernTabContent: React.FC<ModernTabContentProps> = ({
  activeTab,
  onStartReview,
  onViewAllCards,
  onNavigateToVideo
}) => {
  return (
    <motion.div 
      key={activeTab}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-2xl p-8 lg:p-12"
    >
      {activeTab === 'srs' && (
        <div className="space-y-8">
          <motion.div 
            className="text-center"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                Smart Review System
              </h3>
            </div>
            <p className="text-gray-700 max-w-3xl mx-auto text-lg leading-relaxed">
              ✨ Our AI-powered spaced repetition system shows you words at the perfect moment—just before you forget them! 
              Start with frequent reviews, then gradually space them out as your memory strengthens. 
              <span className="font-semibold text-emerald-600">Science meets learning magic! 🧠💫</span>
            </p>
          </motion.div>
          <SRSDashboard
            onStartReview={onStartReview}
            onViewAllCards={onViewAllCards}
          />
        </div>
      )}

      {activeTab === 'contextual' && (
        <div className="space-y-8">
          <motion.div
            className="text-center"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4 inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500">
                <Book className="h-6 w-6 text-white" />
              </div>
              <h3 className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-3xl font-bold text-transparent">
                Word Explorer
              </h3>
            </div>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-gray-700">
              🔍 Dive deep into your vocabulary universe! Discover how words live in real contexts, 
              explore fascinating collocations, and see usage patterns across different scenarios. 
              <span className="font-semibold text-teal-600">
                Every word has a story to tell! 📚✨
              </span>
            </p>
          </motion.div>
          <EnhancedContextualLearning
            onNavigateToVideo={onNavigateToVideo}
          />
        </div>
      )}
    </motion.div>
  )
}

export default ModernTabContent