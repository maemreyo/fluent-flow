'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, ArrowLeft, Loader2, ArrowRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    <Card className="border-white/20 bg-white/90 backdrop-blur-sm shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-gray-900">
          Forgot Password
        </CardTitle>
        <p className="text-gray-600">Enter your email to receive reset instructions</p>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="text-center">
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-700 font-medium">
                {success}
              </AlertDescription>
            </Alert>
            {mailbox && (
              <div className="mt-6">
                <a
                  href={mailbox.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:from-green-600 hover:to-emerald-700 hover:shadow-xl hover:scale-105"
                >
                  Open {mailbox.name}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-6">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Reset Email...
                </>
              ) : (
                <>
                  Send Reset Email
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/auth/signin"
            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500 hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}