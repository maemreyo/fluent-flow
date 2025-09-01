// Scheduled cleanup tasks for maintenance
import { createSharedQuestionsService } from './services/shared-questions-service'

export async function cleanupExpiredQuestions(): Promise<{ deletedCount: number }> {
  try {
    const questionsService = createSharedQuestionsService()
    const deletedCount = await questionsService.deleteExpiredQuestionSets()
    
    console.log(`Scheduled cleanup: ${deletedCount} expired question sets deleted at ${new Date().toISOString()}`)
    
    return { deletedCount }
  } catch (error) {
    console.error('Scheduled cleanup failed:', error)
    throw error
  }
}

// Run cleanup every 6 hours
export function startCleanupSchedule() {
  const CLEANUP_INTERVAL = 6 * 60 * 60 * 1000 // 6 hours in milliseconds
  
  console.log('Starting cleanup schedule: every 6 hours')
  
  // Run immediately on startup
  cleanupExpiredQuestions()
  
  // Schedule recurring cleanup
  setInterval(async () => {
    try {
      await cleanupExpiredQuestions()
    } catch (error) {
      console.error('Scheduled cleanup error:', error)
    }
  }, CLEANUP_INTERVAL)
}