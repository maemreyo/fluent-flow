import { useState } from 'react'
import { X, Mail, Link2, Copy, Check, UserPlus } from 'lucide-react'
import { useQuizAuth } from '../../lib/hooks/use-quiz-auth'
import { supabase } from '../../lib/supabase/client'

interface InviteMemberModalProps {
  groupId: string
  groupName: string
  groupCode: string
  onClose: () => void
  onSuccess?: () => void
}

export default function InviteMemberModal({ 
  groupId, 
  groupName, 
  groupCode, 
  onClose, 
  onSuccess 
}: InviteMemberModalProps) {
  const [inviteMethod, setInviteMethod] = useState<'email' | 'link'>('link')
  const [emailList, setEmailList] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const { user } = useQuizAuth()

  const inviteLink = `${window.location.origin}/groups/join?code=${groupCode}`

  const handleEmailInvites = async () => {
    if (!emailList.trim()) {
      setError('Please enter at least one email address')
      return
    }

    const emails = emailList
      .split(/[,\n]/)
      .map(email => email.trim())
      .filter(email => email && email.includes('@'))

    if (emails.length === 0) {
      setError('Please enter valid email addresses')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get the current session token
      const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } }
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/groups/${groupId}/invite`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          emails,
          message: `You've been invited to join "${groupName}" study group!`
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(`Sent ${emails.length} invitation${emails.length > 1 ? 's' : ''} successfully!`)
        setEmailList('')
        onSuccess?.()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to send invitations')
      }
    } catch (err) {
      setError('Failed to send invitations. Please try again.')
      console.error('Invite error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Invite Members</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Invite people to join <strong>{groupName}</strong>
          </p>

          {/* Invite Method Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
            <button
              onClick={() => setInviteMethod('link')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                inviteMethod === 'link'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Link2 className="w-4 h-4" />
              Share Link
            </button>
            <button
              onClick={() => setInviteMethod('email')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                inviteMethod === 'email'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Mail className="w-4 h-4" />
              Send Email
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        {inviteMethod === 'link' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Invite Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Share this link with people you want to invite
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Group Code
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={groupCode}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(groupCode)}
                  className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                People can also join using this code in the app
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Addresses
              </label>
              <textarea
                value={emailList}
                onChange={(e) => setEmailList(e.target.value)}
                placeholder="Enter email addresses (one per line or comma-separated)&#10;example1@gmail.com&#10;example2@gmail.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate multiple emails with commas or new lines
              </p>
            </div>

            <button
              onClick={handleEmailInvites}
              disabled={loading || !emailList.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Send Invitations
                </>
              )}
            </button>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}