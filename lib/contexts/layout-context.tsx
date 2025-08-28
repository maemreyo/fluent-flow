// Layout Context - Provides adaptive layout information for responsive components
// Determines whether to use compact or detailed UI based on container context

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export type LayoutMode = 'sidepanel' | 'options'

export interface LayoutContextValue {
  layoutMode: LayoutMode
  isCompact: boolean
  containerWidth: number
  showDetailedUsage: boolean
  showUpgradePrompts: boolean
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined)

export interface LayoutProviderProps {
  children: ReactNode
  forceMode?: LayoutMode
}

export const LayoutProvider = ({ children, forceMode }: LayoutProviderProps) => {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('sidepanel')
  const [containerWidth, setContainerWidth] = useState(320)

  useEffect(() => {
    const detectLayoutMode = () => {
      if (forceMode) {
        setLayoutMode(forceMode)
        setContainerWidth(forceMode === 'sidepanel' ? 320 : 800)
        return
      }

      // Auto-detect based on various factors
      const isOptionsPage = window.location.pathname.includes('options')
      const windowWidth = window.innerWidth

      let detectedMode: LayoutMode = 'sidepanel'
      let width = 320

      if (isOptionsPage) {
        detectedMode = 'options'
        width = Math.min(windowWidth - 40, 1200) // Max width with padding
      } else {
        // Check if we're in a sidepanel context
        const container = document.querySelector('[data-layout-container]')
        if (container) {
          const containerRect = container.getBoundingClientRect()
          width = containerRect.width
          
          // If container is wider than typical sidepanel, might be options
          if (width > 600) {
            detectedMode = 'options'
          }
        }
      }

      setLayoutMode(detectedMode)
      setContainerWidth(width)
    }

    // Initial detection
    detectLayoutMode()

    // Listen for resize events
    const handleResize = () => detectLayoutMode()
    window.addEventListener('resize', handleResize)

    // Listen for navigation changes
    const handleNavigation = () => {
      setTimeout(detectLayoutMode, 100) // Small delay for DOM updates
    }
    window.addEventListener('popstate', handleNavigation)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('popstate', handleNavigation)
    }
  }, [forceMode])

  const contextValue: LayoutContextValue = {
    layoutMode,
    isCompact: layoutMode === 'sidepanel' || containerWidth < 500,
    containerWidth,
    showDetailedUsage: layoutMode === 'options',
    showUpgradePrompts: true // Always show upgrade prompts
  }

  return (
    <LayoutContext.Provider value={contextValue}>
      {children}
    </LayoutContext.Provider>
  )
}

export const useLayout = (): LayoutContextValue => {
  const context = useContext(LayoutContext)
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}

// Hook for component-specific layout decisions
export const useAdaptiveLayout = (componentName?: string) => {
  const layout = useLayout()
  
  // Component-specific overrides can be added here
  const getVariant = (compactVariant: string, detailedVariant: string) => {
    return layout.isCompact ? compactVariant : detailedVariant
  }

  const getSize = (compactSize: number | string, detailedSize: number | string) => {
    return layout.isCompact ? compactSize : detailedSize
  }

  const shouldShowFeature = (featureName: string): boolean => {
    // Define which features to show in compact mode
    const compactFeatures = [
      'subscription-badge',
      'usage-indicator', 
      'upgrade-prompt',
      'basic-stats'
    ]

    if (layout.isCompact) {
      return compactFeatures.includes(featureName)
    }

    return true // Show all features in detailed mode
  }

  return {
    ...layout,
    getVariant,
    getSize,
    shouldShowFeature,
    // Convenience flags
    isSidepanel: layout.layoutMode === 'sidepanel',
    isOptions: layout.layoutMode === 'options',
    // Breakpoints
    isExtraCompact: layout.containerWidth < 280,
    isCompact: layout.containerWidth < 500,
    isMedium: layout.containerWidth >= 500 && layout.containerWidth < 800,
    isWide: layout.containerWidth >= 800
  }
}