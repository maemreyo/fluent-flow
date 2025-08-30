import React from 'react'
import { motion } from 'framer-motion'
import { Flame, TrendingUp } from 'lucide-react'
import type { LearningStats } from '../../lib/services/user-vocabulary-service'
import { UserDropdown } from '../shared/UserDropdown'

interface ModernHeaderProps {
  user: any
  checkingAuth: boolean
  signOut: () => void
  stats: LearningStats | null
}

export const ModernHeader: React.FC<ModernHeaderProps> = ({
  user,
  checkingAuth,
  signOut,
  stats
}) => {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="sticky top-0 z-50 border-b border-white/20 bg-white/80 shadow-lg backdrop-blur-sm"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo with Animation */}
          <motion.div
            className="flex items-center space-x-4"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <motion.div
              className="relative"
              whileHover={{ rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl shadow-lg">
                <img src="/assets/icon.png" alt="FluentFlow" className="h-8 w-8 object-contain" />
              </div>
              <div className="absolute -right-1 -top-1 h-4 w-4 animate-pulse rounded-full bg-gradient-to-r from-pink-400 to-red-400" />
            </motion.div>
            <div>
              <h1 className="bg-gradient-to-r from-violet-600 via-blue-600 to-emerald-600 bg-clip-text text-2xl font-bold text-transparent">
                FluentFlow
              </h1>
              <p className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-sm font-medium text-transparent">
                Your Learning Journey ✨
              </p>
            </div>
          </motion.div>

          <div className="flex items-center gap-8">
            {/* Enhanced Quick Stats */}
            <div className="hidden items-center space-x-8 md:flex">
              <motion.div
                className="group cursor-pointer text-center"
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <div className="relative">
                  <div className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-2xl font-bold text-transparent">
                    {stats ? stats.wordsLearned + stats.phrasesLearned : 0}
                  </div>
                  <div className="text-xs font-medium text-gray-600 transition-colors group-hover:text-emerald-600">
                    Items Mastered
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="group cursor-pointer text-center"
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <div className="relative flex items-center justify-center gap-1">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-2xl font-bold text-transparent">
                    {stats?.currentStreakDays || 0}
                  </div>
                </div>
                <div className="text-xs font-medium text-gray-600 transition-colors group-hover:text-orange-600">
                  Day Streak
                </div>
              </motion.div>

              <motion.div
                className="group cursor-pointer text-center"
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <div className="relative flex items-center justify-center gap-1">
                  <TrendingUp className="h-4 w-4 text-violet-500" />
                  <div className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-2xl font-bold text-transparent">
                    {stats ? stats.totalWordsAdded + stats.totalPhrasesAdded : 0}
                  </div>
                </div>
                <div className="text-xs font-medium text-gray-600 transition-colors group-hover:text-violet-600">
                  Words Saved
                </div>
              </motion.div>
            </div>
            <UserDropdown user={user} checkingAuth={checkingAuth} onSignOut={signOut} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default ModernHeader
