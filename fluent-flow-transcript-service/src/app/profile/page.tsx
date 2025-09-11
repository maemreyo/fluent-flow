'use client'

import {
  Calendar,
  Camera,
  Edit3,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Save,
  Settings,
  Target,
  X
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ComingSoon } from '@/components/ui/coming-soon'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AuthenticatedPage } from '../../components/pages/shared/AuthenticatedPage'
import { PageHeader } from '../../components/pages/shared/PageHeader'
import { useProfile } from '../../hooks/profile/useProfile'
import { useProfileStats } from '../../hooks/profile/useProfileStats'

export default function ProfilePage() {
  const {
    profileData,
    editData,
    isEditing,
    isLoading,
    handleEdit,
    handleCancel,
    handleSave,
    updateEditData
  } = useProfile()

  const { stats } = useProfileStats()

  return (
    <AuthenticatedPage
      title="Profile"
      subtitle="Manage your account settings and view your learning progress"
    >
      <PageHeader
        title="Profile"
        subtitle="Manage your account and track your learning journey"
        actions={[
          {
            label: isEditing ? 'Cancel' : 'Edit Profile',
            action: isEditing ? handleCancel : handleEdit,
            icon: isEditing ? X : Edit3,
            variant: isEditing ? 'secondary' : 'primary',
            disabled: isLoading
          },
          ...(isEditing
            ? [
                {
                  label: isLoading ? 'Saving...' : 'Save Changes',
                  action: handleSave,
                  icon: isLoading ? Loader2 : Save,
                  variant: 'primary' as const,
                  disabled: isLoading
                }
              ]
            : [])
        ]}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card className="border-white/20 bg-white/90 backdrop-blur-sm">
            <CardContent className="p-8">
              {/* Avatar Section */}
              <div className="relative mb-6 flex justify-center">
                <div className="relative">
                  <div className="h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-1 shadow-xl">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-4xl font-bold text-indigo-600">
                      {profileData.avatar ? (
                        <img
                          src={profileData.avatar}
                          alt="Profile"
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        profileData.username.charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <button className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transition-transform hover:scale-110">
                      <Camera className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div className="text-center">
                {isEditing ? (
                  <div className="space-y-4">
                    <Input
                      type="text"
                      value={editData.username}
                      onChange={e => updateEditData('username', e.target.value)}
                      className="text-center text-xl font-bold"
                      placeholder="Username"
                      disabled={isLoading}
                    />
                    <Input
                      type="text"
                      value={editData.fullName}
                      onChange={e => updateEditData('fullName', e.target.value)}
                      className="text-center"
                      placeholder="Full Name"
                      disabled={isLoading}
                    />
                  </div>
                ) : (
                  <>
                    <h1 className="mb-1 text-2xl font-bold text-gray-900">
                      {profileData.username}
                    </h1>
                    {profileData.fullName && (
                      <p className="mb-4 text-gray-600">{profileData.fullName}</p>
                    )}
                  </>
                )}
              </div>

              {/* Contact Info */}
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-indigo-500" />
                  <span>{profileData.email}</span>
                </div>

                {(profileData.location || isEditing) && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 text-indigo-500" />
                    {isEditing ? (
                      <Input
                        type="text"
                        value={editData.location}
                        onChange={e => updateEditData('location', e.target.value)}
                        className="flex-1 text-sm"
                        placeholder="Location"
                        disabled={isLoading}
                      />
                    ) : (
                      <span>{profileData.location}</span>
                    )}
                  </div>
                )}

                {(profileData.website || isEditing) && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Globe className="h-4 w-4 text-indigo-500" />
                    {isEditing ? (
                      <Input
                        type="url"
                        value={editData.website}
                        onChange={e => updateEditData('website', e.target.value)}
                        className="flex-1 text-sm"
                        placeholder="Website"
                        disabled={isLoading}
                      />
                    ) : (
                      <a
                        href={profileData.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        {profileData.website}
                      </a>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  <span>Joined {profileData.joinedDate}</span>
                </div>
              </div>

              {/* Bio Section */}
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Bio</h3>
                {isEditing ? (
                  <Textarea
                    value={editData.bio}
                    onChange={e => updateEditData('bio', e.target.value)}
                    className="resize-none"
                    rows={4}
                    placeholder="Tell us about yourself..."
                    disabled={isLoading}
                  />
                ) : (
                  <p className="text-sm leading-relaxed text-gray-600">
                    {profileData.bio || 'No bio available'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-8 lg:col-span-2">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              const isComingSoon = stat.value === '?'

              return (
                <Card
                  key={index}
                  className="relative border-white/20 bg-white/90 backdrop-blur-sm transition-transform hover:scale-105"
                >
                  <CardContent className="p-6">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} mb-4 shadow-lg`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="mb-1 text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </CardContent>
                  {isComingSoon && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl border-2 border-dashed border-indigo-200 bg-white/80 backdrop-blur-sm">
                      <ComingSoon
                        title="Coming Soon"
                        description="Feature in development"
                        size="sm"
                      />
                    </div>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Learning Progress */}
          <Card className="relative border-white/20 bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Target className="h-5 w-5 text-white" />
                </div>
                Learning Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Overlay for coming soon */}
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-indigo-200 bg-white/80 backdrop-blur-sm">
                <ComingSoon
                  title="Learning Analytics"
                  description="Detailed progress tracking and insights coming soon"
                  size="sm"
                />
              </div>

              {/* Placeholder content (hidden by overlay) */}
              <div className="grid grid-cols-1 gap-6 opacity-30 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-xl bg-indigo-50/50 p-3">
                      <div className="h-4 w-4 rounded bg-indigo-300" />
                      <span className="text-sm text-gray-500">Sample activity item</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        2h ago
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700">Achievements</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-xl bg-yellow-50/50 p-3">
                      <div className="h-4 w-4 rounded bg-yellow-300" />
                      <span className="text-sm text-gray-500">Sample achievement</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Settings Preview */}
          <Card className="relative border-white/20 bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gray-500 to-gray-700">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                Account Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Overlay for coming soon */}
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-indigo-200 bg-white/80 backdrop-blur-sm">
                <ComingSoon
                  title="Advanced Settings"
                  description="Comprehensive account management options coming soon"
                  size="sm"
                />
              </div>

              {/* Placeholder content (hidden by overlay) */}
              <div className="grid grid-cols-1 gap-4 opacity-30 md:grid-cols-2">
                <div className="rounded-xl border-2 border-gray-200 p-4">
                  <h3 className="mb-2 font-semibold text-gray-500">Notifications</h3>
                  <p className="text-sm text-gray-400">Manage email and app notifications</p>
                </div>
                <div className="rounded-xl border-2 border-gray-200 p-4">
                  <h3 className="mb-2 font-semibold text-gray-500">Privacy</h3>
                  <p className="text-sm text-gray-400">Control your privacy settings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedPage>
  )
}
