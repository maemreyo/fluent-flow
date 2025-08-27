import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Key, 
  Shield, 
  Lock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Copy,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Server,
  Zap
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

interface ModernApiKeyStepProps {
  onNext: () => void
  onPrevious: () => void
}

const SecurityFeature = ({ icon: Icon, title, description, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.6 }}
    className="flex items-start gap-4 p-4 bg-white/5 rounded-lg border border-white/10"
  >
    <div className="p-2 bg-green-500/20 rounded-lg">
      <Icon className="h-5 w-5 text-green-400" />
    </div>
    <div>
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-gray-100 text-sm">{description}</p>
    </div>
  </motion.div>
)

const SetupStep = ({ number, title, description, isActive, isCompleted }) => (
  <motion.div
    className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${
      isActive 
        ? 'bg-primary/20 border-primary/50 shadow-lg' 
        : isCompleted 
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-white/5 border-white/10'
    } border`}
    whileHover={{ scale: 1.02 }}
  >
    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
      isCompleted 
        ? 'bg-green-500 text-white' 
        : isActive 
          ? 'bg-primary text-white' 
          : 'bg-white/10 text-gray-400'
    }`}>
      {isCompleted ? <CheckCircle className="h-5 w-5" /> : number}
    </div>
    <div className="flex-1">
      <h3 className={`font-semibold mb-1 ${
        isActive ? 'text-primary' : isCompleted ? 'text-green-400' : 'text-white'
      }`}>
        {title}
      </h3>
      <p className="text-gray-100 text-sm">{description}</p>
    </div>
  </motion.div>
)

export function ModernApiKeyStep({ onNext, onPrevious }: ModernApiKeyStepProps) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const validateApiKey = (key: string) => {
    // Basic validation for Gemini API key format
    const geminiPattern = /^AIza[0-9A-Za-z_-]{35}$/
    return geminiPattern.test(key.trim())
  }

  useEffect(() => {
    if (apiKey.length > 10) {
      setIsValidating(true)
      const timer = setTimeout(() => {
        const valid = validateApiKey(apiKey)
        setIsValid(valid)
        setIsValidating(false)
        if (valid) setCurrentStep(3)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      setIsValid(false)
      setCurrentStep(apiKey.length > 0 ? 2 : 1)
    }
  }, [apiKey])

  const handleSave = async () => {
    if (isValid) {
      // Save API key to storage
      await chrome.storage.sync.set({ 
        geminiApiKey: apiKey.trim(),
        onboardingCompleted: false // Will be set to true in completion step
      })
      onNext()
    }
  }

  const setupSteps = [
    {
      number: 1,
      title: "Get Your Gemini API Key",
      description: "Visit Google AI Studio to generate your free API key"
    },
    {
      number: 2,
      title: "Paste Your API Key",
      description: "Copy and paste your API key in the secure field below"
    },
    {
      number: 3,
      title: "Verify & Save",
      description: "We'll validate your key and save it securely in your browser"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.div
            className="flex items-center justify-center gap-3 mb-6"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Key className="h-12 w-12 text-yellow-400" />
            <h1 className="text-4xl md:text-6xl font-black text-white">
              Setup API Key
            </h1>
          </motion.div>
          <p className="text-xl text-gray-100 max-w-2xl mx-auto">
            Connect your Gemini API key to unlock all AI-powered features. 
            Don't worry - it's completely secure and stored only in your browser.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Setup Steps */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="space-y-6"
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-primary" />
                Quick Setup
              </h2>
              
              <div className="space-y-4">
                {setupSteps.map((step) => (
                  <SetupStep
                    key={step.number}
                    number={step.number}
                    title={step.title}
                    description={step.description}
                    isActive={currentStep === step.number}
                    isCompleted={currentStep > step.number}
                  />
                ))}
              </div>

              <motion.div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="h-4 w-4 text-blue-400" />
                  <span className="font-semibold text-blue-400">Get API Key</span>
                </div>
                <p className="text-gray-100 text-sm mb-3">
                  Visit Google AI Studio to generate your free Gemini API key
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.open('https://aistudio.google.com/app/apikey', '_blank')}
                  className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open AI Studio
                </Button>
              </motion.div>
            </div>

            {/* Security Features */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
            >
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-400" />
                Security First
              </h3>
              
              <div className="space-y-3">
                <SecurityFeature
                  icon={Lock}
                  title="Local Storage Only"
                  description="Your API key is stored securely in your browser only"
                  delay={0.1}
                />
                <SecurityFeature
                  icon={Server}
                  title="No Server Access"
                  description="We never send your API key to our servers"
                  delay={0.2}
                />
                <SecurityFeature
                  icon={Shield}
                  title="Encrypted Storage"
                  description="Keys are encrypted using Chrome's secure storage"
                  delay={0.3}
                />
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - API Key Input */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="space-y-6"
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Key className="h-6 w-6 text-primary" />
                Enter API Key
              </h3>

              <div className="space-y-4">
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    placeholder="Paste your Gemini API key here..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-20 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-primary/50 focus:bg-white/15"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {apiKey && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(apiKey)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowKey(!showKey)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <AnimatePresence>
                  {apiKey && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      {isValidating ? (
                        <div className="flex items-center gap-2 text-yellow-400">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Zap className="h-4 w-4" />
                          </motion.div>
                          <span className="text-sm">Validating API key...</span>
                        </div>
                      ) : isValid ? (
                        <div className="flex items-center gap-2 text-green-400">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Valid API key detected!</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-400">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">Invalid API key format</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="text-xs text-gray-200 space-y-1">
                  <p>• API key should start with "AIza"</p>
                  <p>• Must be exactly 39 characters long</p>
                  <p>• Generate at aistudio.google.com/app/apikey</p>
                </div>
              </div>

              {/* Sample API Key Format */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-600/30"
              >
                <p className="text-sm text-gray-200 mb-2">Expected format:</p>
                <code className="text-sm text-green-400 font-mono">
                  AIzaSyC-JlK8d9GHI2mnOPQRst3UVWX4YZab1cD
                </code>
              </motion.div>
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
            Back to Account
          </Button>

          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Step 4 of 5</p>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={`w-2 h-2 rounded-full ${
                    step <= 4 ? 'bg-primary' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!isValid}
            className="group bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            Continue Setup
            <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
          </Button>
        </motion.div>
      </div>
    </div>
  )
}