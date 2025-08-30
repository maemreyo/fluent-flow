import React from 'react'
import { motion } from 'framer-motion'
import { Book, Target } from 'lucide-react'

interface Tab {
  id: 'srs' | 'contextual'
  title: string
  icon: React.ReactNode
  description: string
}

interface ModernTabNavigationProps {
  activeTab: 'srs' | 'contextual'
  onTabChange: (tab: 'srs' | 'contextual') => void
}

export const ModernTabNavigation: React.FC<ModernTabNavigationProps> = ({
  activeTab,
  onTabChange
}) => {
  const tabs: Tab[] = [
    {
      id: 'srs',
      title: 'Smart Review',
      icon: <Target className="h-5 w-5" />,
      description: 'Review words at optimal intervals to boost long-term memory retention'
    },
    {
      id: 'contextual',
      title: 'Word Explorer',
      icon: <Book className="h-5 w-5" />,
      description: 'Explore usage examples, collocations, and contexts for deeper understanding'
    }
  ]

  return (
    <div className="mb-12">
      <div className="flex justify-center">
        <div className="flex space-x-2 rounded-2xl bg-white/60 backdrop-blur-sm p-2 shadow-lg border border-white/20">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-3 rounded-xl px-6 py-4 text-sm font-semibold transition-all duration-300 ${
                activeTab === tab.id
                  ? 'text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              layout
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabBg"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500 via-blue-500 to-emerald-500"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <div className="relative z-10 text-left">
                <div className="font-bold">{tab.title}</div>
                <div className={`text-xs transition-colors ${
                  activeTab === tab.id ? 'text-white/80' : 'text-gray-500'
                }`}>
                  {tab.description.slice(0, 30)}...
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ModernTabNavigation