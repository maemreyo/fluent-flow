import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight,
  ArrowLeft,
  UserPlus,
  LogIn,
  Shield,
  Star,
  Sparkles
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

interface SignInUpStepProps {
  onNext: () => void
  onPrevious: () => void
}

const FloatingShape = ({ delay = 0, className = "" }) => (
  <motion.div
    className={`absolute rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 blur-xl ${className}`}
    animate={{
      scale: [1, 1.2, 1],
      opacity: [0.3, 0.6, 0.3],
      rotate: [0, 180, 360],
    }}
    transition={{
      duration: 8,
      repeat: Infinity,
      delay,
      ease: "easeInOut"
    }}
  />
)

const Benefit = ({ icon: Icon, title, description, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.6 }}
    className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
  >
    <div className="p-2 bg-primary/20 rounded-lg flex-shrink-0">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div>
      <h4 className="font-semibold text-white text-sm">{title}</h4>
      <p className="text-xs text-gray-100">{description}</p>
    </div>
  </motion.div>
)

export function SignInUpStep({ onNext, onPrevious }: SignInUpStepProps) {
  const [isSignUp, setIsSignUp] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const validateForm = () => {
    const newErrors = {
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    }

    if (isSignUp && !formData.username.trim()) {
      newErrors.username = 'Username is required'
    }

    if (isSignUp && formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (isSignUp && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return !Object.values(newErrors).some(error => error !== '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      // Store user data (mock implementation)
      chrome.storage.sync.set({ 
        userSignedIn: true,
        username: formData.username || formData.email.split('@')[0],
        email: formData.email
      })
      
      setIsLoading(false)
      onNext()
    }, 2000)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const benefits = [
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data is encrypted and stored securely"
    },
    {
      icon: Star,
      title: "Personalized Learning",
      description: "Track progress and get tailored recommendations"
    },
    {
      icon: Sparkles,
      title: "Sync Across Devices",
      description: "Access your learning data anywhere, anytime"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 p-6 relative overflow-hidden">
      {/* Floating Background Shapes */}
      <FloatingShape delay={0} className="top-10 left-10 w-32 h-32" />
      <FloatingShape delay={2} className="top-1/3 right-20 w-24 h-24" />
      <FloatingShape delay={4} className="bottom-20 left-1/4 w-40 h-40" />
      
      <div className="container mx-auto max-w-6xl relative z-10">
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
            transition={{ duration: 3, repeat: Infinity }}
          >
            <UserPlus className="h-12 w-12 text-primary" />
            <h1 className="text-4xl md:text-6xl font-black text-white">
              {isSignUp ? 'Join FluentFlow' : 'Welcome Back'}
            </h1>
          </motion.div>
          <p className="text-xl text-gray-100 max-w-2xl mx-auto">
            {isSignUp 
              ? 'Create your account to unlock personalized learning experiences and sync your progress across devices'
              : 'Sign in to continue your learning journey where you left off'
            }
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Benefits */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="space-y-8"
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">
                Why Create an Account?
              </h2>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <Benefit
                    key={benefit.title}
                    icon={benefit.icon}
                    title={benefit.title}
                    description={benefit.description}
                    delay={0.4 + index * 0.1}
                  />
                ))}
              </div>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-2 gap-4 text-center"
            >
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-bold text-primary mb-1">10K+</div>
                <div className="text-sm text-gray-200">Active Learners</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-bold text-primary mb-1">50M+</div>
                <div className="text-sm text-gray-200">Videos Processed</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              {/* Toggle Sign In/Up */}
              <div className="flex bg-white/10 rounded-lg p-1 mb-6">
                <button
                  onClick={() => setIsSignUp(true)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    isSignUp 
                      ? 'bg-primary text-white shadow-lg' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
                <button
                  onClick={() => setIsSignUp(false)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    !isSignUp 
                      ? 'bg-primary text-white shadow-lg' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {isSignUp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="relative mb-4">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Username"
                          value={formData.username}
                          onChange={(e) => handleInputChange('username', e.target.value)}
                          className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-primary/50"
                        />
                        {errors.username && (
                          <p className="text-red-400 text-xs mt-1">{errors.username}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-primary/50"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                  {errors.password && (
                    <p className="text-red-400 text-xs mt-1">{errors.password}</p>
                  )}
                </div>

                <AnimatePresence>
                  {isSignUp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm password"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-primary/50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                        {errors.confirmPassword && (
                          <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      {isSignUp ? <UserPlus className="h-5 w-5 mr-2" /> : <LogIn className="h-5 w-5 mr-2" />}
                      {isSignUp ? 'Create Account' : 'Sign In'}
                    </>
                  )}
                </Button>

                {!isSignUp && (
                  <div className="text-center">
                    <button
                      type="button"
                      className="text-sm text-primary hover:text-primary/80 underline"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}
              </form>
            </div>
          </motion.div>
        </div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex justify-between items-center mt-12"
        >
          <Button
            variant="outline"
            onClick={onPrevious}
            className="group bg-white/10 border-white/20 hover:bg-white/20 text-white"
          >
            <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            Back to Features
          </Button>

          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Step 3 of 5</p>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={`w-2 h-2 rounded-full ${
                    step <= 3 ? 'bg-primary' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="w-32" /> {/* Spacer */}
        </motion.div>
      </div>
    </div>
  )
}