// import React, { useState, useEffect } from 'react'
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle
// } from './ui/card'
// import { Button } from './ui/button'
// import { Badge } from './ui/badge'
// import { Progress } from './ui/progress'
// import { Alert, AlertDescription } from './ui/alert'
// import {
//   Trash2,
//   Settings,
//   HardDrive,
//   Clock,
//   AlertTriangle,
//   CheckCircle,
//   Loader2,
//   RefreshCw,
//   Calendar,
//   FileAudio,
//   BarChart3
// } from 'lucide-react'
// import type {
//   StorageStats,
//   CleanupResult,
//   SavedLoop
// } from '../lib/types/fluent-flow-types'

// interface StorageManagementPanelProps {
//   onGetStorageStats: () => Promise<StorageStats>
//   onCleanupNow: () => Promise<CleanupResult>
//   onEmergencyCleanup: () => Promise<CleanupResult>
//   onGetScheduledCleanups: () => Promise<SavedLoop[]>
//   onBulkSetRetentionPolicy: (loopIds: string[], policy: 'temporary' | 'keep' | 'auto-cleanup') => Promise<number>
//   className?: string
// }

// export const StorageManagementPanel: React.FC<StorageManagementPanelProps> = ({
//   onGetStorageStats,
//   onCleanupNow,
//   onEmergencyCleanup,
//   onGetScheduledCleanups,
//   onBulkSetRetentionPolicy,
//   className = ""
// }) => {
//   const [storageStats, setStorageStats] = useState<StorageStats | null>(null)
//   const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null)
//   const [scheduledCleanups, setScheduledCleanups] = useState<SavedLoop[]>([])
//   const [isLoading, setIsLoading] = useState(true)
//   const [isCleaningUp, setIsCleaningUp] = useState(false)
//   const [showAdvanced, setShowAdvanced] = useState(false)

//   const MAX_STORAGE_MB = 500 // Should match the service constant

//   useEffect(() => {
//     loadData()
//   }, [])

//   const loadData = async () => {
//     setIsLoading(true)
//     try {
//       const [stats, scheduled] = await Promise.all([
//         onGetStorageStats(),
//         onGetScheduledCleanups()
//       ])
//       setStorageStats(stats)
//       setScheduledCleanups(scheduled)
//     } catch (error) {
//       console.error('Failed to load storage data:', error)
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   const handleCleanupNow = async () => {
//     setIsCleaningUp(true)
//     try {
//       const result = await onCleanupNow()
//       setCleanupResult(result)

//       // Refresh data after cleanup
//       await loadData()
//     } catch (error) {
//       console.error('Cleanup failed:', error)
//     } finally {
//       setIsCleaningUp(false)
//     }
//   }

//   const handleEmergencyCleanup = async () => {
//     const confirmed = confirm(
//       'Emergency cleanup will immediately remove all temporary and scheduled audio files. Continue?'
//     )
//     if (!confirmed) return

//     setIsCleaningUp(true)
//     try {
//       const result = await onEmergencyCleanup()
//       setCleanupResult(result)
//       await loadData()
//     } catch (error) {
//       console.error('Emergency cleanup failed:', error)
//     } finally {
//       setIsCleaningUp(false)
//     }
//   }

//   const handleBulkRetentionPolicy = async (policy: 'temporary' | 'keep' | 'auto-cleanup') => {
//     if (scheduledCleanups.length === 0) return

//     const loopIds = scheduledCleanups.map(loop => loop.id)
//     const confirmed = confirm(
//       `Set retention policy to "${policy}" for ${loopIds.length} loops?`
//     )
//     if (!confirmed) return

//     try {
//       await onBulkSetRetentionPolicy(loopIds, policy)
//       await loadData()
//     } catch (error) {
//       console.error('Failed to update retention policies:', error)
//     }
//   }

//   const formatFileSize = (mb: number): string => {
//     if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`
//     return `${mb.toFixed(1)} MB`
//   }

//   const formatDate = (date: Date): string => {
//     return new Intl.DateTimeFormat('en-US', {
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     }).format(date)
//   }

//   const getStorageUsagePercentage = (): number => {
//     if (!storageStats) return 0
//     return Math.min((storageStats.totalSizeMB / MAX_STORAGE_MB) * 100, 100)
//   }

//   const getStorageStatusColor = (): string => {
//     const percentage = getStorageUsagePercentage()
//     if (percentage < 50) return 'bg-green-500'
//     if (percentage < 80) return 'bg-yellow-500'
//     return 'bg-red-500'
//   }

//   const getStorageStatusIcon = () => {
//     const percentage = getStorageUsagePercentage()
//     if (percentage < 80) return <CheckCircle className="w-4 h-4 text-green-500" />
//     return <AlertTriangle className="w-4 h-4 text-red-500" />
//   }

//   if (isLoading) {
//     return (
//       <Card className={className}>
//         <CardContent className="flex items-center justify-center py-12">
//           <Loader2 className="w-6 h-6 animate-spin mr-2" />
//           <span>Loading storage information...</span>
//         </CardContent>
//       </Card>
//     )
//   }

//   if (!storageStats) {
//     return (
//       <Card className={className}>
//         <CardContent className="text-center py-12">
//           <p className="text-muted-foreground mb-4">Failed to load storage statistics</p>
//           <Button onClick={loadData} variant="outline">
//             <RefreshCw className="w-4 h-4 mr-2" />
//             Retry
//           </Button>
//         </CardContent>
//       </Card>
//     )
//   }

//   return (
//     <div className={`space-y-6 ${className}`}>
//       {/* Storage Overview */}
//       <Card>
//         <CardHeader className="flex flex-row items-center justify-between">
//           <div>
//             <CardTitle className="flex items-center gap-2">
//               <HardDrive className="w-5 h-5" />
//               Storage Overview
//             </CardTitle>
//             <CardDescription>Audio file storage management</CardDescription>
//           </div>
//           <div className="flex items-center gap-2">
//             {getStorageStatusIcon()}
//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={() => setShowAdvanced(!showAdvanced)}
//             >
//               <Settings className="w-4 h-4" />
//             </Button>
//           </div>
//         </CardHeader>

//         <CardContent className="space-y-6">
//           {/* Storage Usage */}
//           <div className="space-y-4">
//             <div className="flex items-center justify-between">
//               <span className="text-sm font-medium">Storage Used</span>
//               <span className="text-lg font-bold">
//                 {formatFileSize(storageStats.totalSizeMB)} / {formatFileSize(MAX_STORAGE_MB)}
//               </span>
//             </div>

//             <Progress
//               value={getStorageUsagePercentage()}
//               className="h-3"
//             />

//             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
//               <div>
//                 <p className="text-2xl font-bold text-blue-600">{storageStats.totalAudioFiles}</p>
//                 <p className="text-xs text-muted-foreground">Audio Files</p>
//               </div>
//               <div>
//                 <p className="text-2xl font-bold text-orange-600">{storageStats.scheduledForCleanup}</p>
//                 <p className="text-xs text-muted-foreground">Scheduled Cleanup</p>
//               </div>
//               <div>
//                 <p className="text-2xl font-bold text-purple-600">
//                   {getStorageUsagePercentage().toFixed(0)}%
//                 </p>
//                 <p className="text-xs text-muted-foreground">Usage</p>
//               </div>
//               <div>
//                 <p className="text-2xl font-bold text-green-600">
//                   {storageStats.oldestAudioDate ?
//                     Math.floor((Date.now() - storageStats.oldestAudioDate.getTime()) / (1000 * 60 * 60 * 24))
//                     : 0
//                   }
//                 </p>
//                 <p className="text-xs text-muted-foreground">Oldest (days)</p>
//               </div>
//             </div>
//           </div>

//           {/* Storage Actions */}
//           <div className="flex gap-2 flex-wrap">
//             <Button
//               onClick={handleCleanupNow}
//               disabled={isCleaningUp}
//               variant="outline"
//               className="flex-1 min-w-0"
//             >
//               {isCleaningUp ? (
//                 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
//               ) : (
//                 <Trash2 className="w-4 h-4 mr-2" />
//               )}
//               {isCleaningUp ? 'Cleaning...' : 'Cleanup Now'}
//             </Button>

//             <Button onClick={loadData} variant="ghost">
//               <RefreshCw className="w-4 h-4" />
//             </Button>
//           </div>

//           {/* Cleanup Result */}
//           {cleanupResult && (
//             <Alert>
//               <CheckCircle className="w-4 h-4" />
//               <AlertDescription>
//                 Cleanup completed: {cleanupResult.cleanedCount} files removed, {' '}
//                 {formatFileSize(cleanupResult.spaceFreedMB)} freed
//                 {cleanupResult.errors.length > 0 && (
//                   <span className="text-red-600">
//                     {' '}({cleanupResult.errors.length} errors)
//                   </span>
//                 )}
//               </AlertDescription>
//             </Alert>
//           )}
//         </CardContent>
//       </Card>

//       {/* Advanced Management */}
//       {showAdvanced && (
//         <>
//           {/* Largest Files */}
//           {storageStats.largestFiles.length > 0 && (
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                   <BarChart3 className="w-5 h-5" />
//                   Largest Files
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-3">
//                   {storageStats.largestFiles.map((file, index) => (
//                     <div key={file.loopId} className="flex items-center justify-between p-3 border rounded-lg">
//                       <div className="flex-1">
//                         <p className="font-medium text-sm">{file.title}</p>
//                         <p className="text-xs text-muted-foreground">
//                           Created: {formatDate(file.createdAt)}
//                         </p>
//                       </div>
//                       <div className="text-right">
//                         <Badge variant="secondary">
//                           {formatFileSize(file.sizeMB)}
//                         </Badge>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>
//           )}

//           {/* Scheduled Cleanups */}
//           {scheduledCleanups.length > 0 && (
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                   <Clock className="w-5 h-5" />
//                   Scheduled for Cleanup ({scheduledCleanups.length})
//                 </CardTitle>
//                 <CardDescription>
//                   Files that will be cleaned up automatically
//                 </CardDescription>
//               </CardHeader>
//               <CardContent className="space-y-4">
//                 <div className="flex gap-2 flex-wrap">
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     onClick={() => handleBulkRetentionPolicy('keep')}
//                   >
//                     Keep All
//                   </Button>
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     onClick={() => handleBulkRetentionPolicy('temporary')}
//                   >
//                     Mark Temporary
//                   </Button>
//                   <Button
//                     variant="destructive"
//                     size="sm"
//                     onClick={handleEmergencyCleanup}
//                     disabled={isCleaningUp}
//                   >
//                     {isCleaningUp ? (
//                       <Loader2 className="w-4 h-4 mr-2 animate-spin" />
//                     ) : (
//                       <AlertTriangle className="w-4 h-4 mr-2" />
//                     )}
//                     Emergency Cleanup
//                   </Button>
//                 </div>

//                 <div className="space-y-2 max-h-64 overflow-y-auto">
//                   {scheduledCleanups.map(loop => (
//                     <div key={loop.id} className="flex items-center justify-between p-2 border rounded text-sm">
//                       <div className="flex-1">
//                         <p className="font-medium">{loop.title}</p>
//                         <p className="text-xs text-muted-foreground">
//                           {loop.videoTitle}
//                         </p>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         {loop.audioSize && (
//                           <Badge variant="secondary">
//                             {formatFileSize(loop.audioSize / (1024 * 1024))}
//                           </Badge>
//                         )}
//                         {loop.cleanupScheduledAt && (
//                           <Badge variant="outline">
//                             <Calendar className="w-3 h-3 mr-1" />
//                             {formatDate(loop.cleanupScheduledAt)}
//                           </Badge>
//                         )}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>
//           )}

//           {/* Storage Settings */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Settings className="w-5 h-5" />
//                 Storage Settings
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="grid grid-cols-2 gap-4 text-sm">
//                 <div>
//                   <p className="font-medium">Default Retention</p>
//                   <p className="text-muted-foreground">7 days after questions generated</p>
//                 </div>
//                 <div>
//                   <p className="font-medium">Max Storage</p>
//                   <p className="text-muted-foreground">{MAX_STORAGE_MB}MB total limit</p>
//                 </div>
//                 <div>
//                   <p className="font-medium">Auto Cleanup</p>
//                   <p className="text-muted-foreground">Every 6 hours</p>
//                 </div>
//                 <div>
//                   <p className="font-medium">Emergency Threshold</p>
//                   <p className="text-muted-foreground">80% of max storage</p>
//                 </div>
//               </div>

//               {getStorageUsagePercentage() > 80 && (
//                 <Alert>
//                   <AlertTriangle className="w-4 h-4" />
//                   <AlertDescription>
//                     <strong>Storage Warning:</strong> You're using over 80% of available storage.
//                     Consider running cleanup or adjusting retention policies.
//                   </AlertDescription>
//                 </Alert>
//               )}
//             </CardContent>
//           </Card>
//         </>
//       )}
//     </div>
//   )
// }

// export default StorageManagementPanel
