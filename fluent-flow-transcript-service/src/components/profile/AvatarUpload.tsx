'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAvatarUpload } from '@/hooks/profile/useAvatarUpload'
import { useAuth } from '@/contexts/AuthContext'

interface AvatarUploadProps {
  currentAvatar?: string
  username?: string
  onAvatarChange?: (url: string) => void
}

export function AvatarUpload({ currentAvatar, username, onAvatarChange }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { refreshAuth } = useAuth()
  
  const { uploadAvatar, removeAvatar, isLoading, uploadProgress } = useAvatarUpload({
    onSuccess: (url) => {
      setSuccess(url ? 'Avatar uploaded successfully!' : 'Avatar removed successfully!')
      setError('')
      onAvatarChange?.(url)
      refreshAuth() // Refresh auth context to get updated user data
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    },
    onError: (error) => {
      setError(error)
      setSuccess('')
    }
  })

  const handleFileSelect = (file: File) => {
    if (file) {
      uploadAvatar(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleRemoveAvatar = async () => {
    await removeAvatar()
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-700">
            {success}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col items-center space-y-4">
        {/* Avatar Display */}
        <div className="relative">
          <div className="h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-1 shadow-xl">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-4xl font-bold text-indigo-600">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt="Profile"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                username?.charAt(0).toUpperCase() || '?'
              )}
            </div>
          </div>
          
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <div className="text-center text-white">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1" />
                <div className="text-xs">{uploadProgress}%</div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Area */}
        <div
          className={`relative w-full max-w-sm rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
            dragOver
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50'
          } ${isLoading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={openFileDialog}
        >
          <div className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
              <Upload className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Upload new avatar</p>
              <p className="text-xs text-gray-500 mt-1">
                Drop an image here or click to select
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG up to 5MB
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            disabled={isLoading}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openFileDialog}
            disabled={isLoading}
            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            <Camera className="mr-2 h-4 w-4" />
            Change Avatar
          </Button>

          {currentAvatar && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveAvatar}
              disabled={isLoading}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}