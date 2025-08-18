# Data Synchronization Patterns for Chrome Extensions

Hướng dẫn chi tiết về các patterns đồng bộ dữ liệu giữa Chrome Extension, Backend Services, và Dashboard.

## 1. Tổng quan về Data Sync Architecture

### 1.1 Multi-layer Synchronization
```
┌─────────────────────────────────────────────────────────┐
│ Chrome Extension (Client)                               │
│ ├── Local Storage (Chrome Storage API)                 │
│ ├── Memory Cache (Runtime)                             │
│ ├── Offline Queue (IndexedDB)                          │
│ └── Sync Manager Service                               │
├─────────────────────────────────────────────────────────┤
│ Backend API (Proxy/Coordination Layer)                 │
│ ├── Rate Limiting & Authentication                     │
│ ├── Data Validation & Transformation                   │
│ ├── External API Integration                           │
│ └── Sync Coordination                                  │
├─────────────────────────────────────────────────────────┤
│ Supabase (Source of Truth)                            │
│ ├── PostgreSQL Database                               │
│ ├── Real-time Subscriptions                           │
│ ├── Row Level Security                                │
│ └── Conflict Resolution                               │
├─────────────────────────────────────────────────────────┤
│ Dashboard (Web Interface)                              │
│ ├── React Query Cache                                 │
│ ├── Real-time Updates                                 │
│ ├── Optimistic Updates                                │
│ └── Conflict Resolution UI                            │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Sync Flow Patterns
```
1. Extension Action → Local Update → Background Sync → Server Update
2. Server Change → Real-time Push → Extension Update → UI Refresh  
3. Offline Action → Queue → Online Detection → Batch Sync
4. Conflict → Detection → Resolution Strategy → Final State
```

## 2. Extension-side Synchronization

### 2.1 Sync Manager Service
```typescript
// lib/sync/sync-manager.ts
export interface SyncOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: 'vocabulary' | 'analytics' | 'settings'
  data: any
  timestamp: number
  retryCount: number
  priority: 'high' | 'medium' | 'low'
}

export class SyncManager {
  private syncQueue: SyncOperation[] = []
  private isOnline = navigator.onLine
  private isSyncing = false
  private syncIntervalId?: number

  constructor() {
    this.initializeEventListeners()
    this.startPeriodicSync()
    this.loadPendingOperations()
  }

  private initializeEventListeners() {
    // Network status changes
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))

    // Extension lifecycle
    chrome.runtime.onStartup?.addListener(this.handleStartup.bind(this))
    chrome.runtime.onSuspend?.addListener(this.handleSuspend.bind(this))
  }

  async queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>) {
    const syncOp: SyncOperation = {
      id: generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      ...operation
    }

    this.syncQueue.push(syncOp)
    await this.persistSyncQueue()

    // Try immediate sync if online and not busy
    if (this.isOnline && !this.isSyncing) {
      await this.processSyncQueue()
    }
  }

  private async processSyncQueue() {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) {
      return
    }

    this.isSyncing = true

    try {
      // Sort by priority and timestamp
      const sortedQueue = this.syncQueue.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp
      })

      const results = await Promise.allSettled(
        sortedQueue.map(operation => this.executeOperation(operation))
      )

      // Process results
      const failedOperations: SyncOperation[] = []
      
      results.forEach((result, index) => {
        const operation = sortedQueue[index]
        
        if (result.status === 'rejected') {
          console.error(`Sync operation failed:`, operation, result.reason)
          
          // Retry logic
          if (operation.retryCount < 3) {
            operation.retryCount++
            operation.timestamp = Date.now() + (operation.retryCount * 1000) // Exponential backoff
            failedOperations.push(operation)
          } else {
            console.error('Operation failed permanently:', operation)
            this.handlePermanentFailure(operation)
          }
        }
      })

      // Update queue with failed operations only
      this.syncQueue = failedOperations
      await this.persistSyncQueue()

    } catch (error) {
      console.error('Sync queue processing failed:', error)
    } finally {
      this.isSyncing = false
    }
  }

  private async executeOperation(operation: SyncOperation): Promise<void> {
    switch (operation.entity) {
      case 'vocabulary':
        return this.syncVocabularyOperation(operation)
      case 'analytics':
        return this.syncAnalyticsOperation(operation)
      case 'settings':
        return this.syncSettingsOperation(operation)
      default:
        throw new Error(`Unknown entity type: ${operation.entity}`)
    }
  }

  private async syncVocabularyOperation(operation: SyncOperation): Promise<void> {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    switch (operation.type) {
      case 'create':
        await this.createVocabularyEntry(user.id, operation.data)
        break
      case 'update':
        await this.updateVocabularyEntry(user.id, operation.data)
        break
      case 'delete':
        await this.deleteVocabularyEntry(user.id, operation.data.id)
        break
    }
  }

  private async handleOnline() {
    this.isOnline = true
    console.log('Network online - processing sync queue')
    await this.processSyncQueue()
  }

  private async handleOffline() {
    this.isOnline = false
    console.log('Network offline - queuing operations')
  }

  private startPeriodicSync() {
    // Sync every 5 minutes when online
    this.syncIntervalId = window.setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.processSyncQueue()
      }
    }, 5 * 60 * 1000)
  }

  async forcSync(): Promise<void> {
    await this.processSyncQueue()
  }

  private async persistSyncQueue() {
    await chrome.storage.local.set({ 
      syncQueue: this.syncQueue.map(op => ({
        ...op,
        // Don't persist large data objects
        data: operation.entity === 'vocabulary' ? { id: op.data.id } : op.data
      }))
    })
  }

  private async loadPendingOperations() {
    const stored = await chrome.storage.local.get('syncQueue')
    if (stored.syncQueue) {
      this.syncQueue = stored.syncQueue
    }
  }
}
```

### 2.2 Optimistic Updates Pattern
```typescript
// lib/sync/optimistic-updates.ts
export class OptimisticUpdateManager {
  private pendingUpdates = new Map<string, any>()

  async executeWithOptimisticUpdate<T>(
    key: string,
    optimisticData: T,
    serverOperation: () => Promise<T>,
    rollbackOperation?: () => Promise<void>
  ): Promise<T> {
    // 1. Apply optimistic update immediately
    this.pendingUpdates.set(key, optimisticData)
    this.notifyUIUpdate(key, optimisticData)

    try {
      // 2. Execute server operation
      const serverResult = await serverOperation()
      
      // 3. Replace optimistic data with server result
      this.pendingUpdates.delete(key)
      this.notifyUIUpdate(key, serverResult)
      
      return serverResult

    } catch (error) {
      // 4. Rollback on failure
      this.pendingUpdates.delete(key)
      
      if (rollbackOperation) {
        await rollbackOperation()
      }
      
      this.notifyUIError(key, error)
      throw error
    }
  }

  private notifyUIUpdate(key: string, data: any) {
    chrome.runtime.sendMessage({
      type: 'OPTIMISTIC_UPDATE',
      key,
      data
    }).catch(() => {
      // UI might not be available, that's ok
    })
  }

  private notifyUIError(key: string, error: any) {
    chrome.runtime.sendMessage({
      type: 'OPTIMISTIC_ERROR',
      key,
      error: error.message
    }).catch(() => {
      // UI might not be available, that's ok
    })
  }

  isPending(key: string): boolean {
    return this.pendingUpdates.has(key)
  }

  getPendingData(key: string): any {
    return this.pendingUpdates.get(key)
  }
}

// Usage example
const optimisticManager = new OptimisticUpdateManager()

async function saveWordOptimistically(wordData: WordData) {
  const key = `word:${wordData.term}`
  
  return optimisticManager.executeWithOptimisticUpdate(
    key,
    { ...wordData, status: 'saving', id: 'temp-' + Date.now() },
    async () => {
      // Server operation
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_TO_NOTION',
        wordData
      })
      
      if (!response.success) {
        throw new Error(response.error)
      }
      
      return { ...wordData, ...response.data, status: 'saved' }
    },
    async () => {
      // Rollback operation
      await removeWordFromLocalStorage(wordData.term)
    }
  )
}
```

### 2.3 Conflict Resolution Strategies
```typescript
// lib/sync/conflict-resolution.ts
export interface ConflictData<T> {
  localVersion: T
  serverVersion: T
  lastSyncTimestamp: number
  entityId: string
}

export type ConflictResolutionStrategy = 
  | 'server-wins'
  | 'client-wins' 
  | 'merge-strategy'
  | 'user-decides'

export class ConflictResolver {
  async resolveConflict<T>(
    conflict: ConflictData<T>,
    strategy: ConflictResolutionStrategy = 'server-wins'
  ): Promise<T> {
    switch (strategy) {
      case 'server-wins':
        return this.serverWinsStrategy(conflict)
        
      case 'client-wins':
        return this.clientWinsStrategy(conflict)
        
      case 'merge-strategy':
        return this.mergeStrategy(conflict)
        
      case 'user-decides':
        return this.userDecidesStrategy(conflict)
        
      default:
        throw new Error(`Unknown strategy: ${strategy}`)
    }
  }

  private serverWinsStrategy<T>(conflict: ConflictData<T>): T {
    console.log('Conflict resolved: Server wins', conflict.entityId)
    return conflict.serverVersion
  }

  private clientWinsStrategy<T>(conflict: ConflictData<T>): T {
    console.log('Conflict resolved: Client wins', conflict.entityId)
    return conflict.localVersion
  }

  private mergeStrategy<T>(conflict: ConflictData<T>): T {
    // Smart merge logic for vocabulary data
    if (this.isVocabularyData(conflict.localVersion)) {
      return this.mergeVocabularyData(conflict as any) as T
    }
    
    // Default to server wins for unknown types
    return conflict.serverVersion
  }

  private async userDecidesStrategy<T>(conflict: ConflictData<T>): Promise<T> {
    // Show conflict resolution UI
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'SHOW_CONFLICT_RESOLUTION',
        conflict
      }, (response) => {
        resolve(response.resolvedData)
      })
    })
  }

  private mergeVocabularyData(conflict: ConflictData<VocabularyData>): VocabularyData {
    const local = conflict.localVersion
    const server = conflict.serverVersion
    
    // Merge strategy for vocabulary:
    // - Use latest definition if different
    // - Merge tags and categories
    // - Keep highest mastery level
    // - Combine example sentences
    
    return {
      ...server, // Base on server version
      definition: local.updatedAt > server.updatedAt ? local.definition : server.definition,
      tags: [...new Set([...local.tags, ...server.tags])],
      categories: [...new Set([...local.categories, ...server.categories])],
      masteryLevel: Math.max(local.masteryLevel, server.masteryLevel),
      exampleSentences: [
        ...local.exampleSentences,
        ...server.exampleSentences.filter(s => 
          !local.exampleSentences.some(ls => ls.text === s.text)
        )
      ],
      lastReviewedAt: Math.max(local.lastReviewedAt, server.lastReviewedAt),
      updatedAt: Math.max(local.updatedAt, server.updatedAt)
    }
  }

  private isVocabularyData(data: any): data is VocabularyData {
    return data && typeof data.term === 'string' && typeof data.definition === 'string'
  }
}
```

## 3. Server-side Synchronization

### 3.1 Real-time Event System
```typescript
// lib/sync/realtime-sync.ts (Server-side)
import { createClient } from '@supabase/supabase-js'

export class RealtimeSync {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  async initializeRealtimeChannels() {
    // Listen for vocabulary changes
    this.supabase
      .channel('vocabulary-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vocabulary_analytics'
      }, this.handleVocabularyChange.bind(this))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'learning_sessions'
      }, this.handleLearningSessionChange.bind(this))
      .subscribe()

    // Listen for Notion sync events
    this.supabase
      .channel('notion-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notion_integrations'
      }, this.handleNotionChange.bind(this))
      .subscribe()
  }

  private async handleVocabularyChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload

    // Notify connected extensions
    await this.notifyExtensions(newRecord.user_id, {
      type: 'VOCABULARY_CHANGED',
      eventType,
      data: newRecord,
      oldData: oldRecord
    })

    // Update derived analytics
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      await this.updateVocabularyAnalytics(newRecord.user_id)
    }
  }

  private async handleLearningSessionChange(payload: any) {
    const { eventType, new: newRecord } = payload

    if (eventType === 'INSERT') {
      // Update user learning streak
      await this.updateLearningStreak(newRecord.user_id)
      
      // Notify dashboard for real-time stats
      await this.notifyDashboard(newRecord.user_id, {
        type: 'NEW_LEARNING_SESSION',
        data: newRecord
      })
    }
  }

  private async notifyExtensions(userId: string, message: any) {
    // Store notification for extension polling
    await this.supabase
      .from('extension_notifications')
      .insert({
        user_id: userId,
        message,
        created_at: new Date().toISOString()
      })

    // Could also use WebSockets or Server-Sent Events
  }

  private async notifyDashboard(userId: string, message: any) {
    // Real-time broadcast to dashboard via Supabase channels
    await this.supabase
      .channel(`dashboard:${userId}`)
      .send({
        type: 'broadcast',
        event: 'data-changed',
        payload: message
      })
  }
}
```

### 3.2 Batch Sync API
```typescript
// app/api/sync/batch/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

interface BatchSyncRequest {
  operations: SyncOperation[]
  lastSyncTimestamp?: number
  clientVersion: string
}

interface BatchSyncResponse {
  results: SyncResult[]
  conflicts: ConflictData<any>[]
  serverTimestamp: number
  needsFullSync: boolean
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const userId = await getCurrentUserId(request)
    const body: BatchSyncRequest = await request.json()

    // Validate request
    if (!body.operations || !Array.isArray(body.operations)) {
      return NextResponse.json(
        { error: 'Invalid operations array' },
        { status: 400 }
      )
    }

    const results: SyncResult[] = []
    const conflicts: ConflictData<any>[] = []

    // Check if full sync is needed
    const needsFullSync = await this.checkFullSyncRequired(
      userId, 
      body.lastSyncTimestamp
    )

    if (needsFullSync) {
      const fullSyncData = await this.getFullSyncData(userId)
      return NextResponse.json({
        results: [],
        conflicts: [],
        serverTimestamp: Date.now(),
        needsFullSync: true,
        fullSyncData
      })
    }

    // Process operations in transaction
    await supabase.rpc('begin_sync_transaction')

    try {
      for (const operation of body.operations) {
        const result = await this.processOperation(supabase, userId, operation)
        
        if (result.conflict) {
          conflicts.push(result.conflict)
        } else {
          results.push(result)
        }
      }

      await supabase.rpc('commit_sync_transaction')
    } catch (error) {
      await supabase.rpc('rollback_sync_transaction')
      throw error
    }

    // Get server changes since last sync
    const serverChanges = await this.getServerChanges(
      userId,
      body.lastSyncTimestamp
    )

    return NextResponse.json({
      results,
      conflicts,
      serverChanges,
      serverTimestamp: Date.now(),
      needsFullSync: false
    })

  } catch (error) {
    console.error('Batch sync error:', error)
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    )
  }
}

async function processOperation(
  supabase: any, 
  userId: string, 
  operation: SyncOperation
): Promise<SyncResult> {
  try {
    // Check for conflicts
    const existingData = await this.getExistingData(
      supabase, 
      operation.entity, 
      operation.data.id
    )

    if (existingData && this.hasConflict(existingData, operation)) {
      return {
        operationId: operation.id,
        success: false,
        conflict: {
          localVersion: operation.data,
          serverVersion: existingData,
          lastSyncTimestamp: operation.timestamp,
          entityId: operation.data.id
        }
      }
    }

    // Execute operation
    let result
    switch (operation.type) {
      case 'create':
        result = await this.executeCreate(supabase, userId, operation)
        break
      case 'update':
        result = await this.executeUpdate(supabase, userId, operation)
        break
      case 'delete':
        result = await this.executeDelete(supabase, userId, operation)
        break
      default:
        throw new Error(`Unknown operation type: ${operation.type}`)
    }

    return {
      operationId: operation.id,
      success: true,
      data: result
    }

  } catch (error) {
    return {
      operationId: operation.id,
      success: false,
      error: error.message
    }
  }
}
```

### 3.3 Change Detection System
```typescript
// lib/sync/change-detection.ts
export class ChangeDetectionSystem {
  private supabase = createServerSupabaseClient()

  async getChangesForUser(
    userId: string, 
    since: number,
    entityTypes?: string[]
  ): Promise<ChangeSet> {
    const changes: ChangeSet = {
      vocabulary: [],
      analytics: [],
      sessions: [],
      settings: []
    }

    const sinceDate = new Date(since).toISOString()

    // Get vocabulary changes
    if (!entityTypes || entityTypes.includes('vocabulary')) {
      const { data: vocabChanges } = await this.supabase
        .from('vocabulary_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('updated_at', sinceDate)
        .order('updated_at', { ascending: true })

      changes.vocabulary = vocabChanges || []
    }

    // Get learning session changes
    if (!entityTypes || entityTypes.includes('sessions')) {
      const { data: sessionChanges } = await this.supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', sinceDate)
        .order('created_at', { ascending: true })

      changes.sessions = sessionChanges || []
    }

    // Get analytics changes
    if (!entityTypes || entityTypes.includes('analytics')) {
      const { data: analyticsChanges } = await this.supabase
        .from('vocabulary_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('last_calculated', sinceDate)

      changes.analytics = analyticsChanges || []
    }

    return changes
  }

  async markChangesSynced(userId: string, changeIds: string[]) {
    // Mark changes as synced to avoid resending
    await this.supabase
      .from('sync_status')
      .upsert({
        user_id: userId,
        last_sync_at: new Date().toISOString(),
        synced_change_ids: changeIds
      })
  }

  private async createChangeLog(
    userId: string,
    entityType: string,
    entityId: string,
    changeType: 'create' | 'update' | 'delete',
    data: any
  ) {
    await this.supabase
      .from('change_log')
      .insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        change_type: changeType,
        change_data: data,
        created_at: new Date().toISOString()
      })
  }
}
```

## 4. Dashboard Real-time Updates

### 4.1 React Query với Real-time
```typescript
// hooks/use-realtime-vocabulary.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useRealtimeVocabularyData(userId: string) {
  const queryClient = useQueryClient()

  // Base query
  const vocabularyQuery = useQuery({
    queryKey: ['vocabulary', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vocabulary_analytics')
        .select(`
          *,
          learning_sessions (
            id,
            session_type,
            words_processed,
            success_rate,
            created_at
          )
        `)
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data
    },
    enabled: !!userId
  })

  // Real-time subscription
  useEffect(() => {
    if (!userId) return

    const subscription = supabase
      .channel(`vocabulary-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vocabulary_analytics',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('Vocabulary change:', payload)
        
        // Optimistic update
        queryClient.setQueryData(['vocabulary', userId], (oldData: any) => {
          if (!oldData) return payload.new

          switch (payload.eventType) {
            case 'UPDATE':
              return { ...oldData, ...payload.new }
            case 'DELETE':
              return null
            default:
              return payload.new
          }
        })

        // Invalidate to refetch full data
        queryClient.invalidateQueries({ 
          queryKey: ['vocabulary', userId] 
        })
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public', 
        table: 'learning_sessions',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('New learning session:', payload)
        
        // Update session list
        queryClient.setQueryData(['vocabulary', userId], (oldData: any) => {
          if (!oldData) return oldData

          return {
            ...oldData,
            learning_sessions: [
              payload.new,
              ...(oldData.learning_sessions || [])
            ]
          }
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [userId, queryClient])

  return vocabularyQuery
}
```

### 4.2 Optimistic Updates trong Dashboard
```typescript
// hooks/use-optimistic-vocabulary.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useOptimisticVocabularyUpdate(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: Partial<VocabularyAnalytics>) => {
      const { data, error } = await supabase
        .from('vocabulary_analytics')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    },

    // Optimistic update
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['vocabulary', userId])

      // Snapshot previous value
      const previousData = queryClient.getQueryData(['vocabulary', userId])

      // Optimistically update
      queryClient.setQueryData(['vocabulary', userId], (old: any) => ({
        ...old,
        ...updates,
        updated_at: new Date().toISOString()
      }))

      return { previousData }
    },

    // Rollback on error
    onError: (err, updates, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['vocabulary', userId], context.previousData)
      }
    },

    // Always refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries(['vocabulary', userId])
    }
  })
}
```

## 5. Conflict Resolution UI

### 5.1 Conflict Resolution Dialog
```typescript
// components/sync/ConflictResolutionDialog.tsx
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConflictResolutionDialogProps {
  isOpen: boolean
  onClose: () => void
  conflict: ConflictData<any>
  onResolve: (resolution: any) => void
}

export function ConflictResolutionDialog({
  isOpen,
  onClose,
  conflict,
  onResolve
}: ConflictResolutionDialogProps) {
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'server' | 'merge'>('server')
  const [customMerge, setCustomMerge] = useState<any>(null)

  const handleResolve = () => {
    let resolvedData

    switch (selectedResolution) {
      case 'local':
        resolvedData = conflict.localVersion
        break
      case 'server':
        resolvedData = conflict.serverVersion
        break
      case 'merge':
        resolvedData = customMerge || mergeData(conflict.localVersion, conflict.serverVersion)
        break
    }

    onResolve(resolvedData)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Resolve Data Conflict</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Local Version</h3>
            <div className="border rounded p-3 bg-blue-50">
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(conflict.localVersion, null, 2)}
              </pre>
              <div className="mt-2 text-xs text-gray-500">
                Modified locally
              </div>
            </div>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="local"
                checked={selectedResolution === 'local'}
                onChange={(e) => setSelectedResolution('local')}
              />
              <span>Use local version</span>
            </label>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Server Version</h3>
            <div className="border rounded p-3 bg-green-50">
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(conflict.serverVersion, null, 2)}
              </pre>
              <div className="mt-2 text-xs text-gray-500">
                Modified on server
              </div>
            </div>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="server"
                checked={selectedResolution === 'server'}
                onChange={(e) => setSelectedResolution('server')}
              />
              <span>Use server version</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              value="merge"
              checked={selectedResolution === 'merge'}
              onChange={(e) => setSelectedResolution('merge')}
            />
            <span>Merge both versions</span>
          </label>
          
          {selectedResolution === 'merge' && (
            <MergeEditor
              localData={conflict.localVersion}
              serverData={conflict.serverVersion}
              onMerge={setCustomMerge}
            />
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleResolve}>
            Resolve Conflict
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

## 6. Performance Optimization

### 6.1 Delta Sync Pattern
```typescript
// lib/sync/delta-sync.ts
export class DeltaSync {
  async generateDelta(
    userId: string,
    entityType: string,
    lastSyncTimestamp: number
  ): Promise<DeltaChange[]> {
    const changes: DeltaChange[] = []

    // Get changes since last sync
    const { data: changedRecords } = await supabase
      .from(entityType)
      .select('*')
      .eq('user_id', userId)
      .gte('updated_at', new Date(lastSyncTimestamp).toISOString())

    // Get deleted records from change log
    const { data: deletedRecords } = await supabase
      .from('change_log')
      .select('entity_id, change_data')
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('change_type', 'delete')
      .gte('created_at', new Date(lastSyncTimestamp).toISOString())

    // Process changed records
    for (const record of changedRecords || []) {
      changes.push({
        type: 'upsert',
        entityId: record.id,
        data: record,
        timestamp: new Date(record.updated_at).getTime()
      })
    }

    // Process deleted records
    for (const deletion of deletedRecords || []) {
      changes.push({
        type: 'delete',
        entityId: deletion.entity_id,
        data: null,
        timestamp: new Date(deletion.created_at).getTime()
      })
    }

    return changes.sort((a, b) => a.timestamp - b.timestamp)
  }

  async applyDelta(changes: DeltaChange[]): Promise<void> {
    for (const change of changes) {
      switch (change.type) {
        case 'upsert':
          await this.upsertLocalRecord(change.entityId, change.data)
          break
        case 'delete':
          await this.deleteLocalRecord(change.entityId)
          break
      }
    }
  }

  private async upsertLocalRecord(entityId: string, data: any) {
    await chrome.storage.local.set({
      [`entity:${entityId}`]: {
        ...data,
        lastSyncedAt: Date.now()
      }
    })
  }

  private async deleteLocalRecord(entityId: string) {
    await chrome.storage.local.remove(`entity:${entityId}`)
  }
}
```

### 6.2 Compression và Batching
```typescript
// lib/sync/compression.ts
import pako from 'pako'

export class SyncCompression {
  compressPayload(data: any): string {
    const jsonString = JSON.stringify(data)
    const compressed = pako.deflate(jsonString, { to: 'string' })
    return btoa(compressed)
  }

  decompressPayload(compressedData: string): any {
    const compressed = atob(compressedData)
    const decompressed = pako.inflate(compressed, { to: 'string' })
    return JSON.parse(decompressed)
  }

  async batchOperations(operations: SyncOperation[], maxBatchSize = 50) {
    const batches: SyncOperation[][] = []
    
    for (let i = 0; i < operations.length; i += maxBatchSize) {
      batches.push(operations.slice(i, i + maxBatchSize))
    }

    const results = []
    for (const batch of batches) {
      const batchResult = await this.processBatch(batch)
      results.push(...batchResult)
    }

    return results
  }

  private async processBatch(operations: SyncOperation[]) {
    const compressedPayload = this.compressPayload({ operations })
    
    const response = await fetch('/api/sync/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip'
      },
      body: JSON.stringify({ compressed: compressedPayload })
    })

    const compressedResponse = await response.json()
    return this.decompressPayload(compressedResponse.compressed)
  }
}
```

## Key Takeaways

### 7.1 Sync Architecture Principles
1. **Eventual Consistency**: Accept temporary inconsistencies for better UX
2. **Optimistic Updates**: Update UI immediately, handle failures gracefully
3. **Conflict Resolution**: Define clear strategies for data conflicts
4. **Offline Support**: Queue operations when offline, sync when online
5. **Real-time Updates**: Use Supabase subscriptions for live data
6. **Delta Sync**: Only sync changed data to minimize bandwidth

### 7.2 Best Practices
- ✅ **Queue operations** when offline
- ✅ **Optimistic updates** for better UX
- ✅ **Conflict resolution** strategies
- ✅ **Delta sync** for performance
- ✅ **Real-time subscriptions** for live updates
- ✅ **Retry logic** with exponential backoff
- ✅ **Data validation** on both client and server
- ✅ **Compression** for large payloads

### 7.3 Common Pitfalls
- ❌ **No offline support** - poor UX when network fails
- ❌ **Full sync every time** - performance issues
- ❌ **No conflict resolution** - data loss
- ❌ **Blocking UI** - sync operations blocking user actions
- ❌ **No retry logic** - temporary failures cause permanent data loss
- ❌ **Ignoring race conditions** - data corruption
- ❌ **No validation** - invalid data propagation