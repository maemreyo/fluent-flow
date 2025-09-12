'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, ArrowLeft, Loader2, ArrowRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase/client'

const getMailboxInfo = (email: string): { url: string; name: string } | null => {
  if (!email || typeof email !== 'string') return null;
  const parts = email.split('@');
  if (parts.length !== 2) return null;
  const domain = parts[1].toLowerCase();

  const providers: { [key: string]: { name: string; url: string } } = {
    'gmail.com': { name: 'Gmail', url: 'https://mail.google.com' },
    'yahoo.com': { name: 'Yahoo Mail', url: 'https://mail.yahoo.com' },
    'outlook.com': { name: 'Outlook', url: 'https://outlook.live.com/mail' },
    'hotmail.com': { name: 'Outlook', url: 'https://outlook.live.com/mail' },
    'icloud.com': { name: 'iCloud Mail', url: 'https://www.icloud.com/mail' },
    'protonmail.com': { name: 'ProtonMail', url: 'https://mail.protonmail.com' },
  };

  if (providers[domain]) {
    return providers[domain];
  }
  
  // Generic fallback for other domains
  const capitalizedDomain = domain.charAt(0).toUpperCase() + domain.slice(1);
  return { name: capitalizedDomain, url: `https://${domain}` };
};

export default function ForgotPasswordPage() {
  const router = useRouter()
  
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) {
      setError('Authentication service not available')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess('Password reset email sent! Please check your inbox and follow the instructions.')
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const mailbox = getMailboxInfo(email);

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-6xl font-bold text-transparent">
          Fluent Flow
        </h1>
        <p className="text-gray-800 text-xl font-medium">Learn languages with AI-powered conversations</p>
      </div>

      {/* Form Header */}
      <div className="text-center mb-10">
        <h2 className="text-4xl font-bold text-gray-900 mb-3">
          Forgot Password
        </h2>
        <p className="text-gray-700 text-lg">Enter your email to receive reset instructions</p>
      </div>

      {/* Form Section - Direct on background */}
      {success ? (
        <div className="text-center">
          <Alert className="border-green-200 bg-green-50/90 backdrop-blur-sm rounded-xl mb-8">
            <AlertDescription className="text-green-700 font-medium text-base">
              {success}
            </AlertDescription>
          </Alert>
          {mailbox && (
            <div className="mt-8">
              <a
                href={mailbox.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all duration-300 hover:from-green-600 hover:to-emerald-700 hover:shadow-xl hover:scale-105"
              >
                Open {mailbox.name}
                <ExternalLink className="ml-2 h-6 w-6" />
              </a>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleForgotPassword} className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50/90 backdrop-blur-sm rounded-xl">
              <AlertDescription className="text-red-700 text-base">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div>
            <label htmlFor="email" className="block text-base font-semibold text-gray-800 mb-4">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-300" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-16 pr-5 py-5 h-16 border-0 bg-white/80 backdrop-blur-md focus:bg-white/95 rounded-2xl text-lg shadow-lg focus:shadow-xl hover:shadow-lg transition-all duration-300 focus:ring-2 focus:ring-indigo-400/50 focus:ring-offset-2 focus:ring-offset-transparent placeholder:text-gray-400"
                placeholder="Enter your email"
                required
                disabled={isLoading}
                style={{
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
                }}
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-0"
            disabled={isLoading || !email}
            style={{
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Sending Reset Email...
              </>
            ) : (
              <>
                Send Reset Email
                <ArrowRight className="ml-2 h-6 w-6" />
              </>
            )}
          </Button>
        </form>
      )}

      <div className="mt-10 text-center">
        <Link
          href="/auth/signin"
          className="inline-flex items-center text-base font-medium text-indigo-600 hover:text-indigo-500 hover:underline transition-colors"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Sign In
        </Link>
      </div>
    </div>
  )
}