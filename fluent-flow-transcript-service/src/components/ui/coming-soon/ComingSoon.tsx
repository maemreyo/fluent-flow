import { Clock, Sparkles } from 'lucide-react'
import { Badge } from '../badge'

interface ComingSoonProps {
  title?: string
  description?: string
  className?: string
  overlay?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ComingSoon({ 
  title = "Coming Soon", 
  description = "This feature is currently under development",
  className = "",
  overlay = false,
  size = 'md'
}: ComingSoonProps) {
  const sizeClasses = {
    sm: 'p-4 text-sm',
    md: 'p-6 text-base', 
    lg: 'p-8 text-lg'
  }

  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  }

  const content = (
    <div className={`flex flex-col items-center justify-center text-center space-y-4 ${sizeClasses[size]} ${className}`}>
      <div className="relative">
        <div className={`${iconSizes[size]} rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-2`}>
          <Clock className={`${size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8'} text-indigo-600`} />
        </div>
        <div className="absolute -top-1 -right-1">
          <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className={`font-semibold text-gray-800 ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'}`}>
          {title}
        </h3>
        <p className={`text-gray-600 ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}`}>
          {description}
        </p>
      </div>
      
      <Badge variant="outline" className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 text-indigo-700">
        <Clock className="h-3 w-3 mr-1" />
        In Development
      </Badge>
    </div>
  )

  if (overlay) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-dashed border-indigo-200 z-10">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
      {content}
    </div>
  )
}