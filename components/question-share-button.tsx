import React, { useState, useEffect } from 'react'
import { Check, Copy, ExternalLink, Loader2, Share2, X, Users, Clock } from 'lucide-react'
import { QuestionSharingService } from '../lib/services/question-sharing-service'
import { getCurrentUser } from '../lib/supabase/client'
import type { ConversationQuestions, SavedLoop } from '../lib/types/fluent-flow-types'

interface UserGroup {
  id: string
  name: string
  role: string
  member_count: number
  is_private: boolean
}

interface QuestionShareButtonProps {
  questions: ConversationQuestions | null
  loop: SavedLoop | null
  className?: string
  backendUrl?: string
}

export const QuestionShareButton: React.FC<QuestionShareButtonProps> = ({
  questions,
  loop,
  className = '',
  backendUrl = process.env.PLASMO_PUBLIC_BACKEND_URL || 'http://localhost:3838'
}) => {
  const [isSharing, setIsSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [expirationMessage, setExpirationMessage] = useState<string>('')
  const [shareMode, setShareMode] = useState<'public' | 'group'>('public')
  const [showGroupSelection, setShowGroupSelection] = useState(false)
  const [userGroups, setUserGroups] = useState<UserGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null)
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [isGettingUserEmail, setIsGettingUserEmail] = useState(false)

  const [sharingService, setSharingService] = useState(
    () => new QuestionSharingService({ backendUrl })
  )

  // Fetch user's groups for group sharing (simplified flow)
  const fetchUserGroups = async (emailOverride?: string) => {
    const emailToUse = emailOverride || userEmail.trim()
    if (!emailToUse) {
      setShowEmailPrompt(true)
      return
    }

    setLoadingGroups(true)
    setError(null)
    
    try {
      console.log(`Fetching groups for email: ${emailToUse}`)
      console.log('Backend URL:', backendUrl)

      const response = await fetch(`${backendUrl}/api/extension/user-groups-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userEmail: emailToUse
        })
      })

      console.log('Groups response status:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('Groups data:', data)
        
        setUserGroups(data.groups || [])
        
        if (!data.groups || data.groups.length === 0) {
          setError('No study groups found. Create or join a group first.')
        } else {
          // Automatically show group selection after fetching groups
          setShowGroupSelection(true)
        }
      } else {
        const errorText = await response.text()
        console.error('Failed to fetch groups:', response.status, errorText)
        
        let errorMessage = 'Failed to load groups'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          errorMessage = errorText || errorMessage
        }
        
        setError(errorMessage)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
      setError('Network error. Please check your connection.')
    } finally {
      setLoadingGroups(false)
    }
  }

  // Simple email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Get user email from authentication - using the same method as UserDropdown
  const getUserEmail = async (): Promise<string | null> => {
    try {
      // Use the same getCurrentUser function that the app uses
      const user = await getCurrentUser()
      if (user?.email) {
        console.log(`Found user email from authentication: ${user.email}`)
        return user.email
      }

      // Fallback: try to access the web app's Supabase session directly
      if (typeof window !== 'undefined') {
        const storageKeys = [
          'sb-fxawystovhtbuqhllswl-auth-token',
          'sb-localhost-auth-token'
        ]
        
        for (const key of storageKeys) {
          try {
            const stored = localStorage.getItem(key)
            if (stored) {
              const parsed = JSON.parse(stored)
              if (parsed?.user?.email) {
                console.log(`Found user email from localStorage: ${parsed.user.email}`)
                return parsed.user.email
              }
            }
          } catch (e) {
            // Continue to next key
          }
        }
      }

      // If Chrome extension, try to get from extension storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        return new Promise((resolve) => {
          const keys = ['user_email', 'userEmail', 'auth_user', 'current_user']
          
          chrome.storage.local.get(keys, (result) => {
            if (result.user_email) {
              resolve(result.user_email)
            } else if (result.userEmail) {
              resolve(result.userEmail)
            } else if (result.auth_user?.email) {
              resolve(result.auth_user.email)
            } else if (result.current_user?.email) {
              resolve(result.current_user.email)
            } else {
              resolve(null)
            }
          })
        })
      }

      return null
    } catch (error) {
      console.error('Error getting user email:', error)
      return null
    }
  }

  const handleShareToGroup = async (group: UserGroup) => {
    if (!questions || !loop) return
    
    if (!userEmail.trim()) {
      setError('Please enter your email first')
      setIsSharing(false)
      return
    }

    setIsSharing(true)
    setError(null)

    try {
      console.log('Creating group session for:', userEmail)
      console.log('Group ID:', group.id)

      const response = await fetch(`${backendUrl}/api/extension/create-group-session-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questions,
          loop,
          groupId: group.id,
          userEmail: userEmail.trim(),
          options: {
            title: `${loop.videoTitle} - Group Practice`,
            notifyMembers: true
          }
        })
      })

      console.log('Group session response status:', response.status, response.statusText)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Group session created successfully:', result)
        
        setShareUrl(result.shareUrl)
        setExpirationMessage(result.expirationMessage || 'Expires in 24h')
        setSelectedGroup(group)
        setShowGroupSelection(false)
        setShowDialog(true)
      } else {
        const errorText = await response.text()
        console.error('Group session creation failed:', response.status, errorText)
        
        let errorMessage = 'Failed to create group session'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          errorMessage = errorText || errorMessage
        }
        
        setError(errorMessage)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create group session')
      console.error('Group share error:', error)
    } finally {
      setIsSharing(false)
    }
  }

  const handleShare = async () => {
    if (!questions || !loop) {
      setError('No questions or loop data available to share')
      return
    }

    if (shareMode === 'group') {
      // Try to get user email automatically first
      if (!userEmail.trim()) {
        setIsGettingUserEmail(true)
        try {
          const autoEmail = await getUserEmail()
          if (autoEmail && isValidEmail(autoEmail)) {
            console.log(`Auto-detected user email: ${autoEmail}`)
            setUserEmail(autoEmail)
            
            // Automatically fetch groups with the detected email
            setIsGettingUserEmail(false)
            await fetchUserGroups(autoEmail)
            return
          } else {
            console.log('Could not auto-detect email, showing manual prompt')
            setIsGettingUserEmail(false)
            setShowEmailPrompt(true)
            return
          }
        } catch (error) {
          console.error('Error auto-detecting email:', error)
          setIsGettingUserEmail(false)
          setShowEmailPrompt(true)
          return
        }
      }
      
      // If we already have email, fetch groups (which will automatically show selection)
      await fetchUserGroups()
      return
    }

    // Public sharing (original functionality)
    setIsSharing(true)
    setError(null)

    try {
      // Add user email to metadata if available
      if (userEmail && isValidEmail(userEmail)) {
        sharingService.updateConfig({ apiKey: userEmail }) // Use email as identifier
      }
      
      const result = await sharingService.shareQuestions(questions, loop, {
        title: `${loop.videoTitle} - Practice Questions`,
        isPublic: true,
        sharedBy: userEmail || 'FluentFlow User'
      })

      setShareUrl(result.shareUrl)
      setExpirationMessage(result.expirationMessage || 'Expired in 4 hours')
      setSelectedGroup(null)
      setShowDialog(true)
      console.log('Questions shared successfully:', result.shareUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share questions')
      console.error('Share error:', err)
    } finally {
      setIsSharing(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return

    const success = await sharingService.copyToClipboard(shareUrl)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleOpenLink = () => {
    if (!shareUrl) return

    // For group sessions, the shareUrl now points directly to the group page
    // with proper tab navigation (?tab=sessions&highlight=[sessionId])
    console.log(`Opening ${shareMode} quiz:`, shareUrl)
    window.open(shareUrl, '_blank')
  }

  return (
    <>
      <div className="inline-flex rounded-md shadow-sm">
        {/* Main Share Button */}
        <button
          onClick={handleShare}
          disabled={isSharing || isGettingUserEmail || !questions || !loop}
          className={`inline-flex items-center gap-2 rounded-l-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          title={shareMode === 'group' ? 'Share to study group' : 'Share as public link'}
        >
          {isSharing || isGettingUserEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : shareMode === 'group' ? <Users className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          {isSharing ? 'Sharing...' : isGettingUserEmail ? 'Getting user info...' : shareMode === 'group' ? 'Share to Group' : 'Share'}
        </button>

        {/* Share Mode Toggle */}
        <div className="relative">
          <button
            onClick={() => setShareMode(shareMode === 'public' ? 'group' : 'public')}
            disabled={isSharing}
            className="inline-flex items-center rounded-r-md border-l border-blue-500 bg-blue-600 px-2 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            title={shareMode === 'public' ? 'Switch to group sharing' : 'Switch to public sharing'}
          >
            {shareMode === 'public' ? <Users className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Email Prompt Modal */}
      {showEmailPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Enter Your Email
                </h3>
                <button
                  onClick={() => setShowEmailPrompt(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  To share with your study groups, please enter the email address you used to sign up for FluentFlow:
                </p>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && userEmail.trim()) {
                      setShowEmailPrompt(false)
                      fetchUserGroups()
                    }
                  }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowEmailPrompt(false)}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (userEmail.trim()) {
                      setShowEmailPrompt(false)
                      fetchUserGroups()
                    }
                  }}
                  disabled={!userEmail.trim()}
                  className="flex-1 rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Selection Modal */}
      {showGroupSelection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Share to Study Group
                </h3>
                <button
                  onClick={() => setShowGroupSelection(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Select a group to share these practice questions with:
                </p>
              </div>

              {loadingGroups ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm text-gray-600">Loading groups...</span>
                </div>
              ) : userGroups.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">No study groups found</p>
                  <p className="text-xs text-gray-500">Create or join a group first</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {userGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handleShareToGroup(group)}
                      disabled={isSharing}
                      className="w-full rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{group.name}</span>
                            {group.is_private && (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                Private
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                            <Users className="h-3 w-3" />
                            <span>{group.member_count} members</span>
                            <span>•</span>
                            <span className="capitalize">{group.role}</span>
                          </div>
                        </div>
                        <div className="text-gray-400">
                          {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Dialog */}
      {showDialog && shareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedGroup ? 'Group Session Created!' : 'Questions Shared Successfully!'}
                </h3>
                <button
                  onClick={() => setShowDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Expiration Warning */}
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <span className="text-sm">⏰</span>
                  <span className="text-sm font-medium">{expirationMessage}</span>
                </div>
              </div>

              {selectedGroup && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center gap-2 text-green-800">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">Shared with {selectedGroup.name}</span>
                  </div>
                  <div className="mt-1 text-xs text-green-700">
                    {selectedGroup.member_count} members will be notified
                  </div>
                </div>
              )}

              <div className="mb-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-green-800">
                  <Check className="h-4 w-4" />
                  <span>
                    🎯 <strong>{questions?.questions.length} questions</strong> ready for practice
                  </span>
                </div>

                <div className="space-y-1 text-xs text-gray-600">
                  <p>📺 From: {loop?.videoTitle}</p>
                  {loop && (
                    <p>
                      ⏱️ Duration: {Math.floor(Math.round(loop.endTime - loop.startTime) / 60)}m{' '}
                      {Math.round(loop.endTime - loop.startTime) % 60}s
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Link
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleOpenLink}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Quiz
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-2 rounded-md border border-red-300 bg-red-100 p-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </>
  )
}

export default QuestionShareButton
