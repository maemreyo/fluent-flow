'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full relative">
      {/* Master Background - Full screen */}
      <div className="absolute inset-0 hidden xl:block overflow-hidden">
        {/* Aurora Borealis Base Layer */}
        <motion.div
          className="absolute inset-0 z-0"
          animate={{
            background: [
              'conic-gradient(from 0deg at 20% 30%, #667eea 0%, #764ba2 25%, transparent 50%), conic-gradient(from 180deg at 80% 70%, #f093fb 0%, #f5576c 25%, transparent 50%)',
              'conic-gradient(from 90deg at 70% 20%, #4facfe 0%, #00f2fe 25%, transparent 50%), conic-gradient(from 270deg at 30% 80%, #43e97b 0%, #38f9d7 25%, transparent 50%)',
              'conic-gradient(from 180deg at 50% 60%, #a855f7 0%, #ec4899 25%, transparent 50%), conic-gradient(from 0deg at 40% 40%, #f59e0b 0%, #ef4444 25%, transparent 50%)',
              'conic-gradient(from 270deg at 80% 30%, #8b5cf6 0%, #06b6d4 25%, transparent 50%), conic-gradient(from 90deg at 20% 70%, #10b981 0%, #f472b6 25%, transparent 50%)',
              'conic-gradient(from 0deg at 20% 30%, #667eea 0%, #764ba2 25%, transparent 50%), conic-gradient(from 180deg at 80% 70%, #f093fb 0%, #f5576c 25%, transparent 50%)',
            ],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        />

        {/* Morphing Blobs Layer */}
        <motion.div
          className="absolute inset-0 z-10"
          style={{
            filter: 'blur(80px)',
            transform: 'scale(1.2)',
          }}
        >
          {/* Mega Blob 1 */}
          <motion.div
            className="absolute w-96 h-96"
            style={{
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
            }}
            animate={{
              x: ['10%', '80%', '20%', '10%'],
              y: ['20%', '70%', '30%', '20%'],
              scale: [1, 1.5, 0.8, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          
          {/* Mega Blob 2 */}
          <motion.div
            className="absolute w-80 h-80"
            style={{
              background: 'radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, transparent 70%)',
            }}
            animate={{
              x: ['70%', '20%', '60%', '70%'],
              y: ['60%', '20%', '80%', '60%'],
              scale: [0.8, 1.3, 1, 0.8],
              rotate: [0, -120, -240, -360],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 5,
            }}
          />
          
          {/* Mega Blob 3 */}
          <motion.div
            className="absolute w-72 h-72"
            style={{
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
            }}
            animate={{
              x: ['40%', '70%', '10%', '40%'],
              y: ['10%', '50%', '70%', '10%'],
              scale: [1.2, 0.7, 1.4, 1.2],
              rotate: [0, 90, 180, 270, 360],
            }}
            transition={{
              duration: 35,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 10,
            }}
          />
        </motion.div>

        {/* Subtle Energy Streams */}
        <motion.div className="absolute inset-0 z-20">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-gradient-to-b from-purple-200/20 via-blue-200/10 to-transparent opacity-0"
              style={{
                width: '2px',
                left: `${25 + i * 25}%`,
                top: '0%',
                height: '100%',
                filter: 'blur(2px)',
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.2)',
              }}
              animate={{
                opacity: [0, 0.3, 0.1, 0],
                scaleY: [0.5, 1, 0.7, 0.5],
                x: [0, Math.random() * 10 - 5, Math.random() * 15 - 7.5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 15 + Math.random() * 20,
                delay: i * 8,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>

        {/* Cosmic Dust Clouds */}
        <motion.div
          className="absolute inset-0 z-5"
          style={{
            background: `
              radial-gradient(ellipse 800px 400px at 20% 30%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
              radial-gradient(ellipse 600px 300px at 80% 70%, rgba(236, 72, 153, 0.08) 0%, transparent 50%),
              radial-gradient(ellipse 700px 350px at 50% 50%, rgba(16, 185, 129, 0.06) 0%, transparent 50%)
            `,
          }}
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 2, 0],
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        />
        
        {/* Ultra Enhanced Floating Orbs */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${60 + Math.random() * 80}px`,
              height: `${60 + Math.random() * 80}px`,
              background: [
                'conic-gradient(from 0deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.2), rgba(59, 130, 246, 0.3))',
                'conic-gradient(from 120deg, rgba(16, 185, 129, 0.3), rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.3))',
                'conic-gradient(from 240deg, rgba(168, 85, 247, 0.3), rgba(6, 182, 212, 0.2), rgba(34, 197, 94, 0.3))',
              ][i % 3],
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              filter: 'blur(1px)',
              boxShadow: '0 0 60px rgba(139, 92, 246, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.1)',
            }}
            animate={{
              y: [0, -50 - Math.random() * 40, 30 + Math.random() * 20, 0],
              x: [0, 40 - Math.random() * 80, -20 + Math.random() * 40, 0],
              scale: [1, 1.2 + Math.random() * 0.3, 0.8 + Math.random() * 0.2, 1],
              rotate: [0, 180 + Math.random() * 180, 360],
              opacity: [0.3, 0.8, 0.5, 0.3],
            }}
            transition={{
              duration: 20 + Math.random() * 15,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
              delay: i * 2.5,
            }}
          />
        ))}

        {/* Galaxy Spiral Effect */}
        <motion.div
          className="absolute inset-0 z-15"
          style={{
            background: `
              conic-gradient(from 0deg at 50% 50%, 
                transparent 0deg, 
                rgba(139, 92, 246, 0.1) 60deg, 
                transparent 120deg,
                rgba(236, 72, 153, 0.08) 180deg,
                transparent 240deg,
                rgba(59, 130, 246, 0.06) 300deg,
                transparent 360deg
              )
            `,
          }}
          animate={{
            rotate: [0, 360],
            scale: [1, 1.05, 1],
          }}
          transition={{
            rotate: { duration: 60, repeat: Infinity, ease: 'linear' },
            scale: { duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' },
          }}
        />
        
        {/* Stardust Particles */}
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute rounded-full"
            style={{
              width: `${1 + Math.random() * 3}px`,
              height: `${1 + Math.random() * 3}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: [
                'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%)',
                'radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, transparent 70%)',
                'radial-gradient(circle, rgba(236, 72, 153, 0.6) 0%, transparent 70%)',
                'radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, transparent 70%)',
                'radial-gradient(circle, rgba(16, 185, 129, 0.6) 0%, transparent 70%)',
              ][Math.floor(Math.random() * 5)],
              boxShadow: '0 0 8px currentColor',
            }}
            animate={{
              y: [0, -150 - Math.random() * 100, 0],
              x: [0, Math.random() * 100 - 50, 0],
              opacity: [0, 1, 0.5, 0],
              scale: [0.2, 1, 0.4, 0.2],
              rotate: [0, 360],
            }}
            transition={{
              duration: 12 + Math.random() * 15,
              repeat: Infinity,
              delay: Math.random() * 15,
              ease: 'easeInOut',
            }}
          />
        ))}

        {/* Nebula Smoke Effect */}
        <motion.div
          className="absolute inset-0 z-8 opacity-20"
          style={{
            background: `
              radial-gradient(ellipse 1000px 600px at 30% 40%, rgba(139, 92, 246, 0.15) 0%, transparent 60%),
              radial-gradient(ellipse 800px 500px at 70% 60%, rgba(236, 72, 153, 0.12) 0%, transparent 60%),
              radial-gradient(ellipse 900px 550px at 50% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 60%)
            `,
            filter: 'blur(40px)',
          }}
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -20, 40, 0],
            scale: [1, 1.15, 0.95, 1],
            rotate: [0, 5, -3, 0],
          }}
          transition={{
            duration: 50,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10 min-h-screen w-full flex max-w-[1600px] mx-auto">
        {/* Left spacer for desktop */}
        <div className="flex-1 hidden xl:block" />
        
        {/* Right side - Form */}
        <div className="w-full xl:w-[580px] xl:max-w-[40vw] flex-shrink-0 flex items-center justify-center p-8 bg-gray-50/80 xl:bg-gray-50/80 backdrop-blur-sm">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
