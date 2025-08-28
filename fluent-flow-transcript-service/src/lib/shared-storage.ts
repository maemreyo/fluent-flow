// In-memory storage for shared questions
// In production, this should be replaced with a database

import type { SharedQuestionSet } from '../../../lib/types/fluent-flow-types'

// Use globalThis to ensure storage persists across HMR in development
declare global {
  var __sharedQuestions: Map<string, SharedQuestionSet> | undefined
}

export const sharedQuestions = globalThis.__sharedQuestions ?? new Map<string, SharedQuestionSet>()

if (process.env.NODE_ENV === 'development') {
  globalThis.__sharedQuestions = sharedQuestions
}